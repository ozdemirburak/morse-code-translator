import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders, type MockContext, type MockSource } from './harness';

// A queued render that pump() cancels is rejected at once, but its promise
// leaves the chunk cache only one microtask later (the .catch cleanup). The
// current play() resumes inside that window and its scheduleAhead() picks up
// the cancelled promise for the next chunk.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

const setup = async () => {
  const options = { wpm: 20 };
  const text = longText(100); // about 300 s, 10 chunks
  const { starts, byLength } = chunkInfo(text, options);
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const held = holdRenders(byLength);
  cleanup = held.restore;
  const instance = morse.audio(text, options);
  held.byStart(starts[0])[0].release(); // chunk 0 (eager)
  await instance.play(); // plays chunk 0; scheduleAhead renders chunk 1 (held, slot 1)
  const ctx = instance.context as unknown as MockContext;
  // Seek to 1 s before chunk 3: chunk 2 renders (slot 2), chunk 3 is queued.
  void instance.seek(starts[3] / SR - 1);
  await flush();
  // Seek back into the middle of chunk 2: chunk 3 is not wanted any more.
  void instance.seek(starts[2] / SR + 5);
  await flush();
  // Chunk 2 finishes: its slot frees, pump() cancels the stale chunk-3 job, and
  // the current run starts chunk 2 and asks for chunk 3 in the same tick.
  held.byStart(starts[2])[0].release();
  await flush();
  return { instance, ctx, held, starts, error };
};

describe('regression: cancelled renders never reach the current run', () => {
  it('scheduleAhead() never receives a cancelled render after a seek back', async () => {
    const { instance, held, starts, error } = await setup();
    expect(instance.getState()).toBe('playing');
    const cancelledLogged = error.mock.calls.filter((c) => String(c[0]).includes('render cancelled')).length;
    // Observed: { cancelledLogged: 1, chunk3Rendering: 0 }.
    // Expected: no error, and chunk 3 renders while chunk 2 plays.
    expect({ cancelledLogged, chunk3Rendering: held.byStart(starts[3]).length }).toEqual({
      cancelledLogged: 0,
      chunk3Rendering: 1,
    });
  });

  it('chunk 3 renders while chunk 2 plays, so it starts on time', async () => {
    const { ctx, held, starts } = await setup();
    const chunk2 = ctx.sources[ctx.sources.length - 1] as MockSource;
    const [when2, offset2] = chunk2.start.mock.calls[0];
    const end2 = when2 + (chunk2.buffer as { duration: number }).duration - offset2;
    for (const r of held.pending()) r.release(); // every render that was asked for so far
    await flush();
    ctx.advance(end2 - ctx.currentTime); // chunk 2 ends; its onended asks for chunk 3
    await flush();
    const renderTime = 0.1; // any render takes some time
    ctx.advance(renderTime);
    for (const r of held.byStart(starts[3])) r.release();
    await flush();
    const chunk3 = ctx.sources[ctx.sources.indexOf(chunk2) + 1];
    const [when3, offset3] = chunk3.start.mock.calls[0];
    // Observed: { when: end2 + 0.1, offset: 0.1 } (a gap, then a fade-in mid-chunk).
    // Expected: back to back: { when: end2, offset: 0 }.
    expect({ when: when3, offset: offset3 }).toEqual({ when: end2, offset: 0 });
  });
});
