import { describe, it, expect, expectTypeOf } from 'vitest';
import morse, { type MorseOptions, type AudioResult, type Oscillator } from '../src/index';
import getOptions from '../src/options';

describe('numeric options', () => {
  it('accepts an integer string priority like a number', () => {
    expect(morse.decode('... .- --.', { priority: '6' as unknown as number })).toBe('ΣΑΓ');
    expect(getOptions({ priority: '12' as unknown as number }).priority).toBe(12);
  });

  it.each(['13', '6.5', ' 6', '', '0x6'])('falls back to priority 1 for %j', (priority) => {
    expect(getOptions({ priority: priority as unknown as number }).priority).toBe(1);
  });

  it('clamps volume to the documented 0-100 range', () => {
    expect(getOptions({ volume: 500 }).volume).toBe(100);
    expect(getOptions({ volume: -50 }).volume).toBe(0);
    expect(getOptions({ volume: 0 }).volume).toBe(0);
    expect(getOptions({ volume: 42 }).volume).toBe(42);
  });

  it('treats a frequency at or above the 22050 Hz Nyquist limit as invalid', () => {
    expect(getOptions({ oscillator: { frequency: 30000 } }).oscillator.frequency).toBe(500);
    expect(getOptions({ oscillator: { frequency: 22050 } }).oscillator.frequency).toBe(500);
    expect(getOptions({ oscillator: { frequency: 22049.5 } }).oscillator.frequency).toBe(22049.5);
  });
});

describe('symbol validation', () => {
  it.each(['x', 'ガ', '\u0301'])('keeps separator %j out of text normalization', (separator) => {
    const encoded = morse.encode('hi there', { separator });
    expect(encoded).toBe(['....', '..', '/', '-', '....', '.', '.-.', '.'].join(separator));
    expect(morse.decode(encoded, { separator })).toBe('HI THERE');
  });

  it.each([
    [{ invalid: '/' }],
    [{ invalid: ' ' }],
    [{ space: '#' }],
    [{ invalid: 'a|b', separator: '|' }],
  ])('rejects an invalid marker that collides with space/separator: %j', (opts) => {
    expect(() => morse.encode('A€B', opts)).toThrow(/"invalid"/);
  });

  it.each([
    [{ dot: '.', dash: '..' }],
    [{ dot: '--', dash: '-' }],
  ])('rejects dot/dash where one is a prefix of the other: %j', (opts) => {
    expect(() => morse.encode('TEST', opts)).toThrow(/prefix/);
  });

  it('still accepts distinct non-prefix multi-character symbols', () => {
    expect(morse.encode('TEST', { dot: 'di', dash: 'dah' })).toBe('dah di dididi dah');
  });
});

describe('input types', () => {
  it.each([null, 123, ['A'], undefined])('throws a TypeError for non-string text %j', (text) => {
    expect(() => morse.encode(text as unknown as string)).toThrow(TypeError);
    expect(() => morse.encode(text as unknown as string)).toThrow(/text must be a string/);
    expect(() => morse.decode(text as unknown as string)).toThrow(/morse must be a string/);
  });

  it.each(['dot', 'dash', 'space', 'separator', 'invalid'])('throws a TypeError for a non-string %s', (name) => {
    expect(() => morse.encode('E', { [name]: 5 } as MorseOptions)).toThrow(TypeError);
    expect(() => morse.encode('E', { [name]: 5 } as MorseOptions)).toThrow(new RegExp(`"${name}" must be a string`));
  });

  it('treats null options as no options', () => {
    expect(morse.encode('A', null as unknown as MorseOptions)).toBe('.-');
    expect(morse.decode('.-', null as unknown as MorseOptions)).toBe('A');
  });

  it('does not mutate the caller options', () => {
    const opts = { volume: 500, oscillator: { frequency: 30000 }, events: {} };
    const snapshot = JSON.stringify(opts);
    getOptions(opts);
    expect(JSON.stringify(opts)).toBe(snapshot);
  });
});

describe('public types', () => {
  it('lets users type a partial config as MorseOptions', () => {
    expectTypeOf<{}>().toMatchTypeOf<MorseOptions>();
    expectTypeOf<{ oscillator: { frequency: number } }>().toMatchTypeOf<MorseOptions>();
  });

  it('excludes the unsupported custom oscillator type', () => {
    expectTypeOf<'custom'>().not.toMatchTypeOf<NonNullable<Oscillator['type']>>();
    expectTypeOf<'square'>().toMatchTypeOf<NonNullable<Oscillator['type']>>();
  });

  it('marks AudioResult members readonly', () => {
    expectTypeOf<AudioResult>().toEqualTypeOf<Readonly<AudioResult>>();
  });
});
