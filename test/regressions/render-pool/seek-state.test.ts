import { describe, it, expect, vi, afterEach } from 'vitest';
import morse from '../../../src/index';
import { flush, longText, chunkInfo, holdRenders } from './harness';

// seek() while playing sets state = 'paused' (a "transient" for the resume)
// without firing onpaused. A listener that tracks state from events sees
// "playing" while getState() says "paused" inside onseeked and for the whole
// render wait; then onstarted fires again although onpaused never did.
let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.restoreAllMocks();
});

describe('regression: state during seek() while playing', () => {
  it('getState() stays "playing", as the events say', async () => {
    const options = { wpm: 20 };
    const text = longText(100);
    const { starts, byLength } = chunkInfo(text, options);
    const held = holdRenders(byLength);
    cleanup = held.restore;
    const seen: string[] = [];
    let eventState = 'ready';
    const instance = morse.audio(text, {
      ...options,
      events: {
        onstarted: () => {
          eventState = 'playing';
          seen.push(`started(${instance.getState()})`);
        },
        onpaused: () => {
          eventState = 'paused';
          seen.push(`paused(${instance.getState()})`);
        },
        onseeked: () => seen.push(`seeked(${instance.getState()})`),
      },
    });
    held.byStart(starts[0])[0].release();
    await instance.play();
    const seeking = instance.seek(100); // the chunk at 100 s is not rendered yet
    await flush();
    const duringRender = { eventState, state: instance.getState() };
    for (const r of held.pending()) r.release();
    await seeking;
    // Observed: seen = ['started(playing)', 'seeked(paused)', 'started(playing)'],
    // duringRender = { eventState: 'playing', state: 'paused' }.
    // Expected: events and getState() agree (no "paused" without onpaused).
    expect({ seen, duringRender }).toEqual({
      seen: ['started(playing)', 'seeked(playing)', 'started(playing)'],
      duringRender: { eventState: 'playing', state: 'playing' },
    });
  });
});
