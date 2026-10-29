import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, longText, chunkInfo, holdRenders } from '../render-pool/harness';

// dispose() during an export made getWaveBlob() reject with the internal
// 'render cancelled' error (the next export render was cancelled), not with
// 'Audio buffer not available' like getWaveBlob() after dispose().
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: dispose() during a WAV export', () => {
  it("rejects with 'Audio buffer not available'", async () => {
    const options = { wpm: 20 };
    const text = longText(100);
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, options);
    held.byStart(starts[0])[0].release();
    await flush();
    const exported = instance.getWaveBlob().then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    await flush();
    instance.dispose(); // e.g. the component unmounts during the export
    for (let i = 0; i < starts.length && held.pending().length > 0; i++) {
      for (const r of held.pending()) r.release();
      await flush();
    }
    // Observed: 'rejected: Error: morse-code-translator: render cancelled.'
    // Expected: the documented error for a disposed instance.
    expect(await exported).toBe('rejected: Error: Audio buffer not available');
  });
});
