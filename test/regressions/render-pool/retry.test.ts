import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders, type MockContext } from './harness';

// README: "a chunk that fails to render is retried once before playback stops".
// Only scheduleAhead() retries, and only when its failure arrives while a chunk
// is still playing. A single transient failure elsewhere stops playback.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

const options = { wpm: 20 };
const text = longText(100);

describe('regression: render retry', () => {
  it('a seek while playing survives one failed render', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const onstopped = vi.fn();
    const instance = morse.audio(text, { ...options, events: { onstopped } });
    held.byStart(starts[0])[0].release();
    await instance.play();
    const seeking = instance.seek(100);
    let seekError: unknown = null;
    seeking.catch((e) => (seekError = e));
    await flush();
    const chunkAt100 = starts.filter((s) => s <= 100 * SR).at(-1) as number;
    held.byStart(chunkAt100)[0].fail(new Error('transient')); // the only failure
    await flush();
    for (let i = 0; i < 5; i++) {
      for (const r of held.pending()) r.release();
      await flush();
    }
    // Observed: { state: 'stopped', onstopped: 1, error: 'Error: transient' }.
    // Expected (README): the chunk is retried once and playback goes on.
    expect({ state: instance.getState(), onstopped: onstopped.mock.calls.length, error: seekError && String(seekError) }).toEqual({
      state: 'playing',
      onstopped: 0,
      error: null,
    });
  });

  it('play() within 2 s of a boundary plays when only the next chunk fails once', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, options);
    held.byStart(starts[0])[0].release();
    await flush();
    await instance.seek(starts[3] / SR - 1); // 1 s before chunk 3 (not playing)
    let playError: unknown = null;
    const playing = instance.play().catch((e) => (playError = e));
    await flush();
    held.byStart(starts[2])[0].release(); // the chunk to play renders fine
    held.byStart(starts[3])[0].fail(new Error('transient')); // the next one fails once
    await playing;
    // Observed: play() rejects and nothing plays, although chunk 2 is rendered.
    // Expected: chunk 2 plays and chunk 3 is retried, as at any other position.
    expect({ error: playError && String(playError), state: instance.getState() }).toEqual({ error: null, state: 'playing' });
  });

  it('a failure after the playing chunk ended is retried before playback stops', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const onstopped = vi.fn();
    const instance = morse.audio(text, { ...options, events: { onstopped } });
    held.byStart(starts[0])[0].release();
    await instance.play(); // chunk 1 render is requested (held: a slow render)
    const ctx = instance.context as unknown as MockContext;
    ctx.advance(starts[1] / SR + 0.5); // chunk 0 has ended; chunk 1 is late
    await flush();
    expect(instance.getState()).toBe('playing');
    held.byStart(starts[1])[0].fail(new Error('transient')); // the first failure
    await flush();
    for (const r of held.pending()) r.release();
    await flush();
    // Observed: { state: 'stopped', onstopped: 1 } after the first failure.
    // Expected (README): one retry before playback stops.
    expect({ state: instance.getState(), onstopped: onstopped.mock.calls.length }).toEqual({ state: 'playing', onstopped: 0 });
  });
});
