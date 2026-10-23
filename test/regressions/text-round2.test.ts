import { describe, it, expect, expectTypeOf } from 'vitest';
import morse, { type MorseOptions } from '../../src/index';
import getOptions from '../../src/options';

// encode/decode/options regressions from the second review round.
describe('regression: word gaps', () => {
  it('keeps one word gap around a dropped unknown word', () => {
    expect(morse.encode('I ❤ YOU', { invalid: '' })).toBe('.. / -.-- --- ..-');
    expect(morse.decode(morse.encode('PRICE 5 % OFF', { invalid: '' }))).toBe('PRICE 5 OFF');
  });

  it('turns a run of whitespace and separator characters into one gap', () => {
    expect(morse.encode('A | B', { separator: '|', invalid: '' })).toBe('.-|/|-...');
    expect(morse.encode('A | B', { separator: '|' })).toBe('.-|/|-...');
    expect(morse.encode('|A|', { separator: '|' })).toBe('.-');
  });
});

describe('regression: invalid marker', () => {
  it.each(['\t', ' ', '　', '﻿', '. -'])('rejects a marker with whitespace: %j', (invalid) => {
    expect(() => getOptions({ invalid, separator: '|' })).toThrow(/"invalid" must not contain whitespace/);
  });

  it('allows "0" and "1" in space and invalid (no internal sentinels any more)', () => {
    expect(morse.decode(morse.encode('A B', { space: '0' }), { space: '0' })).toBe('A B');
    expect(morse.encode('A€B', { invalid: '<0>' })).toBe('.- <0> -...');
    expect(morse.decode('.- <0> -...', { invalid: '<0>' })).toBe('A<0>B');
  });

  it('gives one marker per unknown visible character, and none for invisible ones', () => {
    expect(morse.encode('A❤️B')).toBe('.- # -...'); // emoji + variation selector
    expect(morse.encode('👨‍👩‍👧')).toBe('#'); // ZWJ sequence
    expect(morse.encode('🇹🇷')).toBe('#'); // flag (two regional indicators)
    expect(morse.encode('A‏B')).toBe('.- -...'); // right-to-left mark
    expect(morse.encode('SO­S')).toBe('... --- ...'); // soft hyphen
  });

  it('still uses an invisible character as the separator when asked to', () => {
    expect(morse.encode('A B', { separator: '​' })).toBe('.-​/​-...');
  });
});

describe('regression: script folding', () => {
  it('sends a voiced mark that does not combine as the standalone mark', () => {
    expect(morse.encode('ﾞ', { priority: 10 })).toBe(morse.encode('゛', { priority: 10 }));
    expect(morse.encode('ｱﾞ', { priority: 10 })).toBe(morse.encode('ア゛', { priority: 10 }));
    expect(morse.encode('ア゙', { priority: 10 })).toBe(morse.encode('ア゛', { priority: 10 }));
    // After a Latin letter the combining mark stays unknown.
    expect(morse.encode('A゙')).toBe('.- #');
  });

  it('ignores Persian ZWNJ, Hebrew points and Arabic vowel marks', () => {
    expect(morse.encode('می‌خواهم', { priority: 9 })).toBe(morse.encode('میخواهم', { priority: 9 }));
    expect(morse.encode('שָׁלוֹם', { priority: 7 })).toBe(morse.encode('שלום', { priority: 7 }));
    expect(morse.encode('كَتَبَ', { priority: 8 })).toBe(morse.encode('كتب', { priority: 8 }));
    expect(morse.encode('كـتب', { priority: 8 })).toBe(morse.encode('كتب', { priority: 8 }));
  });

  it('sends Arabic-Indic and Persian digits as digits', () => {
    expect(morse.encode('٠١٢٣٤٥٦٧٨٩')).toBe(morse.encode('0123456789'));
    expect(morse.encode('۰۱۲۳۴۵۶۷۸۹')).toBe(morse.encode('0123456789'));
  });
});

describe('regression: API details', () => {
  it('names the morse argument in the decode() error', () => {
    expect(() => morse.decode(5 as unknown as string)).toThrow(/morse must be a string/);
  });

  it('types priority as a number or a string such as a <select> value, like the runtime', () => {
    expectTypeOf<5>().toMatchTypeOf<MorseOptions['priority']>();
    expectTypeOf<HTMLSelectElement['value']>().toMatchTypeOf<MorseOptions['priority']>();
    expect(morse.decode('.-.-', { priority: '5' })).toBe('Я');
    // Only decimal integer strings select a set; anything else stays Latin.
    expect(morse.decode('..', { priority: '1e1' })).toBe('I');
  });
});
