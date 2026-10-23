import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders, type MockContext } from '../render-pool/harness';

// From 'paused': play(); seek(t) and the resume's render fails (first try and
// retry). play()'s catch restores the announced 'paused', then seek()'s catch
// sees state === 'paused' and calls stop(): onstopped, position reset to 0.
// The other call order (seek(t); play()) keeps 'paused' at t.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

const options = { wpm: 20 };
const text = longText(100);

const run = async (order: 'play-seek' | 'seek-play') => {
  const { starts, byLength } = chunkInfo(text, options);
  const held = holdRenders(byLength);
  const onstopped = vi.fn();
  const onpaused = vi.fn();
  const instance = morse.audio(text, { ...options, events: { onstopped, onpaused } });
  try {
    held.byStart(starts[0])[0].release();
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    ctx.advance(10);
    instance.pause();
    await flush();
    const outcome = (p: Promise<void>) =>
      p.then(
        () => 'resolved',
        (e: unknown) => `rejected: ${String(e)}`
      );
    let a: Promise<string>;
    let b: Promise<string>;
    if (order === 'play-seek') {
      a = outcome(instance.play());
      b = outcome(instance.seek(100));
    } else {
      b = outcome(instance.seek(100));
      a = outcome(instance.play());
    }
    await flush();
    const target = starts.filter((s) => s <= 100 * SR).at(-1) as number;
    held.byStart(target)[0].fail(new Error('render failed')); // first try
    await flush();
    held.byStart(target)[0].fail(new Error('render failed')); // the retry
    await flush();
    for (const r of held.pending()) r.release();
    await flush();
    await a;
    await b;
    return {
      state: instance.getState(),
      time: instance.getCurrentTime(),
      onstopped: onstopped.mock.calls.length,
    };
  } finally {
    held.restore();
    instance.dispose();
  }
};

describe('regression: a failed resume from the announced "paused" state', () => {
  it('ends the same way for play(); seek(t) as for seek(t); play()', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const seekThenPlay = await run('seek-play');
    const playThenSeek = await run('play-seek');
    // seekThenPlay = { state: 'paused', time: 100, onstopped: 0 }.
    // Observed playThenSeek = { state: 'stopped', time: 0, onstopped: 1 }.
    // Expected (play()'s catch: "otherwise the announced state stays"): the same as seekThenPlay.
    expect(seekThenPlay).toEqual({ state: 'paused', time: 100, onstopped: 0 });
    expect(playThenSeek).toEqual(seekThenPlay);
  });
});
