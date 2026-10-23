// Public API contract: README examples, mutability, and tests that kill
// hand-made mutants (IDs from the 2026-10-23 review) the older suites missed.
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as morse from '../src/index';
import { firstRender, rampTargets } from './helpers';

const U = 0.08; // default unit

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('README examples', () => {
  it('basic usage', () => {
    expect(morse.encode('SOS')).toBe('... --- ...');
    expect(morse.decode('... --- ...')).toBe('SOS');
  });
  it('localization examples', () => {
    expect(morse.encode('Ленинград', { priority: 5 })).toBe('.-.. . -. .. -. --. .-. .- -..');
    expect(morse.decode('... .- --. .- .--. .--', { priority: 6 })).toBe('ΣΑΓΑΠΩ');
    expect(morse.decode('.. ––– . –––', { dash: '–', dot: '.', priority: 7 })).toBe('יהוה');
    expect(morse.encode('NEWS', { priority: 10, dash: '－', dot: '・', separator: '　' })).toBe('－・　・　・－－　・・・');
    const c = morse.characters({ dash: '–', dot: '•' });
    expect(c['1']['A']).toBe('•–');
    expect(c['11']['ㄱ']).toBe('•–••');
    expect(morse.encode('البراق')).toBe('.- .-.. -... .-. .- --.-');
  });
  it('characters(), custom morse audio and option examples', () => {
    expect(morse.characters()['12']['ก']).toBe('--.');
    expect(morse.characters({ priority: 5 }, true)['0']['Д']).toBe('-..');
    expect(morse.characters()['0']).toBeUndefined();
    expect(morse.audio('', {}, '... --- ...').getTotalTime()).toBeCloseTo(morse.audio('SOS').getTotalTime(), 10);
    expect(morse.encode('きゃ', { priority: 10 })).toBe(morse.encode('キヤ', { priority: 10 }));
    expect(morse.encode('ή', { priority: 6 })).toBe(morse.encode('Η', { priority: 6 }));
  });
  it('wpm overrides unit/fwUnit as documented', () => {
    const withUnits = morse.audio('البراق', { wpm: 18, unit: 0.1, fwUnit: 0.1 }).getTotalTime();
    expect(withUnits).toBeCloseTo(morse.audio('البراق', { wpm: 18 }).getTotalTime(), 10);
  });
});

describe('mutability', () => {
  it('characters() returns a fresh copy; mutating it does not corrupt later calls', () => {
    const c = morse.characters();
    c['1']['A'] = 'XXX';
    delete c['2'];
    expect(morse.characters()['1']['A']).toBe('.-');
    expect(morse.encode('A1')).toBe('.- .----');
  });
  it('options objects passed by the caller are not mutated', () => {
    const opts = { oscillator: { type: 'square' as const }, events: {} as Record<string, unknown> };
    morse.audio('A', opts);
    morse.encode('A', opts);
    expect(opts.events).toEqual({});
    expect(opts.oscillator).toEqual({ type: 'square' });
  });
});

describe('timing (absolute, not relative to another call)', () => {
  it('M5: word gap is 7 units', () => {
    // "E E" = dot(1) + word gap(7) + dot(1) = 9 units
    expect(morse.audio('E E').getTotalTime()).toBeCloseTo(9 * U, 10);
  });
  it('M6/M10: fwUnit stretches only the inter-character and word gaps; defaults to unit', () => {
    // "EE": dot(1u) + inter-char gap(3fw) + dot(1u)
    expect(morse.audio('EE', { unit: 0.1, fwUnit: 0.3 }).getTotalTime()).toBeCloseTo(0.2 + 0.9, 10);
    expect(morse.audio('EE', { unit: 0.1 }).getTotalTime()).toBeCloseTo(0.5, 10);
  });
  it('M7: PARIS - 20 wpm gives a 60ms unit', () => {
    expect(morse.audio('E', { wpm: 20 }).getTotalTime()).toBeCloseTo(0.06, 10);
  });
});

describe('oscillator / volume options reach the audio graph', () => {
  it('M3: frequency is applied', () => {
    expect(firstRender(() => morse.audio('E', { oscillator: { frequency: 750 } })).oscillator.frequency.value).toBe(750);
  });
  it('M4: type is applied', () => {
    expect(firstRender(() => morse.audio('E', { oscillator: { type: 'square' } })).oscillator.type).toBe('square');
  });
  it('M18: default volume is 100 (gain 1)', () => {
    expect(Math.max(...rampTargets(() => morse.audio('E')))).toBe(1);
  });
  it('volume 50 gives gain 0.5', () => {
    expect(Math.max(...rampTargets(() => morse.audio('E', { volume: 50 })))).toBe(0.5);
  });
});

describe('events', () => {
  it('M11: onseeked receives the clamped time', async () => {
    const onseeked = vi.fn();
    const a = morse.audio('E', { events: { onseeked } });
    await a.seek(999);
    expect(onseeked).toHaveBeenCalledWith(a.getTotalTime());
  });
  it('M13/M23: onended fires on natural end and the position resets to 0', async () => {
    const onended = vi.fn();
    const a = morse.audio('E', { events: { onended } });
    await a.seek(0.04);
    await a.play();
    (a.context as unknown as { advance: (s: number) => void }).advance(1);
    await Promise.resolve();
    expect(onended).toHaveBeenCalledTimes(1);
    expect(onended).toHaveBeenCalledWith();
    expect(a.getCurrentTime()).toBe(0);
  });
});

describe('playback position (needs a clock that advances)', () => {
  it('M12/M22: getCurrentTime tracks the context clock and pause() keeps the position', async () => {
    const a = morse.audio('SOS');
    await a.play();
    const ctx = a.context as unknown as { currentTime: number };
    ctx.currentTime += 0.5; // the shared mock clock never advances on its own
    expect(a.getCurrentTime()).toBeCloseTo(0.5, 10);
    a.pause();
    ctx.currentTime += 0.3;
    expect(a.getCurrentTime()).toBeCloseTo(0.5, 10);
    a.dispose();
  });
});

describe('WAV output (needs non-silent rendered samples)', () => {
  it('M8/M9: header sample rate and PCM samples are encoded', async () => {
    const Original = window.OfflineAudioContext;
    const data = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]);
    class LoudOffline extends (Original as unknown as new (...a: number[]) => object) {
      startRendering() {
        return Promise.resolve({ length: data.length, duration: data.length / 44100, getChannelData: () => data });
      }
    }
    (window as unknown as { OfflineAudioContext: unknown }).OfflineAudioContext = LoudOffline;
    try {
      const view = new DataView(await (await morse.audio('E').getWaveBlob()).arrayBuffer());
      expect(view.getUint32(24, true)).toBe(44100);
      // Out-of-range floats clip to full scale.
      expect([0, 1, 2, 3, 4, 5, 6].map((i) => view.getInt16(44 + i * 2, true))).toEqual([0, 16383, -16384, 32767, -32768, 32767, -32768]);
    } finally {
      (window as unknown as { OfflineAudioContext: unknown }).OfflineAudioContext = Original;
    }
  });
});

describe('fixed API defects', () => {
  it('clamps volume before it reaches the gain node', () => {
    expect(Math.max(...rampTargets(() => morse.audio('E', { volume: 500 })))).toBe(1);
    expect(Math.max(...rampTargets(() => morse.audio('E', { volume: -50 })))).toBe(0);
  });

  it('fails with a library error for non-string symbols', () => {
    expect(() => morse.encode('E', { dot: 5 as unknown as string })).toThrow(/morse-code-translator/);
  });
});
