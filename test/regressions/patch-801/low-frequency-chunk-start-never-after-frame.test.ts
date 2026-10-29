import { describe, it, expect } from 'vitest';
import getOptions from '../../../src/options';
import { createChunkPlan, getChunkStarts, CHUNK_SECONDS } from '../../../src/audio';

// When one oscillator period outlasted a chunk (0.01 Hz: 100 s), several chunk
// targets rounded to the same zero-phase split point, and startFor() could
// return a chunk that starts after the frame: play()/seek(70) then played the
// audio from 100 s.
const SR = 44100;

describe('regression: chunk plan for a very low frequency', () => {
  it('never starts the chunk for a frame after that frame', () => {
    const tones = Float64Array.from([0, 300]); // one 300 s tone, no gaps
    const plan = createChunkPlan(tones, 300 * SR, SR, 0.01);
    const wrong: number[] = [];
    for (let t = 0; t < 300; t++) {
      const start = plan.startFor(t * SR);
      if (start > t * SR || plan.next(start) <= t * SR) wrong.push(t);
    }
    // Observed: startFor(70 s) = 100 s (and more). Expected: no wrong seconds.
    expect(wrong).toEqual([]);
    const starts = getChunkStarts(tones, 300 * SR, SR, undefined, 0.01);
    expect(starts.every((start, i) => i === 0 || start > starts[i - 1])).toBe(true);
  });

  it('accepts frequencies from 1 Hz only', () => {
    expect(getOptions({ oscillator: { frequency: 0.01 } }).oscillator.frequency).toBe(500);
    expect(getOptions({ oscillator: { frequency: 0.5 } }).oscillator.frequency).toBe(500);
    expect(getOptions({ oscillator: { frequency: 1 } }).oscillator.frequency).toBe(1);
  });

  it('keeps chunks at most two chunk lengths long at 1 Hz', () => {
    const totalFrames = 600 * SR;
    const starts = getChunkStarts(Float64Array.from([0, 600]), totalFrames, SR, undefined, 1);
    const lengths = starts.map((start, i) => (i + 1 < starts.length ? starts[i + 1] : totalFrames) - start);
    expect(lengths.every((length) => length > 0 && length <= 2 * CHUNK_SECONDS * SR)).toBe(true);
  });
});
