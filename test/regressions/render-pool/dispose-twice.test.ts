import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import type { MockContext } from './harness';

// dispose() has no "already disposed" guard. A second dispose() inside the
// 50 ms close delay closes the context at once (fader is null by then), and
// the first dispose()'s timer then calls close() on a closed context. Per the
// Web Audio spec close() then rejects (InvalidStateError); nothing handles it.
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('regression: dispose() twice', () => {
  it('closes once, after the fade, with no unhandled rejection', async () => {
    const instance = morse.audio('PARIS');
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    ctx.advance(0.03); // mid-tone
    // Spec behaviour (Chrome: "Cannot close a context that is being closed or
    // has already been closed."): close() on a closed context rejects.
    // (A plain function, not vi.spyOn: a vitest spy attaches handlers to the
    // promises it returns, which would hide the unhandled rejection.)
    const close = { calls: 0 };
    ctx.close = function (this: MockContext) {
      close.calls++;
      if (this.state === 'closed') return Promise.reject(new DOMException('already closed', 'InvalidStateError'));
      this.state = 'closed';
      return Promise.resolve();
    };
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      instance.dispose(); // delays close() by 50 ms for the fade
      instance.dispose(); // e.g. effect cleanup + explicit cleanup
      const closedAtOnce = close.calls;
      vi.advanceTimersByTime(60);
      vi.useRealTimers();
      await new Promise((r) => setTimeout(r, 20));
      // Observed: { closedAtOnce: 1, closeCalls: 2, unhandled: 1 }.
      // Expected: the second dispose() is a no-op: one close(), after the fade.
      expect({ closedAtOnce, closeCalls: close.calls, unhandled: unhandled.mock.calls.length }).toEqual({
        closedAtOnce: 0,
        closeCalls: 1,
        unhandled: 0,
      });
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
