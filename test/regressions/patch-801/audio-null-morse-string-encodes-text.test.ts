import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';

// 7.x encoded the text when morseString was null; 8.0.0 threw
// "morseString must be a string." for null.
describe('regression: audio(text, opts, null)', () => {
  it('encodes the text for a null morse string', () => {
    // Observed: TypeError 'morse-code-translator: morseString must be a string.'
    // Expected: the same audio as audio('SOS').
    expect(morse.audio('SOS', {}, null).getTotalTime()).toBe(morse.audio('SOS').getTotalTime());
    expect(morse.audio('SOS', {}, null).getTotalTime()).toBeGreaterThan(0);
  });

  it("keeps '' as silence and rejects a non-string", () => {
    expect(morse.audio('SOS', {}, '').getTotalTime()).toBe(0);
    expect(() => morse.audio('SOS', {}, 42 as unknown as string)).toThrow(TypeError);
  });
});
