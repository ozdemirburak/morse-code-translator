import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { SR, flush, longText, chunkInfo, holdRenders } from './harness';

// pump() and the render's finally() call jobs.delete(job.start) without
// checking that the entry is still THIS job. When the cache evicted a queued
// chunk and a newer job for the same chunk was created, cancelling the old job
// deletes the newer job's entry; a later request for that chunk then cannot
// register its wanted() predicate, and the newer job is cancelled under a
// caller that is still current.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: render pool jobs map', () => {
  it('a current seek() never fails with "render cancelled" after scrubbing back', async () => {
    const options = { wpm: 20 };
    const text = longText(200); // about 600 s, about 20 chunks
    const { starts, byLength } = chunkInfo(text, options);
    expect(starts.length).toBeGreaterThan(12);
    const onstopped = vi.fn();
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, { ...options, events: { onstopped } });
    const mid = (k: number) => (starts[k] + starts[k + 1]) / 2 / SR;
    const errors: unknown[] = [];
    const seek = (t: number) => instance.seek(t).catch((e) => errors.push(e));

    void instance.play().catch((e) => errors.push(e)); // chunk 0 render is held (slot 1)
    void seek(mid(2)); // chunk 2 renders (slot 2)
    void seek(mid(6)); // chunk 6 queued
    void seek(mid(8)); // chunk 8 queued
    void seek(mid(9)); // chunk 9 queued
    void seek(mid(10)); // chunk 10 queued; the cache (3 entries) has dropped chunk 6
    void seek(starts[6] / SR - 1); // chunks 5 and 6 queued: a NEW job for chunk 6
    await flush();

    // Chunk 2 finishes: the old chunk-6 job is cancelled (deleting the new job's
    // jobs entry), chunks 8-10 are cancelled, chunk 5 starts; new chunk 6 waits.
    held.byStart(starts[2])[0].release();
    await flush();
    expect(held.byStart(starts[5]).length).toBe(1);

    // The user scrubs back to the same place: this seek wants chunks 5 and 6.
    const last = instance.seek(starts[6] / SR - 1.5);
    let lastError: unknown = null;
    last.catch((e) => (lastError = e));
    await flush();

    // Chunk 0 finishes: pump() checks the new chunk-6 job, whose only
    // registered predicate is from the superseded seek, and cancels it.
    held.byStart(starts[0])[0].release();
    await flush();
    for (const r of held.pending()) r.release();
    await flush();

    // Observed: the current seek rejects with CANCELLED and playback stops.
    // Expected: it resumes at the target.
    expect({
      error: lastError === null ? null : String(lastError),
      state: instance.getState(),
      onstopped: onstopped.mock.calls.length,
    }).toEqual({ error: null, state: 'playing', onstopped: 0 });
  });

  it('after stop(true), a current play() never fails with "render cancelled"', async () => {
    const options = { wpm: 20 };
    const text = longText(100);
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, options);
    const mid = (k: number) => (starts[k] + starts[k + 1]) / 2 / SR;
    const ignore = () => {};

    void instance.play().catch(ignore); // chunk 0 render held (slot 1)
    void instance.seek(mid(1)).catch(ignore); // chunk 1 renders (slot 2)
    void instance.seek(starts[3] / SR - 1).catch(ignore); // chunks 2 and 3 queued
    await flush();
    instance.stop(true); // clears the cache; the queued jobs stay in jobs/queued
    await instance.seek(starts[3] / SR - 1); // stopped: only moves the position
    void instance.play().catch(ignore); // NEW jobs for chunks 2 and 3, queued
    await flush();
    held.byStart(starts[1])[0].release(); // old 2 and 3 cancelled (deleting the new entries); new 2 starts
    await flush();
    instance.pause();
    let playError: unknown = null;
    void instance.play().catch((e) => (playError = e)); // wants 2 and 3; its wanted() for 3 is lost
    await flush();
    held.byStart(starts[0])[0].release(); // a slot frees: new chunk-3 job is cancelled
    for (let i = 0; i < 5; i++) {
      await flush();
      for (const r of held.pending()) r.release();
    }
    await flush();
    // Observed: { error: 'Error: morse-code-translator: render cancelled.', state: 'paused' }.
    expect({ error: playError && String(playError), state: instance.getState() }).toEqual({ error: null, state: 'playing' });
  });
});
