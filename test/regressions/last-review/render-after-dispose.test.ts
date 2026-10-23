import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders } from '../render-pool/harness';

// whenReady() is now called after the renders resolve, also for a play() that
// was superseded/disposed meanwhile. If the eager first-chunk render had
// failed (ready === null), that call queues a new chunk-0 render with an
// always-true `wanted`, so it starts AFTER dispose().
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

const options = { wpm: 20 };
const text = longText(100);

describe('regression: render started after dispose()', () => {
  it('a disposed instance starts no new render', async () => {
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const onready = vi.fn();
    const instance = morse.audio(text, { ...options, events: { onready } });
    held.byStart(starts[0])[0].fail(new Error('render failed')); // eager render fails (transient)
    await flush();
    await instance.seek(100); // position only (not playing)
    const playing = instance.play().catch(() => {});
    await flush();
    const target = starts.filter((s) => s <= 100 * SR).at(-1) as number;
    const inFlight = held.byStart(target)[0];
    instance.dispose(); // e.g. the component unmounts during the render
    const rendersAtDispose = held.renders.length;
    inFlight.release(); // the in-flight render completes after dispose
    await flush();
    const startedAfterDispose = held.renders.slice(rendersAtDispose).map((r) => r.start);
    for (const r of held.pending()) r.release(); // let the disposed play() finish
    await flush();
    await playing;
    // Observed: startedAfterDispose = [0] (a new OfflineAudioContext render of chunk 0).
    // Expected: [] (nothing renders for a disposed instance).
    expect({ startedAfterDispose, onready: onready.mock.calls.length }).toEqual({ startedAfterDispose: [], onready: 0 });
  });
});
