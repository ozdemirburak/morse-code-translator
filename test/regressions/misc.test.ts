import { describe, it, expect, vi } from 'vitest';
import morse from '../../src/index';
import getOptions from '../../src/options';
import { getToneSchedule } from '../../src/audio';

describe('regression: tables, normalize, tokenize', () => {
  it('table cache keeps option sets with NUL characters in their symbols apart', () => {
    const a = { dot: 'a\u0000b', dash: 'c' };
    const b = { dot: 'a', dash: 'b\u0000c' };
    const fresh = morse.encode('E', { dot: 'a', dash: 'b\u0000c', priority: 2 }); // different key, sanity
    expect(fresh).toBe('a');
    morse.encode('E', a); // populate cache with a's tables
    const got = morse.encode('E', b);
    expect(got).toBe('a');
    expect(morse.decode('a', b)).toBe('E');
  });

  it('a combining-mark separator does not merge with the neighbouring letter', () => {
    const opts = { separator: '́' };
    expect(() => getOptions(opts)).not.toThrow();
    const out = morse.encode('E E', opts);
    // expected: E, word gap, E
    expect(out).toBe(['.', '/', '.'].join('́'));
  });

  it('rejects a dot containing whitespace, which the tokenizer would split', () => {
    expect(() => getOptions({ dot: 'di t', separator: '|' })).toThrow(/whitespace/);
  });

  it('an invalid marker that contains a dot symbol adds no tone', () => {
    const opts = getOptions({ invalid: '?.' });
    const withInvalid = getToneSchedule(morse.encode('A~', { invalid: '?.' }), opts);
    const without = getToneSchedule(morse.encode('A', { invalid: '?.' }), opts);
    expect(withInvalid.totalTime).toBe(without.totalTime);
  });
});

describe('regression: render failure', () => {
  it('a failed first render does not poison later getWaveBlob() or play()', async () => {
    const scope = window as unknown as { OfflineAudioContext: { prototype: { startRendering: () => Promise<unknown> } } };
    const proto = scope.OfflineAudioContext.prototype;
    const original = proto.startRendering;
    let calls = 0;
    proto.startRendering = function (this: unknown) {
      calls++;
      if (calls === 1) return Promise.reject(new Error('transient render failure'));
      return original.call(this);
    };
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const instance = morse.audio('SOS');
      await new Promise((r) => setTimeout(r, 20));
      let err: unknown = null;
      try { await instance.getWaveBlob(); } catch (e) { err = e; }
      expect(err).toBeNull();
      await expect(instance.play()).resolves.toBeUndefined();
      expect(instance.getState()).toBe('playing');
      await new Promise((r) => setTimeout(r, 20));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      proto.startRendering = original;
      process.off('unhandledRejection', unhandled);
    }
  });
});
