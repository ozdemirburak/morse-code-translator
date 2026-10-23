import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, longText, chunkInfo, holdRenders, type MockContext } from '../render-pool/harness';

// play() that takes over a seek's resume and then fails in `await resuming` /
// `await ctx.resume()` (outside the inner try/catch): the finally clears
// pendingPlay, but shownState stays 'playing' and state stays 'paused'.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

const options = { wpm: 20 };
const text = longText(100);

type Ctx = MockContext & { resume: () => Promise<void> };

describe('regression: take-over play() whose resume() rejects', () => {
  it('does not leave getState() at "playing" with pause() a no-op', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const onpaused = vi.fn();
    const onstopped = vi.fn();
    const onstarted = vi.fn();
    const instance = morse.audio(text, { ...options, events: { onpaused, onstopped, onstarted } });
    held.byStart(starts[0])[0].release();
    await instance.play();
    const ctx = instance.context as unknown as Ctx;
    ctx.advance(1);
    // The context is suspended/interrupted under the player and the browser
    // refuses resume() (Safari: NotAllowedError; any browser: closed context).
    ctx.state = 'suspended';
    ctx.resume = () => Promise.reject(new DOMException('resume() refused', 'NotAllowedError'));

    // "Jump to a word and play": seek() and play() in one handler.
    const seeking = instance.seek(100).then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    const playing = instance.play().then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    await flush();
    for (const r of held.pending()) r.release();
    await flush();
    const sourcesBefore = ctx.sources.length;

    const afterFailure = { seek: await seeking, play: await playing, state: instance.getState() };
    instance.pause();
    const afterPause = { state: instance.getState(), onpaused: onpaused.mock.calls.length };
    await flush();

    // Nothing new plays.
    expect(ctx.sources.length).toBe(sourcesBefore);
    expect(afterFailure.play).toContain('NotAllowedError');
    expect(afterFailure.seek).toBe('resolved');
    // Observed: afterFailure.state = 'playing'; afterPause = { state: 'playing', onpaused: 0 }.
    // Expected: not 'playing' after play() rejected (as on the render-failure path: 'stopped' + onstopped),
    // and a pause() that settles the state.
    expect({
      afterFailure: afterFailure.state,
      afterPause: afterPause.state,
      onstopped: onstopped.mock.calls.length,
    }).toEqual({ afterFailure: 'stopped', afterPause: 'stopped', onstopped: 1 });
  });

  it('control: the seek()-only resume with the same rejection settles to stopped', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const onstopped = vi.fn();
    const instance = morse.audio(text, { ...options, events: { onstopped } });
    held.byStart(starts[0])[0].release();
    await instance.play();
    const ctx = instance.context as unknown as Ctx;
    ctx.advance(1);
    ctx.state = 'suspended';
    ctx.resume = () => Promise.reject(new DOMException('resume() refused', 'NotAllowedError'));
    const seeking = instance.seek(100).then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    await flush();
    for (const r of held.pending()) r.release();
    await flush();
    expect(await seeking).toContain('NotAllowedError');
    expect({ state: instance.getState(), onstopped: onstopped.mock.calls.length }).toEqual({ state: 'stopped', onstopped: 1 });
  });
});
