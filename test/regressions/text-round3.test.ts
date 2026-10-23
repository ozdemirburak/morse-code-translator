import { describe, it, expect, vi } from 'vitest';
import morse from '../../src/index';

// encode/normalize regressions from the third review round.
describe('regression: Intl.Segmenter is optional', () => {
  it('loads and works in an engine without Intl.Segmenter (Firefox < 125)', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
    vi.resetModules();
    Reflect.deleteProperty(Intl, 'Segmenter');
    try {
      const fresh = (await import('../../src/index')).default;
      expect(fresh.decode('... --- ...')).toBe('SOS');
      expect(fresh.encode('SOS')).toBe('... --- ...');
      // Without clusters every code point counts, but invisible ones still vanish.
      expect(fresh.encode('A❤\uFE0FB')).toBe('.- # -...');
    } finally {
      if (descriptor) Object.defineProperty(Intl, 'Segmenter', descriptor);
      vi.resetModules();
    }
  });
});

describe('regression: invisible means Default_Ignorable_Code_Point', () => {
  it('keeps a marker for visible format characters', () => {
    expect(morse.encode('\u06DD')).toBe('#'); // ARABIC END OF AYAH
    expect(morse.encode('\u06001')).toBe('# .----'); // ARABIC NUMBER SIGN
  });

  it('ignores invisible characters outside \\p{Cf}', () => {
    expect(morse.encode('A\u034FB')).toBe('.- -...'); // COMBINING GRAPHEME JOINER
    expect(morse.encode('\u3164', { priority: 11 })).toBe(''); // HANGUL FILLER
    expect(morse.encode('A\u180BB')).toBe('.- -...'); // MONGOLIAN FREE VARIATION SELECTOR ONE
  });

  it('does not turn a BOM inside the text into a word gap', () => {
    expect(morse.encode('SO\uFEFFS')).toBe('... --- ...');
  });
});

describe('regression: more script variants', () => {
  it('folds full-width ASCII but keeps the full-width parentheses keys', () => {
    expect(morse.encode('ＳＯＳ　１２３', { priority: 10 })).toBe(morse.encode('SOS 123', { priority: 10 }));
    expect(morse.encode('（）', { priority: 10 })).toBe('-.--.- .-..-.');
  });

  it('sends Thai digits as digits and NIKHAHIT + SARA AA as SARA AM', () => {
    expect(morse.encode('๒๕๖๙', { priority: 12 })).toBe(morse.encode('2569', { priority: 12 }));
    expect(morse.encode('น้ํา', { priority: 12 })).toBe(morse.encode('น้ำ', { priority: 12 }));
  });

  it('sends Arabic and Hebrew punctuation as the standard punctuation', () => {
    expect(morse.encode('؟،؛', { priority: 8 })).toBe(morse.encode('?,;'));
    expect(morse.encode('־', { priority: 7 })).toBe(morse.encode('-'));
  });

  it('drops a leftover hamza/madda mark, but not the letters NFC builds from them', () => {
    // Persian ezafe (heh + hamza above) and a mark that composes with nothing.
    expect(morse.encode('خانهٔ', { priority: 9 })).toBe(morse.encode('خانه', { priority: 9 }));
    expect(morse.encode('كٔ', { priority: 8 })).toBe('-.-');
    // Alef with hamza is its own letter (precomposed by NFC); it has no code.
    expect(morse.encode('أ', { priority: 8 })).toBe('#');
  });
});
