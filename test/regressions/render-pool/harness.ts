import { vi } from 'vitest';
import morse from '../../../src/index';
import getOptions from '../../../src/options';
import { getToneSchedule, getChunkStarts } from '../../../src/audio';

// Review-3 harness: every render is held until the test settles it, so the
// order of render completions is fully deterministic (no wall clock).
export const SR = 44100;

export type MockGain = {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    cancelScheduledValues: ReturnType<typeof vi.fn>;
    value: number;
  };
  connect: ReturnType<typeof vi.fn>;
};
export type MockSource = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  buffer: { duration: number; length: number } | null;
  endsAt: number | null;
};
export type MockContext = {
  currentTime: number;
  state: string;
  sources: MockSource[];
  advance: (s: number) => void;
  close: () => Promise<void>;
};

type GainCalls = { gain: { setValueAtTime: { mock: { calls: number[][] } }; linearRampToValueAtTime: { mock: { calls: number[][] } } } };
type Self = { length: number; createGain: () => GainCalls };
type Proto = { startRendering: (this: Self) => Promise<unknown> };
const proto = () => (window as unknown as { OfflineAudioContext: { prototype: Proto } }).OfflineAudioContext.prototype;

export type HeldRender = {
  length: number;
  start: number; // chunk start frame (from the length map), -1 if unknown
  settled: boolean;
  release: () => void;
  fail: (err?: unknown) => void;
};

export const flush = async (n = 10) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

// Pseudo-random words (fixed seed), so chunk lengths differ and identify chunks.
export const longText = (words: number) => {
  let seed = 7;
  const next = () => ((seed = (Math.imul(seed, 1103515245) + 12345) | 0) >>> 0) / 2 ** 32;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: words }, () =>
    Array.from({ length: 2 + Math.floor(next() * 5) }, () => letters[Math.floor(next() * 26)]).join('')
  ).join(' ');
};

// Chunk starts of a text, and a signature per chunk (length and the relative
// times of its first gain events) that identifies which chunk a render is.
const EVENTS = 40;
export type ChunkMap = { identify: (length: number, events: number[]) => number };
export const chunkInfo = (text: string, options: object) => {
  const o = getOptions(options);
  const { tones, totalTime } = getToneSchedule(morse.encode(text, options), o);
  const totalFrames = Math.max(1, Math.ceil(totalTime * SR));
  const starts = getChunkStarts(tones, totalFrames, SR, undefined, o.oscillator.frequency);
  const signatures = starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : totalFrames;
    const offset = start / SR;
    const events: number[] = [];
    for (let t = 0; t < tones.length && events.length < EVENTS; t += 2) {
      const ramp = Math.min(0.005, tones[t + 1] / 4);
      for (const time of [tones[t], tones[t] + ramp, tones[t] + tones[t + 1] - ramp, tones[t] + tones[t + 1]]) {
        if (time > offset) events.push(time - offset);
      }
    }
    return { start, length: Math.max(1, end - start), events: events.sort((x, y) => x - y).slice(0, EVENTS) };
  });
  const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
  const byLength: ChunkMap = {
    identify: (length, events) => {
      const sorted = [...events].sort((x, y) => x - y).slice(0, EVENTS);
      const hits = signatures.filter((s) => s.length === length && same(s.events, sorted));
      return hits.length === 1 ? hits[0].start : -1;
    },
  };
  return { starts, totalFrames, totalTime, byLength };
};

// Holds every render. Returns the list of renders and a restore function.
export const holdRenders = (byLength?: ChunkMap) => {
  const target = proto();
  const original = target.startRendering;
  const renders: HeldRender[] = [];
  target.startRendering = function (this: Self) {
    const self = this;
    const { gain } = self.createGain();
    const times = [...gain.setValueAtTime.mock.calls.slice(1), ...gain.linearRampToValueAtTime.mock.calls].map((c) => c[1]);

    return new Promise((resolve, reject) => {
      const render: HeldRender = {
        length: self.length,
        start: byLength ? byLength.identify(self.length, times) : -1,
        settled: false,
        release: () => {
          render.settled = true;
          original.call(self).then(resolve, reject);
        },
        fail: (err = new Error('render failed')) => {
          render.settled = true;
          reject(err);
        },
      };
      renders.push(render);
    });
  };
  return {
    renders,
    pending: () => renders.filter((r) => !r.settled),
    byStart: (start: number) => renders.filter((r) => r.start === start && !r.settled),
    restore: () => {
      target.startRendering = original;
    },
  };
};
