import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, longText, chunkInfo } from '../render-pool/harness';

// The export awaited one chunk render at a time, so the shared pool of two
// render slots was never full during an export. It now keeps two renders in
// flight, still writes the parts in order, and holds at most two rendered
// chunks at once.
type Self = { length: number; createGain: () => { gain: { setValueAtTime: { mock: { calls: number[][] } }; linearRampToValueAtTime: { mock: { calls: number[][] } } } } };
type Proto = { startRendering: (this: Self) => Promise<unknown> };
const proto = () => (window as unknown as { OfflineAudioContext: { prototype: Proto } }).OfflineAudioContext.prototype;

let restore: () => void = () => {};
afterEach(() => {
  restore();
  restore = () => {};
  vi.restoreAllMocks();
});

describe('regression: WAV export render window', () => {
  it('keeps two renders in flight and writes the chunks in order', async () => {
    const options = { wpm: 20 };
    const text = longText(100);
    const { starts, totalFrames, byLength } = chunkInfo(text, options);
    expect(starts.length).toBeGreaterThan(4);
    // Each chunk renders as a constant level that identifies it; count the
    // renders started and the buffers the export consumed.
    let started = 0;
    let consumed = 0;
    const pending: Array<{ index: number; release: () => void }> = [];
    const target = proto();
    const original = target.startRendering;
    restore = () => {
      target.startRendering = original;
    };
    target.startRendering = function (this: Self) {
      const { length } = this;
      const { gain } = this.createGain();
      const times = [...gain.setValueAtTime.mock.calls.slice(1), ...gain.linearRampToValueAtTime.mock.calls].map((c) => c[1]);
      const index = starts.indexOf(byLength.identify(length, times));
      started++;
      return new Promise((resolve) => {
        const getChannelData = () => {
          consumed++;
          return new Float32Array(length).fill((index + 1) / 100);
        };
        pending.push({ index, release: () => resolve({ length, getChannelData }) });
      });
    };

    const instance = morse.audio(text, options);
    (pending.shift() as { release: () => void }).release(); // eager chunk 0
    await flush();
    const blob = instance.getWaveBlob();
    await flush();
    // Observed: 1 export render pending. Expected: 2 (the pool size).
    expect(pending.map((p) => p.index)).toEqual([1, 2]);
    let maxHeld = 0;
    // Release the newest render first, so the export waits for the older one.
    for (let i = 0; i < 4 * starts.length && pending.length > 0; i++) {
      (pending.pop() as { release: () => void }).release();
      await flush();
      maxHeld = Math.max(maxHeld, started - consumed);
    }
    expect(maxHeld).toBeLessThanOrEqual(2);
    const samples = new Int16Array(await (await blob).arrayBuffer(), 44);
    expect(samples.length).toBe(totalFrames);
    const wrong: number[] = [];
    starts.forEach((start, i) => {
      const end = i + 1 < starts.length ? starts[i + 1] : totalFrames;
      // floatTo16BitPCM: float32 sample * 0x7fff, truncated by setInt16.
      const expected = Math.trunc(Math.fround((i + 1) / 100) * 0x7fff);
      if (!samples.subarray(start, end).every((sample) => sample === expected)) wrong.push(i);
    });
    expect(wrong).toEqual([]);
  });
});
