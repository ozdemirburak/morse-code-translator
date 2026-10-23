import { describe, it, expect } from 'vitest';
import morse from '../../src/index';

describe('regression: scripts coverage', () => {
  it('every Hangul syllable encodes', () => {
    const bad: string[] = [];
    for (let c = 0xac00; c <= 0xd7a3; c++) {
      const ch = String.fromCharCode(c);
      if (morse.encode(ch, { priority: 11 }).includes('#')) bad.push(ch);
    }
    expect(bad).toEqual([]);
  });
  it('kana encode', () => {
    const bad: string[] = [];
    for (let c = 0x3041; c <= 0x3096; c++) {
      const ch = String.fromCharCode(c);
      if (morse.encode(ch, { priority: 10 }).includes('#')) bad.push(ch);
    }
    for (let c = 0x30a1; c <= 0x30fa; c++) {
      const ch = String.fromCharCode(c);
      if (morse.encode(ch, { priority: 10 }).includes('#')) bad.push(ch);
    }
    expect(bad.join(' ')).toBe('');
  });
});
