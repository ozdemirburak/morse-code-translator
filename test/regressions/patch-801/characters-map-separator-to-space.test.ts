import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';
import { baseCharacters } from '../../../src/characters';

// 7.x characters() mapped the separator to the word-gap symbol in set '1'; 8.0.0
// dropped that entry, so an encoder built from characters() lost word gaps.
describe('regression: characters() separator entry', () => {
  it("maps the separator to space in set '1' only", () => {
    // Observed: undefined. Expected: '/' (the 7.x entry).
    expect(morse.characters()['1'][' ']).toBe('/');
    expect(morse.characters({ separator: '|', space: '_' })['1']['|']).toBe('_');
    expect(Object.keys(morse.characters()['1'])).toEqual([...Object.keys(baseCharacters['1']), ' ']);
    expect(morse.characters({}, true)['0'][' ']).toBeUndefined();
  });

  it('returns a fresh copy and leaves encode()/decode() unchanged', () => {
    morse.characters()['1'][' '] = 'changed';
    expect(morse.characters()['1'][' ']).toBe('/');
    expect(morse.encode('A B')).toBe('.- / -...');
    expect(morse.decode('.- / -...')).toBe('A B');
  });
});
