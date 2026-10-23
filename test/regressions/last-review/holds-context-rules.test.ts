import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, holdRenders } from '../render-pool/harness';

type Ctor = new () => object;
const win = window as unknown as { AudioContext: Ctor };
const Original = win.AudioContext;
let created = 0;
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  win.AudioContext = Original;
  vi.restoreAllMocks();
});
const countContexts = () => {
  created = 0;
  win.AudioContext = class extends (Original as Ctor) {
    constructor() {
      super();
      created++;
    }
  } as Ctor;
};

describe('regression: live context rules', () => {
  it('a disposed instance never creates a context (play/seek/pause/stop/getCurrentTime/context/getWaveBlob)', async () => {
    countContexts();
    const instance = morse.audio('SOS');
    await flush();
    instance.dispose();
    await instance.play();
    await instance.seek(0.3);
    instance.pause();
    instance.stop();
    instance.getCurrentTime();
    void instance.context;
    const wave = await instance.getWaveBlob().then(() => 'resolved', (e: unknown) => String(e));
    expect({ created, wave, state: instance.getState() }).toEqual({ created: 0, wave: 'Error: Audio buffer not available', state: 'disposed' });
  });

  it('play() from inside onstopped during dispose() creates nothing and starts nothing', async () => {
    countContexts();
    const onstarted = vi.fn();
    const held = holdRenders();
    cleanup = held.restore;
    let instance: ReturnType<typeof morse.audio>;
    let inner: Promise<void> | null = null;
    instance = morse.audio('PARIS PARIS', { events: { onstarted, onstopped: () => { inner = instance.play(); } } });
    const outer = instance.play().catch(() => {});
    instance.dispose();
    for (const r of held.pending()) r.release();
    await flush();
    await outer;
    await inner;
    expect({ created, onstarted: onstarted.mock.calls.length, state: instance.getState() }).toEqual({ created: 1, onstarted: 0, state: 'disposed' });
  });

  it('concurrent play() calls (also while suspended) start once, one context', async () => {
    countContexts();
    const onstarted = vi.fn();
    const held = holdRenders();
    cleanup = held.restore;
    const instance = morse.audio('SOS', { events: { onstarted } });
    const a = instance.play();
    const ctx = instance.context as unknown as { state: string };
    ctx.state = 'suspended';
    const b = instance.play();
    const c = instance.play();
    for (const r of held.pending()) r.release();
    await Promise.all([a, b, c]);
    await flush();
    expect({ created, onstarted: onstarted.mock.calls.length, state: instance.getState(), ctx: ctx.state }).toEqual({
      created: 1,
      onstarted: 1,
      state: 'playing',
      ctx: 'running',
    });
    instance.dispose();
  });

  it("an 'interrupted' context is resumed by play()", async () => {
    const instance = morse.audio('SOS');
    await flush();
    await instance.play();
    instance.pause();
    const ctx = instance.context as unknown as { state: string };
    ctx.state = 'interrupted';
    await instance.play();
    expect({ state: instance.getState(), ctx: ctx.state }).toEqual({ state: 'playing', ctx: 'running' });
    instance.dispose();
  });
});
