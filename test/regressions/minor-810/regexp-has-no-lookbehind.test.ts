import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import morse from '../../../src/index';

// 8.0.x: normalize.ts used /(?<=[kana])[marks]/g. Safari before 16.4 cannot
// compile a lookbehind, so the whole module failed to load there (a bundler
// does not rewrite regular expressions).
describe('regression: no RegExp lookbehind', () => {
  it('has no lookbehind in the source', () => {
    const directory = resolve(import.meta.dirname, '../../../src');
    const found: string[] = [];
    for (const file of readdirSync(directory)) {
      const source = readFileSync(resolve(directory, file), 'utf8');
      // Observed: ['normalize.ts']. Expected: [].
      if (source.includes('(?<=') || source.includes('(?<!')) found.push(file);
    }
    expect(found).toEqual([]);
  });

  it('gives the standalone mark after kana exactly like the lookbehind did', () => {
    // The 8.0.x rule, applied by hand before encode(): a combining mark directly
    // after a kana (not after another mark) becomes the standalone mark.
    const lookbehind = (text: string): string =>
      text.normalize('NFC').replace(/(?<=[ぁ-ゖァ-ヺー])[゙゚]/g, (mark) => (mark === '゙' ? '゛' : '゜'));
    const alphabet = ['カ', 'ン', 'か', 'ー', 'A', '゙', '゚'];
    const different: string[] = [];
    const visit = (text: string, depth: number) => {
      if (text !== '' && morse.encode(text, { priority: 10 }) !== morse.encode(lookbehind(text), { priority: 10 })) {
        different.push([...text].map((c) => c.codePointAt(0)?.toString(16)).join(' '));
      }
      if (depth < 5) for (const character of alphabet) visit(text + character, depth + 1);
    };
    visit('', 0);
    expect(different).toEqual([]);
  });

  it('keeps the results for one and for two marks after one kana', () => {
    const japanese = { priority: 10 };
    // ン has no voiced form: the first mark is sent as ゛, the second is unknown.
    expect(morse.encode('ン゙', japanese)).toBe('.-.-. ..');
    expect(morse.encode('ン゙゙', japanese)).toBe('.-.-. .. #');
    // カ + mark is ガ (NFC); the second mark follows a kana and is sent as ゛.
    expect(morse.encode('ガ゙', japanese)).toBe('.-.. .. ..');
    expect(morse.encode('パ゙', japanese)).toBe('-... ..--. ..');
    expect(morse.encode('ｶﾞ', japanese)).toBe('.-.. ..');
  });
});
