import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders } from '../render-pool/harness';

// play() always awaited whenReady() (the first-chunk render). After the eager
// chunk-0 render failed, every play() re-rendered chunk 0 in one of the two
// render slots and waited for it, even when it played from minute 10.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

const options = { wpm: 20 };
const text = longText(100);

describe('regression: play() after a failed first render', () => {
  it('starts without rendering chunk 0 and fires onready before onstarted', async () => {
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const seen: string[] = [];
    const instance = morse.audio(text, {
      ...options,
      events: { onready: () => seen.push('ready'), onstarted: () => seen.push('started') },
    });
    held.byStart(starts[0])[0].fail(new Error('render failed')); // eager render fails (transient)
    await flush();
    await instance.seek(100); // position only (not playing)
    const playing = instance.play();
    await flush();
    // The chunk at 100 s (and a prefetch, if any); never chunk 0.
    for (const r of held.pending()) if (r.start !== starts[0]) r.release();
    await flush();
    const atStart = { chunk0: held.byStart(starts[0]).length, state: instance.getState(), seen: [...seen] };
    for (const r of held.pending()) r.release(); // lets the old code finish
    await playing;
    // Observed: { chunk0: 1, state: 'ready', seen: [] } (play() waits for a new chunk-0 render).
    // Expected: playback starts at once; onready (a chunk rendered) before onstarted.
    expect(atStart).toEqual({ chunk0: 0, state: 'playing', seen: ['ready', 'started'] });
    expect(starts.some((start) => start > 0 && start <= 100 * SR)).toBe(true);
    instance.dispose();
  });
});
