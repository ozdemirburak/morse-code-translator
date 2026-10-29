import { describe, it, expect } from 'vitest';
import morse from '../src/index';
import { baseCharacters } from '../src/characters';

describe('decode tokenization', () => {
  it('reads a word-gap symbol that has no spaces around it', () => {
    expect(morse.decode('.-/-...')).toBe('A B');
    expect(morse.decode('... --- .../... --- ...')).toBe('SOS SOS');
  });

  it('ignores whitespace around and runs of a custom separator', () => {
    expect(morse.decode('.- | -...', { separator: '|' })).toBe('AB');
    expect(morse.decode('.-||-...', { separator: '|' })).toBe('AB');
    expect(morse.decode('.-|/|-...', { separator: '|' })).toBe('A B');
  });
});

describe('characters()', () => {
  it('maps the separator to the word-gap symbol in set 1, like 7.x', () => {
    expect(morse.characters()['1'][' ']).toBe('/');
    expect(morse.characters({ separator: '|', space: '_' })['1']['|']).toBe('_');
    expect(Object.keys(morse.characters()['1'])).toEqual([...Object.keys(baseCharacters['1']), ' ']);
  });
});

describe('round trip fuzz', () => {
  // Deterministic PRNG so failures reproduce.
  const random = (seed: number) => () => {
    // 32-bit LCG via Math.imul (a float64 product would lose precision and cycle early).
    seed = (Math.imul(seed, 1103515245) + 12345) | 0;
    return (seed >>> 0) / 2 ** 32;
  };

  it('decode(encode(x)) returns x for strings built from each priority set', () => {
    const next = random(42);
    for (let priority = 1; priority <= 12; priority++) {
      // Keys that share a code with an earlier key in their own set cannot round
      // trip (decode returns the first); skip them.
      const seen = new Set<string>();
      const keys = Object.entries(baseCharacters[priority]).filter(([, code]) => !seen.has(code) && seen.add(code)).map(([key]) => key);
      for (let n = 0; n < 500; n++) {
        const length = 1 + Math.floor(next() * 8);
        const text = Array.from({ length }, () => (next() < 0.15 ? ' ' : keys[Math.floor(next() * keys.length)]))
          .join('')
          .replace(/\s+/g, ' ')
          .trim();
        if (text === '') continue;
        const options = { priority };
        // NFC may reorder adjacent combining marks (Thai); the result is canonically equivalent.
        expect(morse.decode(morse.encode(text, options), options), `priority ${priority}: ${text}`).toBe(text.normalize('NFC'));
      }
    }
  });
});
