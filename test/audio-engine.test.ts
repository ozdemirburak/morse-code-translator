import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../src/index';
import getOptions from '../src/options';
import { getToneSchedule, getChunkStarts } from '../src/audio';

// Shape of the clock-driven mock in test/setup.ts.
type MockSource = { start: ReturnType<typeof vi.fn>; buffer: { duration: number } | null };
type MockContext = {
  currentTime: number;
  sources: MockSource[];
  advance: (seconds: number) => void;
  suspend: () => Promise<void>;
  resume: () => Promise<void>;
};

const SAMPLE_RATE = 44100;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const longText = (words: number) => Array.from({ length: words }, () => 'PARIS').join(' ');

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('tone schedule', () => {
  const units = (text: string, morseString?: string) => {
    const o = getOptions({ unit: 1 });
    const { tones, totalTime } = getToneSchedule(morseString ?? morse.encode(text), o);
    return { tones: Array.from(tones), totalTime };
  };

  it('uses ITU gaps: 1 intra, 3 inter-character, 7 word', () => {
    // A = .-  -> tones at 0 (1) and 2 (3); B = -... starts after a 7-unit gap
    expect(units('A B').tones.slice(0, 6)).toEqual([0, 1, 2, 3, 12, 3]);
    expect(units('AB').tones.slice(4, 6)).toEqual([8, 3]);
  });

  it('adds no silence for invalid characters', () => {
    expect(units('A~B')).toEqual(units('AB'));
    expect(units('A ~ B')).toEqual(units('A B'));
    expect(units('~A').tones[0]).toBe(0);
  });

  it('treats any whitespace in a custom morse string as a separator', () => {
    expect(units('', '.-\n-...').totalTime).toBe(17);
    expect(units('', '.-\t-...').totalTime).toBe(17);
  });

  it('puts every chunk boundary inside a gap', () => {
    const o = getOptions({ wpm: 20 });
    const { tones, totalTime } = getToneSchedule(morse.encode(longText(60)), o);
    const totalFrames = Math.ceil(totalTime * SAMPLE_RATE);
    const starts = getChunkStarts(tones, totalFrames, SAMPLE_RATE, 10 * SAMPLE_RATE);
    expect(starts.length).toBeGreaterThan(3);
    for (const frame of starts.slice(1)) {
      const time = frame / SAMPLE_RATE;
      for (let i = 0; i < tones.length; i += 2) {
        const inside = time > tones[i] && time < tones[i] + tones[i + 1];
        expect(inside, `boundary ${frame} inside tone at ${tones[i]}`).toBe(false);
      }
    }
  });
});

describe('audio() input', () => {
  it('honors an explicit empty morse string', () => {
    expect(morse.audio('SOS', {}, '').getTotalTime()).toBe(0);
  });

  it('renders long texts in full (no 1-hour cap)', () => {
    const text = longText(2000); // ~ 10k characters
    const instance = morse.audio(text);
    const expected = getToneSchedule(morse.encode(text), getOptions()).totalTime;
    expect(expected).toBeGreaterThan(3600);
    expect(instance.getTotalTime()).toBe(expected);
  });

  it('throws a clear error when Web Audio is missing', () => {
    // Like Node or SSR: no window and no Web Audio globals.
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('OfflineAudioContext', undefined);
    vi.stubGlobal('window', undefined);
    expect(() => morse.audio('E')).toThrow(/Web Audio API is not supported/);
  });
});

describe('playback', () => {
  it('ends on the audio clock, not on wall-clock timers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
    const onended = vi.fn();
    const instance = morse.audio('SOS', { events: { onended } });
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    await ctx.suspend();
    vi.advanceTimersByTime(60_000);
    ctx.advance(60);
    await Promise.resolve();
    expect(onended).not.toHaveBeenCalled();
    expect(instance.getState()).toBe('playing');

    await ctx.resume();
    ctx.advance(instance.getTotalTime());
    await Promise.resolve();
    expect(onended).toHaveBeenCalledTimes(1);
    expect(instance.getState()).toBe('stopped');
  });

  it('schedules chunks back to back and ends after the last one', async () => {
    const onended = vi.fn();
    const instance = morse.audio(longText(30), { wpm: 20, events: { onended } }); // > 60 s => several 30 s chunks
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    let played = 0;
    while (instance.getState() === 'playing' && played < 10_000) {
      ctx.advance(1);
      played++;
      await flush();
    }
    expect(onended).toHaveBeenCalledTimes(1);
    expect(ctx.sources.length).toBeGreaterThan(2);
    // Each chunk starts exactly where the previous one ends.
    for (let i = 1; i < ctx.sources.length; i++) {
      const [previousWhen] = ctx.sources[i - 1].start.mock.calls[0];
      const [when] = ctx.sources[i].start.mock.calls[0];
      expect(when).toBeCloseTo(previousWhen + (ctx.sources[i - 1].buffer as { duration: number }).duration, 9);
    }
    const scheduled = ctx.sources.reduce((sum, s) => sum + (s.buffer as { duration: number }).duration, 0);
    expect(scheduled).toBeCloseTo(Math.ceil(instance.getTotalTime() * SAMPLE_RATE) / SAMPLE_RATE, 6);
  });

  it('resumes from the paused position', async () => {
    const instance = morse.audio('PARIS PARIS');
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    ctx.advance(1.25);
    instance.pause();
    expect(instance.getCurrentTime()).toBeCloseTo(1.25, 9);
    ctx.advance(5);
    await instance.play();
    const last = ctx.sources[ctx.sources.length - 1];
    expect(last.start.mock.calls[0]).toEqual([ctx.currentTime, 1.25]);
    expect(instance.getCurrentTime()).toBeCloseTo(1.25, 9);
    ctx.advance(0.5);
    expect(instance.getCurrentTime()).toBeCloseTo(1.75, 9);
  });

  it('seeks into a later chunk with the right offset', async () => {
    const instance = morse.audio(longText(30), { wpm: 20 });
    await instance.play();
    const ctx = instance.context as unknown as MockContext;
    const before = ctx.sources.length;
    await instance.seek(45);
    // The first source after the seek plays the chunk that contains 45 s.
    const [when, offset] = ctx.sources[before].start.mock.calls[0];
    expect(when).toBe(ctx.currentTime);
    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(45);
    expect(instance.getCurrentTime()).toBeCloseTo(45, 9);
  });

  it('fades the live output in on start and out on pause', async () => {
    const instance = morse.audio('PARIS');
    await instance.play();
    const ctx = instance.context as unknown as MockContext & { createGain: () => unknown };
    const source = ctx.sources[0] as MockSource & { connect: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
    const fader = source.connect.mock.calls[0][0] as { gain: Record<string, ReturnType<typeof vi.fn>> };
    expect(fader.gain.setValueAtTime.mock.calls[0]).toEqual([0, 0]);
    expect(fader.gain.linearRampToValueAtTime.mock.calls[0]).toEqual([1, 0.005]);
    ctx.advance(0.3);
    instance.pause();
    expect(fader.gain.linearRampToValueAtTime.mock.calls[1]).toEqual([0, 0.305]);
    expect(source.stop.mock.calls[0][0]).toBeCloseTo(0.305, 9);
  });

  it('fires onstopped when stopping from paused', async () => {
    const onstopped = vi.fn();
    const instance = morse.audio('SOS', { events: { onstopped } });
    await instance.play();
    instance.pause();
    instance.stop();
    expect(onstopped).toHaveBeenCalledTimes(1);
    expect(instance.getState()).toBe('stopped');
  });

  it('keeps working when an event callback throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const instance = morse.audio('E', {
      events: {
        onready: () => {
          throw new Error('boom');
        },
      },
    });
    await expect(instance.play()).resolves.toBeUndefined();
    expect(instance.getState()).toBe('playing');
    expect(error).toHaveBeenCalledTimes(1);
    await expect(instance.getWaveBlob()).resolves.toBeInstanceOf(Blob);
  });

  it('re-renders after stop(true) instead of playing silence', async () => {
    const instance = morse.audio('E');
    await instance.play();
    instance.stop(true);
    await instance.play();
    expect(instance.getState()).toBe('playing');
    const blob = await instance.getWaveBlob();
    expect(blob.size).toBe(44 + Math.ceil(instance.getTotalTime() * SAMPLE_RATE) * 2);
  });
});
