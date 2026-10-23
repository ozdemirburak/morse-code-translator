import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';
import { baseCharacters } from '../../../src/characters';
import { normalizeText } from '../../../src/normalize';

// Passing check (no finding): the U+0653-0655 strip changes no table key and
// only drops marks that NFC could not join into a letter.
const STRIPPED = /[ـً-ٰٟ]/u;
const NEW_RANGE = /[ٓ-ٕ]/u;

describe('regression: ARABIC_MARKS', () => {
  it('no table key contains a stripped mark, and every key normalizes to itself', () => {
    const containsMark: string[] = [];
    const changed: string[] = [];
    for (const set of Object.keys(baseCharacters)) {
      for (const key of Object.keys(baseCharacters[set])) {
        if (STRIPPED.test(key) || STRIPPED.test(key.normalize('NFD'))) containsMark.push(`${set}:${key}`);
        if ((set === '8' || set === '9') && normalizeText(key) !== key) changed.push(`${set}:${key}`);
      }
    }
    expect({ containsMark, changed }).toEqual({ containsMark: [], changed: [] });
  });

  it('only marks left over after NFC are dropped; precomposed hamza letters stay', () => {
    const samples = [
      'السلام عليكم', 'مرحبا بالعالم', 'سُؤَال', 'أنا', 'إلى', 'آمن', 'مسئول', 'شيء',
      'کتابِ من', 'خانهٔ ما', 'پاییز', 'مسئله', 'ۀ', 'یٔ', 'هٔ',
      'أ', 'آ', 'إ', 'أَ', 'ؤ', 'ئ',
    ];
    const leftovers = samples.filter((s) => NEW_RANGE.test(s.toUpperCase().normalize('NFC')));
    expect(leftovers.map((s) => [s, normalizeText(s)])).toEqual([
      ['خانهٔ ما', 'خانه ما'],
      ['یٔ', 'ی'],
      ['هٔ', 'ه'],
    ]);
    // Decomposed hamza/madda letters compose under NFC first and are kept.
    expect(['أ', 'آ', 'إ', 'أَ', 'ؤ', 'ئ'].map(normalizeText)).toEqual(['أ', 'آ', 'إ', 'أ', 'ؤ', 'ئ']);
    // Plain Arabic/Persian words encode with no invalid marker.
    expect(morse.encode('السلام عليكم', { priority: 8 })).not.toContain('#');
    expect(morse.encode('خانهٔ ما', { priority: 9 })).toBe(morse.encode('خانه ما', { priority: 9 }));
  });
});
