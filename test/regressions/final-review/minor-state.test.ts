import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, longText, chunkInfo, holdRenders } from '../render-pool/harness';

let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: minor state leftovers', () => {
  // resumingSeek covers only seek() while 'playing'. seek() while a play()
  // from 'ready'/'stopped' is still rendering sets state = 'paused' with no
  // onpaused, so getState() says 'paused' until the render is done.
  it('play(); seek() does not report "paused" without onpaused', async () => {
    const held = holdRenders();
    cleanup = held.restore;
    const onpaused = vi.fn();
    const instance = morse.audio('SOS', { events: { onpaused } });
    const playing = instance.play();
    const seeking = instance.seek(0.5);
    await flush();
    const during = { state: instance.getState(), onpaused: onpaused.mock.calls.length };
    for (const r of held.pending()) r.release();
    await playing;
    await seeking;
    // Observed: during = { state: 'paused', onpaused: 0 }.
    // Expected: no 'paused' without onpaused (the state before seek() was 'ready').
    expect(during).toEqual({ state: 'ready', onpaused: 0 });
  });

  // Shared in-flight export: getWaveBlob() called AFTER dispose() returns the
  // export that is still running, and resolves if that export is on its last
  // chunk (round5 #3: getWaveBlob() after dispose() rejects).
  it('getWaveBlob() after dispose() rejects even while an export is in flight', async () => {
    const options = { wpm: 20 };
    const text = longText(30);
    const { starts, byLength } = chunkInfo(text, options);
    const last = starts[starts.length - 1];
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const instance = morse.audio(text, options);
    held.byStart(starts[0])[0].release();
    await flush();
    const first = instance.getWaveBlob().then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    await flush();
    // Release every chunk before the last one; the export then renders the last.
    for (let i = 0; i < starts.length && held.byStart(last).length === 0; i++) {
      for (const r of held.pending()) r.release();
      await flush();
    }
    expect({ last: held.byStart(last).length, all: held.pending().length }).toEqual({ last: 1, all: 1 });
    instance.dispose();
    const late = instance.getWaveBlob().then(
      () => 'resolved',
      (e: unknown) => `rejected: ${String(e)}`
    );
    held.byStart(last)[0].release();
    await flush();
    // Observed: late = 'resolved' (a Blob from a disposed instance).
    // Expected: 'rejected: Error: Audio buffer not available', as without an export in flight.
    expect({ first: await first, late: await late }).toEqual({
      first: 'resolved',
      late: 'rejected: Error: Audio buffer not available',
    });
  });
});
