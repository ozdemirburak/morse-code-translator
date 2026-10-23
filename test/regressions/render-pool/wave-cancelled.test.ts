import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders } from './harness';

// getWaveBlob() reuses chunks.get(start) for playback renders but registers no
// wanted() predicate. If that render is still queued and playback moves on
// (seek/pause/stop), pump() cancels it and the export fails with CANCELLED.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: getWaveBlob() during playback', () => {
  it('still returns the WAV when playback seeks away from a queued chunk', async () => {
    const options = { wpm: 20 };
    const text = longText(200);
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, options);
    const mid = (k: number) => (starts[k] + starts[k + 1]) / 2 / SR;
    held.byStart(starts[0])[0].release(); // ready
    await flush();

    await instance.seek(mid(8)); // not playing: only moves the position
    void instance.play().catch(() => {}); // chunk 8 renders (slot 1)
    void instance.seek(mid(9)).catch(() => {}); // chunk 9 renders (slot 2)
    void instance.seek(mid(5)).catch(() => {}); // chunk 5 queued
    await flush();

    let exportError: unknown = null;
    let blob: Blob | null = null;
    void instance.getWaveBlob().then(
      (b) => (blob = b),
      (e) => (exportError = e)
    );
    // Let the export render chunks 0-4 itself; it then waits on queued chunk 5.
    for (let i = 0; i < 10; i++) {
      await flush();
      for (const r of held.pending()) if (r.start < starts[5]) r.release();
    }
    await flush();

    void instance.seek(mid(12)).catch(() => {}); // the user scrubs on
    await flush();
    held.byStart(starts[8])[0].release(); // a slot frees: queued chunk 5 is cancelled
    for (let i = 0; i < 20; i++) {
      await flush();
      for (const r of held.pending()) r.release();
    }
    await flush();
    // Observed: the export rejects with CANCELLED. Expected: a WAV blob.
    expect({ error: exportError === null ? null : String(exportError), gotBlob: blob !== null }).toEqual({
      error: null,
      gotBlob: true,
    });
  });
});
