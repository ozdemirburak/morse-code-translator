import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import type { MockContext, MockGain, MockSource } from './harness';

// dispose() delays close() only when a run is still active (fader !== null).
// stop() and pause() clear fader while their 5 ms fade-out is still ramping,
// so the common cleanup "stop(); dispose();" closes the context in the middle
// of the fade, i.e. a hard cut (the click the fade exists to prevent).
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const playMidTone = async () => {
  const instance = morse.audio('PARIS');
  await instance.play();
  const ctx = instance.context as unknown as MockContext;
  ctx.advance(0.03); // inside the first dot of P (0.00 .. 0.08 s)
  const source = ctx.sources[0] as MockSource;
  const fader = source.connect.mock.calls[0][0] as MockGain;
  return { instance, ctx, fader };
};

describe('regression: dispose() after stop()/pause()', () => {
  for (const first of ['stop', 'pause'] as const) {
    it(`${first}(); dispose(); closes the context only after the stop fade`, async () => {
      const { instance, ctx, fader } = await playMidTone();
      const close = vi.spyOn(ctx, 'close');
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      instance[first]();
      // The fade-out that stop()/pause() scheduled ends 5 ms from now.
      const fadeEnd = fader.gain.linearRampToValueAtTime.mock.calls.at(-1) as number[];
      expect(fadeEnd).toEqual([0, ctx.currentTime + 0.005]);
      instance.dispose();
      // Observed: close() runs at once, at currentTime (0.03), mid-fade.
      // Expected: like dispose() while playing, close() waits for the fade.
      expect(close).not.toHaveBeenCalled();
      vi.advanceTimersByTime(60);
      expect(close).toHaveBeenCalledTimes(1);
    });
  }
});
