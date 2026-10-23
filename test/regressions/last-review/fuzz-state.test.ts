import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, longText, chunkInfo, holdRenders, type MockContext } from '../render-pool/harness';

// Seeded random sequences of play/pause/seek/stop/stop(true)/dispose, render
// release/failure, clock advance, and API calls from inside event callbacks.
// At quiescence (all renders settled, promises settled):
//  - getState() === 'playing'  <=> a source is really playing
//  - pause() from 'playing' fires onpaused and gives 'paused'
//  - the last state event agrees with getState()
const options = { wpm: 20 };
const text = longText(60);

let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

type Src = { endsAt: number | null; ended?: boolean };

const runSeed = async (seed: number, rejectResume: boolean) => {
  let s = seed;
  const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) | 0) >>> 0) / 2 ** 32;
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const { byLength, totalTime } = chunkInfo(text, options);
  const held = holdRenders(byLength);
  const log: string[] = [];
  const lastEvent: { name: string | null } = { name: null };
  let instance: ReturnType<typeof morse.audio>;
  const callbackOps: Record<string, (() => void) | null> = {};
  const swallow = (p: unknown) => {
    if (p && typeof (p as Promise<void>).then === 'function') (p as Promise<void>).catch(() => {});
  };
  const ev = (name: string) => () => {
    lastEvent.name = name;
    log.push(`ev:${name}:${instance.getState()}`);
    const op = callbackOps[name];
    if (op) {
      callbackOps[name] = null;
      op();
    }
  };
  instance = morse.audio(text, {
    ...options,
    events: {
      onready: ev('ready'),
      onstarted: ev('started'),
      onpaused: ev('paused'),
      onstopped: ev('stopped'),
      onended: ev('ended'),
      onseeked: ev('seeked'),
    },
  });
  let disposed = false;
  const ops: Array<[string, () => void]> = [
    ['play', () => swallow(instance.play())],
    ['pause', () => instance.pause()],
    ['seek', () => swallow(instance.seek(Math.floor(rnd() * totalTime)))],
    ['stop', () => instance.stop()],
    ['stopTrue', () => instance.stop(true)],
    ['release', () => { const p = held.pending(); if (p.length) pick(p).release(); }],
    ['fail', () => { const p = held.pending(); if (p.length) pick(p).fail(new Error('render failed')); }],
    ['advance', () => { const c = (instance as unknown as { context: MockContext | null }).context; c?.advance?.(rnd() * 40); }],
    ['flush', () => {}],
    ['cb', () => {
      const evName = pick(['seeked', 'started', 'stopped', 'paused', 'ready']);
      const opName = pick(['play', 'pause', 'seek', 'stop']);
      callbackOps[evName] = () => {
        log.push(`cbop:${evName}->${opName}`);
        if (opName === 'play') swallow(instance.play());
        else if (opName === 'pause') instance.pause();
        else if (opName === 'seek') swallow(instance.seek(Math.floor(rnd() * totalTime)));
        else instance.stop();
      };
    }],
    ['suspend', () => {
      if (!rejectResume) return;
      const c = (instance as unknown as { context: (MockContext & { resume: () => Promise<void> }) | null }).context;
      if (c) {
        c.state = 'suspended';
        c.resume = () => Promise.reject(new DOMException('refused', 'NotAllowedError'));
      }
    }],
    ['unsuspend', () => {
      const c = (instance as unknown as { context: (MockContext & { resume: () => Promise<void> }) | null }).context;
      if (c) {
        c.state = 'running';
        c.resume = async () => { c.state = 'running'; };
      }
    }],
  ];
  try {
    for (let step = 0; step < 40; step++) {
      const pool = rejectResume ? ops.filter((o) => ['play', 'seek', 'suspend', 'release', 'fail', 'pause', 'flush'].includes(o[0])) : ops;
      const [name, op] = pick(pool);
      log.push(name);
      op();
      if (rnd() < 0.6) await flush(2);
    }
    // Quiesce: no callback ops, context running, release everything.
    for (const k of Object.keys(callbackOps)) callbackOps[k] = null;
    (ops.find((o) => o[0] === 'unsuspend') as [string, () => void])[1]();
    for (let i = 0; i < 30; i++) {
      for (const r of held.pending()) r.release();
      await flush(3);
    }
    const ctx = (instance as unknown as { context: MockContext | null }).context;
    const now = ctx ? ctx.currentTime : 0;
    const live = ctx ? (ctx.sources as unknown as Src[]).filter((x) => !x.ended && x.endsAt !== null && x.endsAt > now + 1e-9).length : 0;
    const state = instance.getState();
    const problems: string[] = [];
    if (state === 'playing' && live === 0) problems.push('playing-without-sources');
    if (state !== 'playing' && live > 0) problems.push(`sources-while-${state}`);
    const expectedByEvent: Record<string, string[]> = {
      started: ['playing'],
      paused: ['paused'],
      stopped: ['stopped'],
      ended: ['stopped'],
    };
    const lastStateEvent = [...log].reverse().find((l) => /^ev:(started|paused|stopped|ended):/.test(l));
    const name = lastStateEvent ? lastStateEvent.split(':')[1] : null;
    // stop() from 'ready'/'stopped' changes state silently, so 'stopped' may follow any event.
    if (name && state !== 'stopped' && !expectedByEvent[name].includes(state)) problems.push(`state-${state}-after-${name}`);
    if (!name && state !== 'ready' && state !== 'stopped') problems.push(`state-${state}-without-event`);
    if (state === 'playing') {
      let paused = 0;
      const before = log.length;
      instance.pause();
      paused = log.slice(before).filter((l) => l.startsWith('ev:paused')).length;
      if (paused !== 1 || instance.getState() !== 'paused') problems.push('pause-noop');
    }
    return { problems, log };
  } finally {
    held.restore();
    if (!disposed) instance.dispose();
    disposed = true;
  }
};

// FUZZ_SEEDS raises the number of seeds (default 25, so CI stays fast).
const seeds = (extra: number[] = []) => [...Array.from({ length: Number(process.env.FUZZ_SEEDS ?? 25) }, (_, i) => i + 1), ...extra];

describe('regression: seeded state fuzz', () => {
  it('render failures and callbacks (resume never rejects)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const unhandled: string[] = [];
    const onUnhandled = (r: unknown) => unhandled.push(String(r));
    process.on('unhandledRejection', onUnhandled);
    const bad: Array<{ seed: number; problems: string[]; log: string }> = [];
    try {
      for (const seed of seeds()) {
        const { problems, log } = await runSeed(seed, false);
        if (problems.length) bad.push({ seed, problems, log: log.join(' ') });
      }
      await flush(5);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    expect({ bad: bad.slice(0, 3), count: bad.length, unhandled }).toEqual({ bad: [], count: 0, unhandled: [] });
  }, 120000);

  // Seeds 269 and 366 once reached the stuck state of takeover-resume-reject.test.ts.
  it('with resume() rejections', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad: Array<{ seed: number; problems: string[]; log: string }> = [];
    for (const seed of seeds([269, 366])) {
      const { problems, log } = await runSeed(seed, true);
      if (problems.length) bad.push({ seed, problems, log: log.join(' ') });
    }
    const kinds = [...new Set(bad.flatMap((b) => b.problems))];
    expect({ kinds, count: bad.length, first: bad[0]?.log }).toEqual({ kinds: [], count: 0, first: undefined });
  }, 120000);
});
