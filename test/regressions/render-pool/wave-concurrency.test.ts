import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders } from './harness';

// README: "At most two chunks render at a time". getWaveBlob() renders outside
// the pool (renderChunk() directly), so an export during playback, or two
// exports at once, run more renders in parallel.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: render concurrency with getWaveBlob()', () => {
  it('keeps at most two renders in flight (playback near a boundary + two exports)', async () => {
    const options = { wpm: 20 };
    const text = longText(100);
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, options);
    held.byStart(starts[0])[0].release();
    await flush();
    await instance.seek(starts[3] / SR - 1);
    void instance.play(); // renders chunks 2 and 3 (pool: 2 slots)
    void instance.getWaveBlob(); // e.g. a "Download" click
    void instance.getWaveBlob(); // a double click
    await flush();
    // Observed: 4 renders in flight. Expected (README): at most 2.
    expect(held.pending().length).toBeLessThanOrEqual(2);
  });
});
