import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, longText, chunkInfo, holdRenders } from '../render-pool/harness';

// The export reused a cached playback render; when that render failed (here
// the eager chunk-0 render), the export failed too instead of rendering the
// chunk itself.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: WAV export after a failed playback render', () => {
  it('renders the chunk itself and exports the whole recording', async () => {
    const options = { wpm: 20 };
    const text = longText(100);
    const { starts, totalFrames, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, options);
    const exported = instance.getWaveBlob().then(
      (blob) => blob.size,
      (e: unknown) => `rejected: ${String(e)}`
    );
    await flush();
    held.byStart(starts[0])[0].fail(new Error('render failed')); // the eager (cached) chunk-0 render
    await flush();
    for (let i = 0; i < 2 * starts.length && held.pending().length > 0; i++) {
      for (const r of held.pending()) r.release();
      await flush();
    }
    // Observed: 'rejected: Error: render failed'. Expected: a complete WAV file.
    expect(await exported).toBe(44 + totalFrames * 2);
  });
});
