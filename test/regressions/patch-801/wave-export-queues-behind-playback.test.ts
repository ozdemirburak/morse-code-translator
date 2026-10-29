import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders } from '../render-pool/harness';

// With the export keeping two renders in flight, a queued export render must
// not delay playback: playback renders queue ahead of export renders.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: render queue order during a WAV export', () => {
  it('starts a queued playback render before a queued export render', async () => {
    const options = { wpm: 20 };
    const text = longText(100);
    const { starts, byLength } = chunkInfo(text, options);
    expect(starts.length).toBeGreaterThan(6);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, options);
    held.byStart(starts[0])[0].release();
    await flush();
    await instance.seek(starts[3] / SR + 1);
    void instance.play(); // renders chunk 3 (slot 1)
    const exported = instance.getWaveBlob().catch(() => {}); // chunk 1 (slot 2); chunk 2 queued
    await flush();
    expect(held.pending().map((r) => r.start)).toEqual([starts[3], starts[1]]);
    instance.pause();
    await instance.seek(starts[6] / SR + 1);
    void instance.play(); // chunk 6 queued
    held.byStart(starts[3])[0].release(); // frees a slot
    await flush();
    // Expected: the playback render (chunk 6) takes the free slot, not export chunk 2.
    expect(held.pending().map((r) => r.start)).toEqual([starts[1], starts[6]]);
    instance.dispose();
    for (const r of held.pending()) r.release();
    await flush();
    await exported;
  });
});
