import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, holdRenders } from '../render-pool/harness';

// play() now calls ctx.resume() at once and awaits the promise only after the
// renders. A play() that is superseded (or whose render fails) during the
// renders returns without ever attaching a handler to that promise. If it
// rejects (Chromium rejects pending resume() promises with InvalidStateError
// when the context is closed), the rejection is unhandled inside the library.
type Ctor = new () => object;
const win = window as unknown as { AudioContext: Ctor };
const Original = win.AudioContext;

// A context that starts suspended (no user activation yet): resume() stays
// pending, and close() rejects the pending resume() promises.
class SuspendedContext extends (Original as Ctor) {
  pending: Array<(err: unknown) => void> = [];
  constructor() {
    super();
    (this as unknown as { state: string }).state = 'suspended';
  }
  resume(): Promise<void> {
    return new Promise((_resolve, reject) => this.pending.push(reject));
  }
  close(): Promise<void> {
    (this as unknown as { state: string }).state = 'closed';
    for (const reject of this.pending.splice(0)) reject(new DOMException('AudioContext closed before a pending resume() could complete.', 'InvalidStateError'));
    return Promise.resolve();
  }
}

let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  win.AudioContext = Original;
  vi.restoreAllMocks();
});

const captureUnhandled = () => {
  const seen: string[] = [];
  const previous = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  const listener = (reason: unknown) => seen.push(String(reason));
  process.on('unhandledRejection', listener);
  return {
    seen,
    restore: () => {
      process.removeListener('unhandledRejection', listener);
      for (const l of previous) process.on('unhandledRejection', l as (...args: unknown[]) => void);
    },
  };
};

describe('regression: the early resume() promise of play()', () => {
  it('is never left unhandled when play() is superseded during its render', async () => {
    win.AudioContext = SuspendedContext as Ctor;
    const held = holdRenders();
    const unhandled = captureUnhandled();
    cleanup = () => {
      held.restore();
      unhandled.restore();
    };
    const instance = morse.audio('SOS');
    const playing = instance.play(); // no user activation: resume() stays pending
    const outcome = playing.then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    instance.stop(); // e.g. the UI resets before the first render is ready
    for (const r of held.pending()) r.release();
    await flush();
    instance.dispose(); // closes the context -> pending resume() rejects
    await flush();
    // Observed: unhandled = ['InvalidStateError: AudioContext closed before a pending resume() could complete.'].
    // Expected: the library handles the rejection of its own resume() promise.
    expect({ play: await outcome, unhandled: unhandled.seen }).toEqual({ play: 'resolved', unhandled: [] });
  });

  it('is never left unhandled when play() fails to render', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    win.AudioContext = SuspendedContext as Ctor;
    const held = holdRenders();
    const unhandled = captureUnhandled();
    cleanup = () => {
      held.restore();
      unhandled.restore();
    };
    const instance = morse.audio('SOS');
    const outcome = instance.play().then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    for (let i = 0; i < 3; i++) {
      for (const r of held.pending()) r.fail(new Error('render failed'));
      await flush();
    }
    expect(await outcome).toBe('rejected: Error: render failed');
    instance.dispose();
    await flush();
    // Observed: the resume() rejection is unhandled. Expected: none.
    expect(unhandled.seen).toEqual([]);
  });
});
