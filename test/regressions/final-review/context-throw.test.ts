import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush } from '../render-pool/harness';

// play() now calls getContext() BEFORE its try/finally. When the AudioContext
// constructor throws (browsers cap the number of live contexts), play() rejects
// but pendingPlay stays true, so the instance acts as if a play() were pending.
type Ctor = new () => object;
const win = window as unknown as { AudioContext: Ctor };
const Original = win.AudioContext;
afterEach(() => {
  win.AudioContext = Original;
  vi.restoreAllMocks();
});

describe('regression: AudioContext constructor throws in play()', () => {
  it('leaves no phantom pending play behind', async () => {
    let failures = 1;
    win.AudioContext = class extends (Original as Ctor) {
      constructor() {
        if (failures-- > 0) {
          throw new Error('NotSupportedError: too many AudioContexts');
        }
        super();
      }
    } as Ctor;
    const onpaused = vi.fn();
    const onstopped = vi.fn();
    const onstarted = vi.fn();
    const instance = morse.audio('SOS', { events: { onpaused, onstopped, onstarted } });
    await flush();

    const error = await instance.play().then(
      () => null,
      (e: unknown) => String(e)
    );
    expect(error).toContain('too many AudioContexts');
    expect(instance.getState()).toBe('ready');

    // A plain seek() (e.g. the user drags the slider; nothing is playing).
    await instance.seek(0.5);
    await flush();
    const afterSeek = { state: instance.getState(), onstarted: onstarted.mock.calls.length };

    // Observed: afterSeek = { state: 'playing', onstarted: 1 } (seek() resumes a
    // play() that already failed). Expected: seek() while not playing only moves
    // the position: { state: 'ready', onstarted: 0 }.
    expect(afterSeek).toEqual({ state: 'ready', onstarted: 0 });
  });

  it('pause()/stop() after the failed play() fire no events', async () => {
    win.AudioContext = class extends (Original as Ctor) {
      constructor(fail = true) {
        if (fail) throw new Error('NotSupportedError: too many AudioContexts');
        super();
      }
    } as Ctor;
    const onpaused = vi.fn();
    const onstopped = vi.fn();
    const instance = morse.audio('SOS', { events: { onpaused, onstopped } });
    await flush();
    await instance.play().catch(() => {});
    instance.pause();
    const afterPause = { state: instance.getState(), onpaused: onpaused.mock.calls.length };
    instance.stop();
    // Observed: { afterPause: { state: 'paused', onpaused: 1 }, onstopped: 1 }.
    // Expected: nothing was playing, so no onpaused/onstopped and no 'paused'.
    expect({ afterPause, onstopped: onstopped.mock.calls.length }).toEqual({
      afterPause: { state: 'ready', onpaused: 0 },
      onstopped: 0,
    });
  });
});
