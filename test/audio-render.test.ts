import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OfflineAudioContext as RealOfflineAudioContext } from 'node-web-audio-api';
import morse from '../src/index';
import getOptions from '../src/options';
import { getToneSchedule, getChunkStarts, renderFrames, CHUNK_SECONDS } from '../src/audio';

// Real DSP (node-web-audio-api, a Rust implementation of the Web Audio spec):
// these tests check the actual samples, which the mocks cannot.
const SAMPLE_RATE = 44100;
const scope = window as unknown as { OfflineAudioContext: unknown };
let mockOffline: unknown;

beforeAll(() => {
  mockOffline = scope.OfflineAudioContext;
  scope.OfflineAudioContext = RealOfflineAudioContext;
});

afterAll(() => {
  scope.OfflineAudioContext = mockOffline;
});

const renderWav = async (text: string, options = {}) => {
  const instance = morse.audio(text, options);
  const bytes = new Uint8Array(await (await instance.getWaveBlob()).arrayBuffer());
  const view = new DataView(bytes.buffer);
  const samples = new Int16Array(bytes.buffer.slice(44));
  return { instance, view, samples, bytes };
};

// The same schedule rendered in one OfflineAudioContext, as 16-bit samples.
const renderReference = async (text: string, options = {}) => {
  const o = getOptions(options);
  const { tones, totalTime } = getToneSchedule(morse.encode(text), o);
  const frames = Math.ceil(totalTime * SAMPLE_RATE);
  const buffer = await renderFrames(RealOfflineAudioContext as unknown as typeof OfflineAudioContext, tones, o, 0, frames);
  return Int16Array.from(buffer.getChannelData(0), (x) => {
    const s = Math.max(-1, Math.min(1, x));
    return s < 0 ? s * 0x8000 : s * 0x7fff;
  });
};

const maxDifference = (a: Int16Array, b: Int16Array) => {
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
  return max;
};

const maxStep = (samples: Int16Array) => {
  let max = 0;
  for (let i = 1; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i] - samples[i - 1]));
  return max;
};

// Real DSP is slow on busy CI runners: allow more than the 5 s default.
describe('rendered audio', { timeout: 60_000 }, () => {
  it('has no clicks at tone edges for a non-default speed', async () => {
    const { samples } = await renderWav('SOS', { wpm: 13 });
    // A full-scale 500 Hz sine moves at most 2*pi*500/44100*32767 ~ 2334 per sample;
    // a hard gain step jumps up to 32767.
    expect(maxStep(samples)).toBeLessThan(2600);
    // The release ramp has (almost) faded out by the last frame.
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(200);
  });

  it('writes a correct WAV header', async () => {
    const { view, bytes, instance } = await renderWav('E');
    const frames = Math.ceil(instance.getTotalTime() * SAMPLE_RATE);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(bytes.length - 8);
    expect(view.getUint32(24, true)).toBe(SAMPLE_RATE);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(frames * 2);
  });

  it('stitches multi-chunk renders seamlessly and on schedule', async () => {
    const text = Array.from({ length: 30 }, () => 'PARIS').join(' ');
    const options = { wpm: 20 };
    const { samples, instance } = await renderWav(text, options);
    const { tones, totalTime } = getToneSchedule(morse.encode(text), getOptions(options));
    expect(totalTime).toBeGreaterThan(2 * CHUNK_SECONDS);
    expect(samples.length).toBe(Math.ceil(instance.getTotalTime() * SAMPLE_RATE));

    const starts = getChunkStarts(tones, samples.length, SAMPLE_RATE);
    expect(starts.length).toBeGreaterThan(2);
    for (const frame of starts.slice(1)) {
      // The previous frame may hold the last bit of a release ramp.
      expect(Math.abs(samples[frame - 1]), `before boundary ${frame}`).toBeLessThan(200);
      expect(samples[frame], `at boundary ${frame}`).toBe(0);
    }

    // Every tone onset (first sound after a gap) lands on its scheduled frame.
    const unitFrames = (1.2 / 20) * SAMPLE_RATE;
    const onsets: number[] = [];
    let silent = Infinity;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] === 0) {
        silent++;
      } else {
        if (silent > unitFrames / 2) onsets.push(i);
        silent = 0;
      }
    }
    const expected = Array.from({ length: tones.length / 2 }, (_, i) => tones[i * 2] * SAMPLE_RATE);
    expect(onsets.length).toBe(expected.length);
    onsets.forEach((frame, i) => expect(Math.abs(frame - expected[i]), `tone ${i}`).toBeLessThanOrEqual(2));
    expect(maxStep(samples)).toBeLessThan(2600);
  });

  it('joins chunks into exactly the audio of one long render', async () => {
    const text = Array.from({ length: 30 }, () => 'PARIS').join(' ');
    for (const options of [{ wpm: 20 }, { wpm: 13, oscillator: { frequency: 523.25, type: 'square' as const } }]) {
      const { samples } = await renderWav(text, options);
      const reference = await renderReference(text, options);
      expect(samples.length).toBe(reference.length);
      // Only float rounding of the oscillator phase differs (4 LSB is about -78 dBFS).
      expect(maxDifference(samples, reference), JSON.stringify(options)).toBeLessThanOrEqual(4);
    }
  });

  it('continues a tone that is longer than a chunk across the boundary', async () => {
    // T with unit 25 s: one 75 s tone, split on oscillator zero-phase points.
    const options = { unit: 25 };
    const { samples } = await renderWav('T', options);
    const reference = await renderReference('T', options);
    expect(samples.length).toBe(75 * SAMPLE_RATE);
    expect(maxDifference(samples, reference)).toBeLessThanOrEqual(4);
    expect(maxStep(samples)).toBeLessThan(2600);
  });
});
