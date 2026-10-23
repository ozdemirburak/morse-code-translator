import { describe, it, expect } from 'vitest';
import morse from '../src/index';
import { baseCharacters } from '../src/characters';

const KOREAN = { priority: 11 };
const JAPANESE = { priority: 10 };

describe('script folding before lookup', () => {
  it('decomposes Hangul syllables into jamo', () => {
    expect(morse.encode('한국', KOREAN)).toBe(morse.encode('ㅎㅏㄴㄱㅜㄱ', KOREAN));
    expect(morse.encode('한국', KOREAN)).not.toContain('#');
  });

  it('splits double and compound jamo into basic jamo', () => {
    expect(morse.encode('ㄲ', KOREAN)).toBe(morse.encode('ㄱㄱ', KOREAN));
    expect(morse.encode('ㅘ', KOREAN)).toBe(morse.encode('ㅗㅏ', KOREAN));
    expect(morse.encode('ㄳ', KOREAN)).toBe(morse.encode('ㄱㅅ', KOREAN));
    // 닭 = ㄷ + ㅏ + ㄺ (final ㄹㄱ)
    expect(morse.encode('닭', KOREAN)).toBe(morse.encode('ㄷㅏㄹㄱ', KOREAN));
  });

  it('folds hiragana, small kana and half-width kana to full-size katakana', () => {
    expect(morse.encode('かな', JAPANESE)).toBe(morse.encode('カナ', JAPANESE));
    expect(morse.encode('キャッシュ', JAPANESE)).toBe(morse.encode('キヤツシユ', JAPANESE));
    expect(morse.encode('ｶﾞ', JAPANESE)).toBe(morse.encode('ガ', JAPANESE));
    expect(morse.encode('ゔ', JAPANESE)).toBe(morse.encode('ヴ', JAPANESE));
    expect(morse.encode('ヴ', JAPANESE)).toBe(morse.encode('ウ゛', JAPANESE));
  });

  it('drops Greek tonos and dialytika (not transmitted in Morse)', () => {
    expect(morse.encode('Αθήνα', { priority: 6 })).toBe(morse.encode('ΑΘΗΝΑ', { priority: 6 }));
    expect(morse.encode('ϊ', { priority: 6 })).toBe(morse.encode('Ι', { priority: 6 }));
  });

  it('maps Hebrew final forms to their base letters', () => {
    const pairs = [['ך', 'כ'], ['ם', 'מ'], ['ן', 'נ'], ['ף', 'פ'], ['ץ', 'צ']];
    for (const [final, base] of pairs) {
      expect(morse.encode(final, { priority: 7 })).toBe(morse.encode(base, { priority: 7 }));
      expect(morse.decode(morse.encode(final, { priority: 7 }), { priority: 7 })).toBe(base);
    }
    expect(morse.encode('שלום', { priority: 7 })).not.toContain('#');
  });

  it('sends Russian Ё as Е', () => {
    expect(morse.encode('Ёж', { priority: 5 })).toBe(morse.encode('ЕЖ', { priority: 5 }));
    expect(morse.decode('.', { priority: 5 })).toBe('Е');
  });

  it('encodes the standard Arabic hamza U+0621 and decodes to it', () => {
    expect(morse.encode('ء', { priority: 8 })).toBe('.');
    expect(morse.encode('ﺀ', { priority: 8 })).toBe('.');
    expect(morse.decode('.', { priority: 8 })).toBe('ء');
  });

  it('encodes the 16 Thai letters that share a code with a partner letter', () => {
    const partners: Array<[string, string]> = [
      ['ฃ', 'ข'], ['ฅ', 'ค'], ['ฆ', 'ค'], ['ศ', 'ส'], ['ษ', 'ส'], ['ฌ', 'ช'], ['ฎ', 'ด'], ['ฏ', 'ต'],
      ['ฐ', 'ถ'], ['ฑ', 'ท'], ['ฒ', 'ท'], ['ธ', 'ท'], ['ณ', 'น'], ['ภ', 'พ'], ['ฬ', 'ล'], ['ใ', 'ไ'],
    ];
    for (const [letter, partner] of partners) {
      expect(morse.encode(letter, { priority: 12 })).toBe(morse.encode(partner, { priority: 12 }));
      // Decoding keeps returning the original (first) letter of the group.
      expect(morse.decode(morse.encode(letter, { priority: 12 }), { priority: 12 })).toBe(partner);
    }
    expect(morse.encode('ประเทศไทย', { priority: 12 })).not.toContain('#');
  });

  it('decodes ..-.. as the ITU accented e (É)', () => {
    expect(morse.decode('..-..')).toBe('É');
    expect(morse.decode('..-..', { priority: 4 })).toBe('É');
    expect(morse.encode('Ę', { priority: 4 })).toBe('..-..');
  });

  it('expands capital sharp s like its lowercase form', () => {
    expect(morse.encode('ẞ')).toBe(morse.encode('ß'));
    expect(morse.encode('ẞ')).toBe('... ...');
  });
});

describe('table regression', () => {
  it('encodes every table key to its own code under its own priority', () => {
    for (const [set, table] of Object.entries(baseCharacters)) {
      for (const [key, code] of Object.entries(table)) {
        const expected = code.replace(/[01]/g, (c) => (c === '0' ? '.' : '-'));
        expect(morse.encode(key, { priority: Number(set) }), `set ${set} key ${key}`).toBe(expected);
      }
    }
  });
});
