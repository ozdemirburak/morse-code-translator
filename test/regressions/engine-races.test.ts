import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../src/index';
import getOptions from '../../src/options';
import { getToneSchedule, getChunkStarts } from '../../src/audio';

// Playback engine regressions from the second review round (mock clock).
type MockGain = { gain: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> } };
type MockSource = { start: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn>; buffer: { duration: number } | null };
type MockContext = { currentTime: number; sources: MockSource[]; advance: (s: number) => void; close: () => Promise<void> };
type Proto = { startRendering: () => Promise<unknown> };

const proto = () => (window as unknown as { OfflineAudioContext: { prototype: Proto } }).OfflineAudioContext.prototype;
const renders = () => (globalThis as unknown as { __offlineRenders: unknown[] }).__offlineRenders.length;
const flush = async (n = 5) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};
const longText = (words: number) => Array.from({ length: words }, () => 'PARIS').join(' ');

// Replaces startRendering for one test; `handle(call, render)` decides per call.
const patchRendering = (handle: (call: number, render: () => Promise<unknown>) => Promise<unknown>) => {
  const target = proto();
  const original = target.startRendering;
  let call = 0;
  target.startRendering = function (this: unknown) {
    call++;
    return handle(call, () => original.call(this));
  };
  return () => {
    target.startRendering = original;
  };
};

let restore: () => void = () => {};
afterEach(() => {
  restore();
  restore = () => {};
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('regression: pending play()', () => {
  it('dispose() during a pending play() starts no further render', async () => {
    const instance = morse.audio('SOS');
    const before = renders(); // the eager render of chunk 0 is in flight
    const pending = instance.play();
    instance.dispose();
    await pending;
    await flush();
    expect(renders() - before).toBe(0);
  });

  it('stop(true) during a pending play() really releases the rendered audio', async () => {
    const instance = morse.audio('SOS');
    const pending = instance.play();
    instance.stop(true);
    await pending;
    await flush();
    const afterStop = renders();
    await instance.getWaveBlob();
    expect(renders() - afterStop).toBe(1);
  });

  it('pause() inside onstarted leaves no pending play behind', async () => {
    const onpaused = vi.fn();
    let pauseOnStart = true;
    const instance = morse.audio('PARIS PARIS', {
      events: {
        onstarted: () => {
          if (pauseOnStart) {
            pauseOnStart = false;
            instance.pause();
          }
        },
        onpaused,
      },
    });
    await instance.play();
    expect(instance.getState()).toBe('paused');
    instance.pause(); // already paused: no-op
    expect(onpaused).toHaveBeenCalledTimes(1);
    await instance.seek(1); // seeking while paused stays paused
    expect(instance.getState()).toBe('paused');
  });
});

describe('regression: seek()', () => {
  it('a pause() inside onseeked wins and keeps the seek target', async () => {
    let pauseOnSeek = false;
    const instance = morse.audio('PARIS PARIS', { events: { onseeked: () => pauseOnSeek && instance.pause() } });
    await instance.play();
    (instance.context as unknown as MockContext).advance(0.5);
    pauseOnSeek = true;
    await instance.seek(2);
    expect(instance.getState()).toBe('paused');
    expect(instance.getCurrentTime()).toBe(2);
  });

  it('treats a non-numeric position from plain JS as 0', async () => {
    const onseeked = vi.fn();
    const instance = morse.audio('SOS', { events: { onseeked } });
    await instance.play();
    instance.pause();
    await instance.seek(undefined as unknown as number);
    expect(onseeked).toHaveBeenCalledWith(0);
    expect(instance.getCurrentTime()).toBe(0);
    await expect(instance.play()).resolves.toBeUndefined();
    expect(instance.getState()).toBe('playing');
  });

  it('reports a stop when the resume after a seek fails to render', async () => {
    const onstopped = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const instance = morse.audio(longText(30), { wpm: 20, events: { onstopped } });
    await instance.play();
    restore = patchRendering(() => Promise.reject(new Error('render failed')));
    await expect(instance.seek(80)).rejects.toThrow('render failed');
    expect(instance.getState()).toBe('stopped');
    expect(onstopped).toHaveBeenCalledTimes(1);
  });

  it('keeps at most two renders in flight while scrubbing a long text', async () => {
    const instance = morse.audio(longText(1200), { wpm: 20 }); // about 1 hour
    await instance.play();
    let inFlight = 0;
    let peak = 0;
    restore = patchRendering((_, render) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      return new Promise((r) => setTimeout(r, 50)).then(render).finally(() => inFlight--);
    });
    const seeks: Promise<void>[] = [];
    for (let i = 0; i < 40; i++) {
      seeks.push(instance.seek(i * 90));
      await new Promise((r) => setTimeout(r, 1));
    }
    await Promise.all(seeks);
    expect(peak).toBeLessThanOrEqual(2);
    expect(instance.getState()).toBe('playing');
    expect(instance.getCurrentTime()).toBe(39 * 90);
  });

  it('near a chunk boundary also waits for the next chunk, so it starts on time', async () => {
    const options = { wpm: 20 };
    const text = longText(60); // about 180 s
    const o = getOptions(options);
    const { tones, totalTime } = getToneSchedule(morse.encode(text, options), o);
    const starts = getChunkStarts(tones, Math.ceil(totalTime * 44100), 44100);
    const boundary = starts[3] / 44100; // neither neighbouring chunk is cached yet
    const instance = morse.audio(text, options);
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    const before = ctx.sources.length;
    let release: () => void = () => {};
    restore = patchRendering((call, render) => (call === 2 ? new Promise((r) => (release = () => r(render()))) : render()));
    const seeking = instance.seek(boundary - 0.05);
    await flush();
    // Playback waits for the next chunk instead of starting a chunk that ends in 50 ms.
    expect(ctx.sources.length).toBe(before);
    release();
    await seeking;
    const [first, second] = ctx.sources.slice(before);
    expect(first.start.mock.calls[0][0]).toBe(ctx.currentTime);
    expect(second.start.mock.calls[0][0]).toBeCloseTo(ctx.currentTime + 0.05, 9);
    expect(second.start.mock.calls[0][1]).toBe(0);
  });
});

describe('regression: late or failed chunk renders', () => {
  it('fades in a chunk whose render arrives late', async () => {
    let release: () => void = () => {};
    restore = patchRendering((call, render) => (call === 2 ? new Promise((r) => (release = () => r(render()))) : render()));
    const instance = morse.audio(longText(30), { wpm: 20 });
    await instance.play(); // render 1 = chunk 0 (eager), render 2 = chunk 1 (held)
    const ctx = instance.context as unknown as MockContext;
    ctx.advance(31); // chunk 0 (about 30 s) ended; chunk 1 is late
    await flush();
    expect(instance.getState()).toBe('playing');
    release();
    await flush();
    const late = ctx.sources[1];
    const [when, offset] = late.start.mock.calls[0];
    expect(when).toBe(31);
    expect(offset).toBeGreaterThan(0.9);
    const fadeIn = late.connect.mock.calls[0][0] as MockGain;
    expect(fadeIn.gain.setValueAtTime.mock.calls[0]).toEqual([0, 31]);
    expect(fadeIn.gain.linearRampToValueAtTime.mock.calls[0]).toEqual([1, 31.005]);
  });

  it('keeps playing the rendered chunk when the next render fails, then retries it', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    restore = patchRendering((call, render) => (call === 2 ? Promise.reject(new Error('transient')) : render()));
    const onended = vi.fn();
    const instance = morse.audio(longText(30), { wpm: 20, events: { onended } });
    await instance.play();
    await flush();
    expect(error).toHaveBeenCalledTimes(1);
    expect(instance.getState()).toBe('playing');
    const ctx = instance.context as unknown as MockContext;
    for (let i = 0; i < 200 && instance.getState() === 'playing'; i++) {
      ctx.advance(1);
      await flush(2);
    }
    expect(onended).toHaveBeenCalledTimes(1);
  });

  it('stops after the rendered audio when the retry fails as well', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    restore = patchRendering((call, render) => (call >= 2 ? Promise.reject(new Error('persistent')) : render()));
    const onstopped = vi.fn();
    const instance = morse.audio(longText(30), { wpm: 20, events: { onstopped } });
    await instance.play();
    await flush();
    const ctx = instance.context as unknown as MockContext;
    ctx.advance(31);
    await flush();
    expect(instance.getState()).toBe('stopped');
    expect(onstopped).toHaveBeenCalledTimes(1);
  });
});

describe('regression: dispose()', () => {
  it('closes the context only after the stop fade has played', async () => {
    const instance = morse.audio('PARIS');
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    ctx.advance(0.3);
    const close = vi.spyOn(ctx, 'close');
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    instance.dispose();
    expect(close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the context at once when the last fade has already played', async () => {
    const instance = morse.audio('PARIS');
    await instance.play();
    instance.pause();
    const ctx = instance.context as unknown as MockContext;
    ctx.advance(0.01); // the 5 ms pause fade is over
    const close = vi.spyOn(ctx, 'close');
    instance.dispose();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('waits for a pause or stop fade that is still playing', async () => {
    for (const end of ['pause', 'stop'] as const) {
      const instance = morse.audio('PARIS');
      await instance.play();
      const ctx = instance.context as unknown as MockContext;
      ctx.advance(0.03);
      const close = vi.spyOn(ctx, 'close');
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      instance[end]();
      instance.dispose();
      instance.dispose(); // a second dispose() changes nothing
      expect(close, end).not.toHaveBeenCalled();
      vi.advanceTimersByTime(60);
      expect(close, end).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    }
  });
});
