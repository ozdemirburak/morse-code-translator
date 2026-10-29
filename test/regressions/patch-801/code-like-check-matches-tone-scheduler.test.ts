import { describe, it, expect } from 'vitest';
import getOptions from '../../../src/options';
import { getToneSchedule } from '../../../src/audio';
import { scanCode } from '../../../src/tokenize';

// Option validation (isCodeLike) and the audio scheduler each had their own
// dot/dash scanner (one tried dot first and stopped at an unknown character,
// the other tried the longer symbol first and skipped it). They agreed only
// because prefix pairs are rejected first; now both use scanCode().
const random = (seed: number) => () => {
  seed = (Math.imul(seed, 1103515245) + 12345) | 0;
  return (seed >>> 0) / 2 ** 32;
};

describe('regression: one dot/dash scanner for validation and audio', () => {
  it.each([
    ['.', '-'],
    ['ab', 'c'],
    ['•', '–'],
    ['0', '1'],
  ])('dot %j, dash %j: invalid is rejected exactly when it scans as a code, and tones match the scan', (dot, dash) => {
    const next = random(801);
    const pieces = [dot, dash, ...new Set([...dot, ...dash]), 'x'];
    const mismatches: string[] = [];
    for (let i = 0; i < 500; i++) {
      const s = Array.from({ length: 1 + Math.floor(next() * 6) }, () => pieces[Math.floor(next() * pieces.length)]).join('');
      let throws = false;
      try {
        getOptions({ dot, dash, invalid: s });
      } catch {
        throws = true;
      }
      let symbols = 0;
      const complete = scanCode(s, dot, dash, () => symbols++);
      const tones = getToneSchedule(s, getOptions({ dot, dash })).tones.length / 2;
      if (throws !== complete || tones !== symbols) mismatches.push(s);
    }
    // Expected: validation, scanCode() and the tone schedule agree on every string.
    expect(mismatches).toEqual([]);
  });
});
