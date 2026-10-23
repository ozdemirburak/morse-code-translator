import { describe, it, expect, vi } from 'vitest';
import morse from '../../src/index';
import getOptions from '../../src/options';
import { getToneSchedule, createChunkPlan, getChunkStarts } from '../../src/audio';

type MockContext = { currentTime: number; sources: unknown[]; advance: (s: number) => void };
const flush = () => new Promise((r) => setTimeout(r, 0));
const longText = (words: number) => Array.from({ length: words }, () => 'PARIS').join(' ');

describe('regression: engine', () => {
  it('only prefetches one chunk ahead while playing', async () => {
    // ~10 chunks of 30 s at 20 wpm (PARIS = 3 s)
    const instance = morse.audio(longText(100), { wpm: 20 });
    expect(instance.getTotalTime()).toBeGreaterThan(290);
    await instance.play();
    for (let i = 0; i < 50; i++) await flush(); // let renders resolve, clock does NOT move
    const ctx = instance.context as unknown as MockContext;
    expect(ctx.sources.length).toBeLessThanOrEqual(2);
  });

  it('chunk plan invariants (fuzz)', () => {
    const sr = 44100;
    let rng = 12345;
    // 32-bit LCG via Math.imul (a float64 product would lose precision and cycle early).
    const rand = () => ((rng = (Math.imul(rng, 1103515245) + 12345) | 0) >>> 0) / 2 ** 32;
    for (let trial = 0; trial < 300; trial++) {
      const unit = 0.001 + rand() * (rand() < 0.2 ? 20 : 0.2);
      const freq = 50 + rand() * 3000;
      const target = Math.floor(1000 + rand() * 50000);
      const words = 1 + Math.floor(rand() * 40);
      const o = getOptions({ unit, fwUnit: unit * (0.5 + rand() * 3), oscillator: { frequency: freq } });
      const { tones, totalTime } = getToneSchedule(morse.encode(longText(words)), o);
      const total = Math.max(1, Math.ceil(totalTime * sr));
      const plan = createChunkPlan(tones, total, sr, freq, target);
      const starts = getChunkStarts(tones, total, sr, target, freq);
      const startSet = new Set(starts);
      for (let i = 1; i < starts.length; i++) {
        if (!(starts[i] > starts[i - 1]) || starts[i] - starts[i - 1] >= 2 * target) throw new Error(`bad boundary ${i}: ${starts[i-1]} -> ${starts[i]} trial ${trial} unit ${unit} f ${freq} target ${target}`);
      }
      // startFor agrees with next for sampled frames
      for (let s = 0; s < 200; s++) {
        const f = Math.floor(rand() * total);
        const st = plan.startFor(f);
        if (st > f) throw new Error('startFor > frame');
        if (!startSet.has(st)) throw new Error(`startFor(${f})=${st} not a chunk start; trial ${trial} unit ${unit} target ${target}`);
        if (!(Math.min(plan.next(st), total) > f)) throw new Error(`next(startFor(${f})) <= f`);
      }
    }
  }, 120000);
});

describe('regression: engine races', () => {
  const run = async (ctx: MockContext, instance: { getState: () => string }, maxSeconds: number) => {
    for (let i = 0; i < maxSeconds && instance.getState() === 'playing'; i++) {
      ctx.advance(1);
      await flush();
    }
  };

  it('recovers from a failed render of a later chunk and ends normally', async () => {
    const scope = window as unknown as { OfflineAudioContext: { prototype: { startRendering: () => Promise<unknown> } } };
    const proto = scope.OfflineAudioContext.prototype;
    const original = proto.startRendering;
    let calls = 0;
    proto.startRendering = function (this: unknown) {
      calls++;
      if (calls === 2) return Promise.reject(new Error('render failed'));
      return original.call(this);
    };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const onended = vi.fn();
      const onstopped = vi.fn();
      const instance = morse.audio(longText(30), { wpm: 20, events: { onended, onstopped } });
      await instance.play();
      const ctx = instance.context as unknown as MockContext;
      await run(ctx, instance, Math.ceil(instance.getTotalTime()) + 30);
      // The failed render is logged, retried when it is needed, and playback ends.
      expect(errSpy).toHaveBeenCalledTimes(1);
      expect(instance.getState()).toBe('stopped');
      expect(onended).toHaveBeenCalledTimes(1);
      expect(onstopped).not.toHaveBeenCalled();
    } finally {
      proto.startRendering = original;
      errSpy.mockRestore();
    }
  });

  it('play/pause/play synchronously ends playing exactly once', async () => {
    const onstarted = (await import('vitest')).vi.fn();
    const instance = morse.audio('SOS', { events: { onstarted } });
    const p1 = instance.play();
    instance.pause();
    const p2 = instance.play();
    await Promise.all([p1, p2]);
    await flush();
    const ctx = instance.context as unknown as MockContext;
    expect(instance.getState()).toBe('playing');
    expect(onstarted).toHaveBeenCalledTimes(1);
    expect(ctx.sources.length).toBe(1);
  });

  it('seek into the last chunk then natural end', async () => {
    const onended = vi.fn();
    const instance = morse.audio(longText(30), { wpm: 20, events: { onended } });
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    await instance.seek(instance.getTotalTime() - 2);
    expect(instance.getCurrentTime()).toBeCloseTo(instance.getTotalTime() - 2, 5);
    await run(ctx, instance, 10);
    expect(onended).toHaveBeenCalledTimes(1);
    expect(instance.getState()).toBe('stopped');
  });
});
