import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OfflineAudioContext as RealOfflineAudioContext } from 'node-web-audio-api';
import morse from '../../src/index';
import getOptions from '../../src/options';
import { getToneSchedule, renderFrames, getChunkStarts } from '../../src/audio';

const SR = 44100;
const scope = window as unknown as { OfflineAudioContext: unknown };
let mock: unknown;
beforeAll(() => { mock = scope.OfflineAudioContext; scope.OfflineAudioContext = RealOfflineAudioContext; });
afterAll(() => { scope.OfflineAudioContext = mock; });

const to16 = (x: Float32Array) => Int16Array.from(x, (v) => { const s = Math.max(-1, Math.min(1, v)); return s < 0 ? s * 0x8000 : s * 0x7fff; });

const compare = async (morseString: string, options: object) => {
  const inst = morse.audio('', options, morseString);
  const bytes = new Uint8Array(await (await inst.getWaveBlob()).arrayBuffer());
  const samples = new Int16Array(bytes.buffer.slice(44));
  const o = getOptions(options);
  const { tones, totalTime } = getToneSchedule(morseString, o);
  const frames = Math.ceil(totalTime * SR);
  const ref = to16((await renderFrames(RealOfflineAudioContext as unknown as typeof OfflineAudioContext, tones, o, 0, frames)).getChannelData(0));
  const starts = getChunkStarts(tones, frames, SR, undefined, o.oscillator.frequency);
  let max = 0, at = -1;
  for (let i = 0; i < ref.length; i++) { const d = Math.abs(ref[i] - samples[i]); if (d > max) { max = d; at = i; } }
  let step = 0; for (let i = 1; i < samples.length; i++) step = Math.max(step, Math.abs(samples[i] - samples[i - 1]));
  let refStep = 0; for (let i = 1; i < ref.length; i++) refStep = Math.max(refStep, Math.abs(ref[i] - ref[i - 1]));
  return { len: samples.length, refLen: ref.length, max, at, starts, step, refStep };
};

describe('regression: real render', () => {
  for (const [m, opts] of [
    ['-', { unit: 25, oscillator: { frequency: 440 } }],
    ['-', { unit: 25, oscillator: { frequency: 7000 } }],
    ['- -', { unit: 12, oscillator: { frequency: 50 } }],
    ['. -', { unit: 25, fwUnit: (29.998 - 25) / 3 }],
    ['. -', { unit: 25, fwUnit: (30.0001 - 25 - 0.003) / 3 }],
    ['. -', { unit: 25, fwUnit: (59.999 - 25) / 3, oscillator: { frequency: 440 } }],
  ] as Array<[string, object]>) {
    it(`matches single render: ${m} ${JSON.stringify(opts)}`, async () => {
      const r = await compare(m, opts);
      expect(r.len).toBe(r.refLen);
      expect(r.max).toBeLessThanOrEqual(4);
    }, 120000);
  }
});
