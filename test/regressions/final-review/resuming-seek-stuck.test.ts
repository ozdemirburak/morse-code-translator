import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders, type MockContext } from '../render-pool/harness';

// resumingSeek is cleared only when a play() starts, or by pause()/stop().
// If a play() that superseded the seek's resume fails, nothing clears it:
// getState() reports 'playing' while nothing plays, and pause() is a no-op.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

const options = { wpm: 20 };
const text = longText(100);

describe('regression: seek() then play() while playing, and the render fails', () => {
  it('does not report "playing" when nothing plays', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const onpaused = vi.fn();
    const onstopped = vi.fn();
    const instance = morse.audio(text, { ...options, events: { onpaused, onstopped } });
    held.byStart(starts[0])[0].release();
    await instance.play();
    const ctx = instance.context as unknown as MockContext;

    // "Jump to a word and play": seek() and play() in one handler.
    const seeking = instance.seek(100);
    const playing = instance.play().then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    await flush();
    const target = starts.filter((s) => s <= 100 * SR).at(-1) as number;
    held.byStart(target)[0].fail(new Error('render failed')); // first try
    await flush();
    held.byStart(target)[0].fail(new Error('render failed')); // the retry
    await flush();
    for (const r of held.pending()) r.release();
    await flush();
    await seeking;
    const sourcesBefore = ctx.sources.length;

    const afterFailure = { play: await playing, state: instance.getState() };
    instance.pause();
    const afterPause = { state: instance.getState(), onpaused: onpaused.mock.calls.length };
    ctx.advance(5);
    await flush();

    // Observed: afterFailure.state = 'playing', and after pause() still
    // { state: 'playing', onpaused: 0 }; no source plays (sources unchanged).
    // Expected: a state that is not 'playing' once play() rejected, and a
    // pause()/stop() that settles it.
    expect(ctx.sources.length).toBe(sourcesBefore);
    expect(afterFailure.play).toBe('rejected: Error: render failed');
    expect({ afterFailure: afterFailure.state, afterPause: afterPause.state }).toEqual({
      afterFailure: expect.not.stringMatching(/^playing$/),
      afterPause: expect.not.stringMatching(/^playing$/),
    });
  });
});
