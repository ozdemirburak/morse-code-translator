import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, holdRenders } from '../render-pool/harness';

// play() right after audio() waits on the eager first-chunk render. If that
// render fails once, load() retries it and playback starts, but whenReady()
// already rejected: onready does not fire before onstarted. It fires later, on
// the next play()/getWaveBlob(), i.e. after onstarted (or never).
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: onready when the first render fails once', () => {
  it('fires onready once, before onstarted', async () => {
    const held = holdRenders();
    cleanup = held.restore;
    const seen: string[] = [];
    const instance = morse.audio('SOS', {
      events: {
        onready: () => seen.push('ready'),
        onstarted: () => seen.push('started'),
        onpaused: () => seen.push('paused'),
      },
    });
    const playing = instance.play(); // the usual morse.audio(text).play()
    await flush();
    held.pending()[0].fail(new Error('transient')); // the eager chunk-0 render
    await flush();
    held.pending()[0].release(); // play()'s retry of chunk 0 succeeds
    await playing;
    const atStart = [...seen];
    instance.pause();
    await instance.play();
    // Observed: atStart = ['started'];
    // seen = ['started', 'paused', 'ready', 'started'] (onready after onstarted).
    // Expected: chunk 0 did render, so onready fires before the first onstarted.
    expect({ atStart, seen }).toEqual({
      atStart: ['ready', 'started'],
      seen: ['ready', 'started', 'paused', 'started'],
    });
  });
});
