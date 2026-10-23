import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OfflineAudioContext as RealOffline } from 'node-web-audio-api';
import morse from '../../src/index';
import getOptions from '../../src/options';
import { getToneSchedule, renderFrames, getChunkStarts, createChunkPlan, phaseDelay } from '../../src/audio';

// Chunk-boundary regressions from the second review round (real DSP).
const SR = 44100;
const scope = window as unknown as { OfflineAudioContext: unknown };
let mock: unknown;
beforeAll(() => {
  mock = scope.OfflineAudioContext;
  scope.OfflineAudioContext = RealOffline;
});
afterAll(() => {
  scope.OfflineAudioContext = mock;
});

const to16 = (x: Float32Array) =>
  Int16Array.from(x, (v) => {
    const s = Math.max(-1, Math.min(1, v));
    return s < 0 ? s * 0x8000 : s * 0x7fff;
  });

describe('regression: chunk boundaries', () => {
  it('never splits the final tone when the rest of the audio fits in the chunk', { timeout: 120_000 }, async () => {
    // 200 x "E" then "T": a 30 s grid point lands inside the final dash.
    const text = Array.from({ length: 200 }, () => 'E').join(' ') + ' T';
    const options = { unit: 0.06, fwUnit: 77.9114 / 7 / 200, oscillator: { frequency: 564.48 } };
    const o = getOptions(options);
    const m = morse.encode(text, options);
    const { tones, totalTime } = getToneSchedule(m, o);
    const frames = Math.ceil(totalTime * SR);
    const lastToneStart = Math.floor(tones[tones.length - 2] * SR);
    const starts = getChunkStarts(tones, frames, SR, undefined, 564.48);
    expect(starts.every((start) => start <= lastToneStart)).toBe(true);

    const wav = new Int16Array((await (await morse.audio('', options, m).getWaveBlob()).arrayBuffer()).slice(44));
    const reference = to16(await renderFrames(RealOffline as unknown as typeof OfflineAudioContext, tones, o, 0, frames).then((b) => b.getChannelData(0)));
    // A boundary may shift the oscillator phase by up to half a frame (about
    // 11 us, inaudible): allow that, but no dropout (the old defect was a whole
    // silent period mid-tone).
    const halfFrameError = Math.ceil((Math.PI * 564.48) / SR * 32767) + 8;
    let maxDifference = 0;
    let silentRun = 0;
    let longestSilentInTone = 0;
    for (let i = 0; i < wav.length; i++) {
      maxDifference = Math.max(maxDifference, Math.abs(wav[i] - reference[i]));
      silentRun = wav[i] === 0 && Math.abs(reference[i]) > 1000 ? silentRun + 1 : 0;
      longestSilentInTone = Math.max(longestSilentInTone, silentRun);
    }
    expect(maxDifference).toBeLessThanOrEqual(halfFrameError);
    expect(longestSilentInTone).toBeLessThan(3);
  });

  it('starts the oscillator at once on every zero-phase boundary (no float off-by-one period)', { timeout: 60_000 }, () => {
    // One 600 s tone: every boundary is a zero-phase fallback; scan 20-2000 Hz.
    const tones = Float64Array.from([0, 600]);
    const total = 600 * SR;
    const late: string[] = [];
    for (let cents = 2000; cents <= 200000; cents++) {
      const frequency = cents / 100;
      const plan = createChunkPlan(tones, total, SR, frequency);
      for (let start = plan.next(0); start < total; start = plan.next(start)) {
        // At most half a frame of phase error, never a whole period of silence.
        if (phaseDelay(start / SR, frequency, SR) * SR > 0.5 + 1e-6) late.push(`${frequency} Hz at ${start}`);
      }
    }
    expect(late).toEqual([]);
  });
});
