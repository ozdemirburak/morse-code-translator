import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, longText, type MockContext } from './harness';

// pump() increments `rendering` and then calls renderChunk() synchronously. If
// renderFrames() throws synchronously (OfflineAudioContext constructor or node
// setup), the slot is never released, the job's promise never settles, and
// scheduleAhead() leaves renderingAhead = true: playback stalls in 'playing'.
type Scope = { OfflineAudioContext: new (...args: unknown[]) => unknown };
const scope = window as unknown as Scope;
const Original = scope.OfflineAudioContext;
afterEach(() => {
  scope.OfflineAudioContext = Original;
  vi.restoreAllMocks();
});

// The n-th render context (1-based) throws in its constructor.
const throwOnConstruct = (n: number) => {
  let count = 0;
  scope.OfflineAudioContext = class extends (Original as unknown as new (...args: unknown[]) => object) {
    constructor(...args: unknown[]) {
      if (++count === n) throw new Error("Failed to construct 'OfflineAudioContext'");
      super(...args);
    }
  } as unknown as Scope['OfflineAudioContext'];
};

describe('regression: synchronous render failure', () => {
  it('a throwing render does not stall playback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    throwOnConstruct(2); // chunk 0 renders; the render of chunk 1 throws
    const onended = vi.fn();
    const onstopped = vi.fn();
    const onstarted = vi.fn();
    const instance = morse.audio(longText(100), { wpm: 20, events: { onended, onstopped, onstarted } });
    let playError: unknown = null;
    await instance.play().catch((e) => (playError = e));
    const ctx = instance.context as unknown as MockContext;
    for (let i = 0; i < 400 && instance.getState() === 'playing'; i++) {
      ctx.advance(1);
      await flush(2);
    }
    // Observed: play() rejected after state became 'playing' (no onstarted), only
    // chunk 0 was ever scheduled, and after 400 s the state is still 'playing'
    // with no onended/onstopped.
    expect({
      playError: playError === null ? null : String(playError),
      onstarted: onstarted.mock.calls.length,
      sources: ctx.sources.length,
      state: instance.getState(),
      ended: onended.mock.calls.length + onstopped.mock.calls.length,
    }).toEqual({ playError: null, onstarted: 1, sources: expect.any(Number), state: 'stopped', ended: 1 });
  });

  it('a later play() still settles after throwing renders', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // One class for the whole test (audio() captures it at creation).
    const failing = new Set([2, 3]); // render contexts 2 and 3 throw
    let count = 0;
    scope.OfflineAudioContext = class extends (Original as unknown as new (...args: unknown[]) => object) {
      constructor(...args: unknown[]) {
        if (failing.has(++count)) throw new Error("Failed to construct 'OfflineAudioContext'");
        super(...args);
      }
    } as unknown as Scope['OfflineAudioContext'];
    const instance = morse.audio(longText(100), { wpm: 20 });
    await instance.play().catch(() => {}); // context 2 (chunk 1) throws: slot 1 leaks
    instance.pause();
    await instance.seek(100);
    await instance.play().catch(() => {}); // context 3 (chunk at 100 s) throws: slot 2 leaks
    instance.pause();
    await instance.seek(200); // from here on every render context works
    expect(count).toBeGreaterThanOrEqual(3); // both failing contexts were hit
    let settled = false;
    void instance.play().then(
      () => (settled = true),
      () => (settled = true)
    );
    await flush(50);
    // Observed: play() never settles (both slots are held by renders that
    // never started). Expected: it renders the chunk and plays.
    expect({ settled, state: instance.getState() }).toEqual({ settled: true, state: 'playing' });
  });
});
