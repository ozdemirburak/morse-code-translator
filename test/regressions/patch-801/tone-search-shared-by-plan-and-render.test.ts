import { describe, it, expect } from 'vitest';
import { firstToneEndingAfter } from '../../../src/audio';

// createChunkPlan (in frames) and renderFrames (in seconds) each had their own
// "first tone ending after X" binary search; renderFrames also set its result
// inside the loop. Both now use firstToneEndingAfter().
describe('regression: one tone search for the chunk plan and the renderer', () => {
  const tones = Float64Array.from([0, 1, 2, 1, 4, 1]); // ends at 1, 3 and 5 s

  it('finds the first tone that ends after a time in seconds', () => {
    const after = (t: number) => firstToneEndingAfter(tones, (end) => end <= t);
    // Expected: a tone ending exactly at t is not "after" it; past the end, the tone count.
    expect([after(0), after(0.5), after(1), after(2.5), after(3), after(5), after(99)]).toEqual([0, 0, 1, 1, 2, 3, 3]);
    expect(firstToneEndingAfter(new Float64Array(0), () => true)).toBe(0);
  });

  it('finds the first tone that ends after a frame', () => {
    const sampleRate = 10;
    const after = (frame: number) => firstToneEndingAfter(tones, (end) => Math.ceil(end * sampleRate) <= frame);
    expect([after(0), after(9), after(10), after(29), after(30), after(50)]).toEqual([0, 0, 1, 1, 2, 3]);
  });
});
