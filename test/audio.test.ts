import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as morse from '../src/index';
import type { AudioResult } from '../src/types';

describe('audio', () => {
  let audioInstance: AudioResult;

  beforeEach(() => {
    audioInstance = morse.audio('SOS');
  });

  it('creates audio instance with default options', () => {
    expect(audioInstance).toBeDefined();
    expect(audioInstance.play).toBeTypeOf('function');
    expect(audioInstance.stop).toBeTypeOf('function');
    expect(audioInstance.getWaveBlob).toBeTypeOf('function');
    expect(audioInstance.getWaveUrl).toBeTypeOf('function');
    expect(audioInstance.exportWave).toBeTypeOf('function');
    expect(audioInstance.context).toBeDefined();
    expect(audioInstance.oscillator).toBeDefined();
    expect(audioInstance.gainNode).toBeDefined();
  });

  it('creates audio with custom options', () => {
    const customAudio = morse.audio('HELLO', {
      wpm: 20,
      volume: 50,
      oscillator: {
        frequency: 600,
        type: 'square'
      }
    });

    expect(customAudio).toBeDefined();
    expect(customAudio.context).toBeDefined();
  });

  it('creates audio from custom morse string', () => {
    const customAudio = morse.audio('TEST', {}, '- . ... -');
    expect(customAudio).toBeDefined();
  });

  it('generates wave blob', async () => {
    const blob = await audioInstance.getWaveBlob();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('generates wave URL', async () => {
    const url = await audioInstance.getWaveUrl();
    expect(url).toBeTypeOf('string');
    expect(url).toMatch(/^blob:/);
  });

  it('exports wave file', async () => {
    // Mock document.createElement to verify exportWave works
    const mockAnchor = {
      href: '',
      target: '',
      download: '',
      click: vi.fn()
    };

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLElement;
      return originalCreateElement(tag);
    }) as typeof document.createElement;

    await audioInstance.exportWave('test-morse.wav');

    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('test-morse.wav');
    expect(mockAnchor.href).toMatch(/^blob:/);

    // Restore original
    document.createElement = originalCreateElement;
  });

  it('exports wave with default filename', async () => {
    const mockAnchor = {
      href: '',
      target: '',
      download: '',
      click: vi.fn()
    };

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLElement;
      return originalCreateElement(tag);
    }) as typeof document.createElement;

    await audioInstance.exportWave();

    expect(mockAnchor.download).toBe('morse.wav');

    document.createElement = originalCreateElement;
  });

  it('handles different wpm speeds', () => {
    const slowAudio = morse.audio('TEST', { wpm: 5 });
    const fastAudio = morse.audio('TEST', { wpm: 30 });

    expect(slowAudio).toBeDefined();
    expect(fastAudio).toBeDefined();
  });

  it('handles different oscillator types', () => {
    const types: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

    types.forEach(type => {
      const audio = morse.audio('A', {
        oscillator: { type }
      });
      expect(audio).toBeDefined();
    });
  });

  it('handles custom volume', () => {
    const quietAudio = morse.audio('TEST', { volume: 25 });
    const loudAudio = morse.audio('TEST', { volume: 100 });

    expect(quietAudio).toBeDefined();
    expect(loudAudio).toBeDefined();
  });

  it('handles custom frequency', () => {
    const lowFreq = morse.audio('TEST', {
      oscillator: { frequency: 300 }
    });
    const highFreq = morse.audio('TEST', {
      oscillator: { frequency: 1000 }
    });

    expect(lowFreq).toBeDefined();
    expect(highFreq).toBeDefined();
  });

  it('handles onended callback', async () => {
    const onendedMock = vi.fn();
    const audio = morse.audio('A', {
      oscillator: {
        onended: onendedMock
      }
    });

    expect(audio).toBeDefined();
    // The callback would be called when audio ends, but we can't easily test timing here
  });

  it('generates audio for different morse lengths', async () => {
    // Note: With mocked Audio API, we can't test actual timing differences
    // but we can verify both short and long morse code generate valid audio
    const shortAudio = morse.audio('E'); // Single dot
    const longAudio = morse.audio('SOS'); // ... --- ...

    const shortBlob = await shortAudio.getWaveBlob();
    const longBlob = await longAudio.getWaveBlob();

    expect(shortBlob).toBeInstanceOf(Blob);
    expect(longBlob).toBeInstanceOf(Blob);
    expect(shortBlob.type).toBe('audio/wav');
    expect(longBlob.type).toBe('audio/wav');
  });

  it('handles different character sets in audio', () => {
    const latinAudio = morse.audio('HELLO');
    const cyrillicAudio = morse.audio('ПРИВЕТ', { priority: 5 });
    const arabicAudio = morse.audio('مرحبا', { priority: 8 });

    expect(latinAudio).toBeDefined();
    expect(cyrillicAudio).toBeDefined();
    expect(arabicAudio).toBeDefined();
  });

  it('can play and stop audio', async () => {
    // Note: In happy-dom, actual audio playback won't work,
    // but we can verify the methods don't throw errors
    await expect(audioInstance.play()).resolves.not.toThrow();
    expect(() => audioInstance.stop()).not.toThrow();
  });

  describe('State Management', () => {
    it('initial state is ready', () => {
      expect(audioInstance.getState()).toBe('ready');
    });

    it('state changes to playing when play() is called', async () => {
      await audioInstance.play();
      expect(audioInstance.getState()).toBe('playing');
      audioInstance.stop();
    });

    it('state changes to paused when pause() is called', async () => {
      await audioInstance.play();
      audioInstance.pause();
      expect(audioInstance.getState()).toBe('paused');
    });

    it('state changes to stopped when stop() is called', async () => {
      await audioInstance.play();
      audioInstance.stop();
      expect(audioInstance.getState()).toBe('stopped');
    });
  });

  describe('Pause and Resume', () => {
    it('can pause and resume playback', async () => {
      await audioInstance.play();
      expect(audioInstance.getState()).toBe('playing');

      audioInstance.pause();
      expect(audioInstance.getState()).toBe('paused');

      await audioInstance.play();
      expect(audioInstance.getState()).toBe('playing');

      audioInstance.stop();
    });

    it('pause does nothing if not playing', () => {
      audioInstance.pause();
      expect(audioInstance.getState()).toBe('ready');
    });

    it('can play after stop', async () => {
      await audioInstance.play();
      audioInstance.stop();
      expect(audioInstance.getState()).toBe('stopped');

      await audioInstance.play();
      expect(audioInstance.getState()).toBe('playing');

      audioInstance.stop();
    });
  });

  describe('Seek Functionality', () => {
    it('can seek to specific time', () => {
      const totalTime = audioInstance.getTotalTime();
      const halfTime = totalTime / 2;

      audioInstance.seek(halfTime);
      expect(audioInstance.getCurrentTime()).toBeCloseTo(halfTime, 2);
    });

    it('clamps seek time to valid range', () => {
      const totalTime = audioInstance.getTotalTime();

      // Seek beyond end
      audioInstance.seek(totalTime + 10);
      expect(audioInstance.getCurrentTime()).toBe(totalTime);

      // Seek before start
      audioInstance.seek(-5);
      expect(audioInstance.getCurrentTime()).toBe(0);
    });

    it('resumes playing after seek if was playing', async () => {
      await audioInstance.play();
      expect(audioInstance.getState()).toBe('playing');

      await audioInstance.seek(0.1);
      // Should still be playing after seek
      expect(audioInstance.getState()).toBe('playing');

      audioInstance.stop();
    });

    it('stays paused after seek if was paused', () => {
      audioInstance.seek(0.5);
      expect(audioInstance.getState()).not.toBe('playing');
    });
  });

  describe('Time Information', () => {
    it('getTotalTime() returns total duration', () => {
      const totalTime = audioInstance.getTotalTime();
      expect(totalTime).toBeGreaterThan(0);
      expect(typeof totalTime).toBe('number');
    });

    it('getCurrentTime() returns 0 initially', () => {
      expect(audioInstance.getCurrentTime()).toBe(0);
    });

    it('getCurrentTime() updates during playback', async () => {
      await audioInstance.play();
      const time1 = audioInstance.getCurrentTime();

      // Wait a bit (note: in mocked environment, time may not progress naturally)
      await new Promise(resolve => setTimeout(resolve, 50));

      const time2 = audioInstance.getCurrentTime();
      // In real environment, time2 should be >= time1
      expect(time2).toBeGreaterThanOrEqual(time1);

      audioInstance.stop();
    });

    it('getCurrentTime() returns pausedAt time when paused', async () => {
      await audioInstance.seek(0.1);
      const pausedTime = audioInstance.getCurrentTime();
      expect(pausedTime).toBeCloseTo(0.1, 2);
    });
  });

  describe('Event System', () => {
    it('fires onready event when audio is ready', async () => {
      const onready = vi.fn();
      morse.audio('A', {
        events: { onready }
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onready).toHaveBeenCalled();
    });

    it('fires onstarted event when playback starts', async () => {
      const onstarted = vi.fn();
      const audio = morse.audio('A', {
        events: { onstarted }
      });

      await audio.play();
      expect(onstarted).toHaveBeenCalled();
      audio.stop();
    });

    it('fires onpaused event when paused', async () => {
      const onpaused = vi.fn();
      const audio = morse.audio('A', {
        events: { onpaused }
      });

      await audio.play();
      audio.pause();
      expect(onpaused).toHaveBeenCalled();
    });

    it('fires onstopped event when stopped', async () => {
      const onstopped = vi.fn();
      const audio = morse.audio('A', {
        events: { onstopped }
      });

      await audio.play();
      audio.stop();
      expect(onstopped).toHaveBeenCalled();
    });

    it('fires onseeked event when seeking', () => {
      const onseeked = vi.fn();
      const audio = morse.audio('A', {
        events: { onseeked }
      });

      const totalTime = audio.getTotalTime();
      const seekTime = totalTime / 2;
      audio.seek(seekTime);
      expect(onseeked).toHaveBeenCalledWith(seekTime);
    });

    it('supports backwards compatible onended in oscillator options', () => {
      const onended = vi.fn();
      const audio = morse.audio('A', {
        oscillator: { onended }
      });

      expect(audio).toBeDefined();
    });
  });

  describe('Dispose', () => {
    it('can dispose audio resources', async () => {
      await audioInstance.play();
      audioInstance.dispose();
      expect(audioInstance.getState()).toBe('disposed');
    });

    it('is inert after dispose (play/seek are true no-ops)', async () => {
      const onseeked = vi.fn();
      const instance = morse.audio('SOS', { events: { onseeked } });
      await instance.play();
      instance.dispose();
      expect(instance.getState()).toBe('disposed');

      await instance.play();
      expect(instance.getState()).toBe('disposed');

      await instance.seek(0.1);
      expect(instance.getState()).toBe('disposed');
      // seek() must produce no side effects after dispose.
      expect(onseeked).not.toHaveBeenCalled();
      expect(instance.getCurrentTime()).toBe(0);
    });

    it('phantom word gaps are not emitted for empty words (round6)', () => {
      // Leading/trailing/doubled word separators must not add WORD_GAP silence.
      const baseline = morse.audio('', {}, '.- / -...').getTotalTime();
      expect(morse.audio('', {}, '/ .-').getTotalTime()).toBeCloseTo(0.4, 5); // 'A' only = 5 units
      expect(morse.audio('', {}, '.- // -...').getTotalTime()).toBeCloseTo(baseline, 5);
    });

    it('clamps seek(Infinity) to the end, not the start (round6)', async () => {
      const total = audioInstance.getTotalTime();
      await audioInstance.seek(Infinity);
      expect(audioInstance.getCurrentTime()).toBeCloseTo(total, 5);
      await audioInstance.seek(-Infinity);
      expect(audioInstance.getCurrentTime()).toBe(0);
    });

    it('stop(true) disposes buffer', async () => {
      await audioInstance.play();
      audioInstance.stop(true);
      expect(audioInstance.getState()).toBe('stopped');
      // The rendered buffer must actually be gone (distinguishes it from stop(false)).
      await expect(audioInstance.getWaveBlob()).rejects.toThrow();
    });

    it('stop() without dispose keeps buffer', async () => {
      await audioInstance.play();
      audioInstance.stop(false);
      // Can still play again
      await audioInstance.play();
      expect(audioInstance.getState()).toBe('playing');
      audioInstance.stop();
    });
  });

  describe('Edge Cases', () => {
    it('calling play() while playing does nothing', async () => {
      await audioInstance.play();
      const state1 = audioInstance.getState();

      await audioInstance.play(); // Call again
      const state2 = audioInstance.getState();

      expect(state1).toBe('playing');
      expect(state2).toBe('playing');
      audioInstance.stop();
    });

    it('handles multiple stop() calls gracefully', async () => {
      await audioInstance.play();
      audioInstance.stop();
      audioInstance.stop(); // Call again
      expect(audioInstance.getState()).toBe('stopped');
    });

    it('can create audio with event handlers', () => {
      const events = {
        onstarted: vi.fn(),
        onpaused: vi.fn(),
        onstopped: vi.fn(),
        onended: vi.fn(),
        onready: vi.fn(),
        onseeked: vi.fn()
      };

      const audio = morse.audio('TEST', { events });
      expect(audio).toBeDefined();
      expect(audio.getState()).toBe('ready');
    });
  });

  describe('Regression', () => {
    it('does not throw on empty / untranslatable input (B10)', async () => {
      expect(() => morse.audio('')).not.toThrow();
      const empty = morse.audio('');
      expect(empty.getTotalTime()).toBe(0);
      const blob = await empty.getWaveBlob();
      expect(blob).toBeInstanceOf(Blob);
    });

    it('produces audio for multi-character dot/dash symbols (B11)', () => {
      const instance = morse.audio('E', { dot: '<>' }); // E => single dot
      expect(instance.getTotalTime()).toBeGreaterThan(0);
      // Must emit an actual tone, not merely advance time via silence.
      const calls = (instance.gainNode.gain.setValueAtTime as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.some((call) => call[0] > 0)).toBe(true);
    });

    it('keeps totalTime finite for an absurdly large unit (round3 #3)', () => {
      expect(Number.isFinite(morse.audio('SOS', { unit: 1e308 }).getTotalTime())).toBe(true);
    });

    it('keeps default timing unchanged after the tokenizer rewrite (B11)', () => {
      // SOS = 27 units * 0.08s default unit = 2.16s
      expect(morse.audio('SOS').getTotalTime()).toBeCloseTo(2.16, 5);
    });

    it('only starts once when play() is called concurrently (B1)', async () => {
      const onstarted = vi.fn();
      const instance = morse.audio('SOS', { events: { onstarted } });

      // Count actual buffer-source starts, not just the onstarted event.
      const ctx = instance.context;
      const originalCreate = ctx.createBufferSource.bind(ctx);
      let startCount = 0;
      ctx.createBufferSource = (() => {
        const node = originalCreate();
        const originalStart = node.start.bind(node);
        node.start = ((...args: unknown[]) => {
          startCount++;
          return (originalStart as (...a: unknown[]) => void)(...args);
        }) as typeof node.start;
        return node;
      }) as typeof ctx.createBufferSource;

      await Promise.all([instance.play(), instance.play(), instance.play()]);
      expect(onstarted).toHaveBeenCalledTimes(1);
      expect(startCount).toBe(1);
      expect(instance.getState()).toBe('playing');
      instance.stop();
    });

    it('stays disposed when dispose() runs during the initial render (race)', async () => {
      const instance = morse.audio('SOS');
      const playing = instance.play();
      instance.dispose(); // before render completes
      await playing;
      expect(instance.getState()).toBe('disposed');
    });

    it('stays stopped when stop() interrupts a seek-resume (race)', async () => {
      await audioInstance.play();
      const seeking = audioInstance.seek(0.5);
      audioInstance.stop(); // synchronously, while seek->play is awaiting
      await seeking;
      expect(audioInstance.getState()).toBe('stopped');
    });

    it('tokenizes prefix-colliding multi-char symbols by longest match (B11)', () => {
      // 'T' => one dash (3 units); dash '...' must win over its dot prefix '..'.
      expect(morse.audio('T', { dot: '..', dash: '...' }).getTotalTime()).toBeCloseTo(0.24, 5);
    });

    it('rejects non-finite unit instead of allocating an infinite buffer (B12)', () => {
      expect(morse.audio('SOS', { unit: Infinity }).getTotalTime()).toBeCloseTo(2.16, 5);
      expect(morse.audio('SOS', { fwUnit: Infinity }).getTotalTime()).toBeCloseTo(2.16, 5);
    });

    it('does not crash on a non-finite or non-numeric oscillator frequency (round1 #2)', () => {
      expect(() => morse.audio('SOS', { oscillator: { frequency: Infinity } })).not.toThrow();
      const a = morse.audio('SOS', { oscillator: { frequency: Infinity } });
      expect(a.oscillator.frequency.value).toBe(500);
    });

    it('clamps totalTime (and thus the buffer) for degenerate timing (round1 #6 / round3 #3)', () => {
      // The totalTime clamp (MAX_TOTAL_SECONDS = 3600) bounds the buffer length.
      expect(morse.audio('SOS', { unit: 1e9 }).getTotalTime()).toBe(3600);
      expect(morse.audio('SOS', { wpm: 1e-9 }).getTotalTime()).toBe(3600);
    });

    it('sanitizes seek(NaN) instead of corrupting state (round5 #2)', async () => {
      const onended = vi.fn();
      const instance = morse.audio('SOS', { events: { onended } });
      await instance.play();
      await instance.seek(NaN);
      expect(Number.isFinite(instance.getCurrentTime())).toBe(true);
      expect(instance.getState()).toBe('playing');
      expect(onended).not.toHaveBeenCalled();
      instance.stop();
    });

    it('throws deterministically on getWaveBlob() after dispose (round5 #3)', async () => {
      const instance = morse.audio('E');
      instance.dispose();
      await expect(instance.getWaveBlob()).rejects.toThrow();
    });

    it('honors pause() called during an in-flight play() (round2 #1)', async () => {
      const instance = morse.audio('SOS');
      const playing = instance.play();
      instance.pause(); // before play() reaches 'playing'
      await playing;
      await new Promise((r) => setTimeout(r, 0));
      expect(instance.getState()).toBe('paused');
    });

    it('does not fire onready after dispose() (round2 #3)', async () => {
      const onready = vi.fn();
      const instance = morse.audio('SOS', { events: { onready } });
      instance.dispose();
      await new Promise((r) => setTimeout(r, 20));
      expect(onready).not.toHaveBeenCalled();
    });

    it('does not silently swallow play() when seek() follows immediately (round1 #1)', async () => {
      const onstarted = vi.fn();
      const instance = morse.audio('SOS', { events: { onstarted } });
      const playing = instance.play();
      instance.seek(0.01); // before play resolves
      await playing;
      // small settle for the seek-initiated resume
      await new Promise((r) => setTimeout(r, 0));
      expect(instance.getState()).toBe('playing');
      expect(onstarted).toHaveBeenCalled();
      instance.stop();
    });

    it('fires onstopped when a playing instance is stopped right after a seek (round1 #5)', async () => {
      const onstopped = vi.fn();
      const instance = morse.audio('SOS', { events: { onstopped } });
      await instance.play();
      const seeking = instance.seek(0.01);
      instance.stop();
      await seeking;
      expect(instance.getState()).toBe('stopped');
      expect(onstopped).toHaveBeenCalledTimes(1);
    });

    it('does not allocate a live AudioContext on spread/JSON or after dispose (round1 #8/#9)', () => {
      let constructed = 0;
      const RealAudioContext = window.AudioContext;
      class CountingAudioContext extends (RealAudioContext as { new (): AudioContext }) {
        constructor() { super(); constructed++; }
      }
      (window as { AudioContext: unknown }).AudioContext = CountingAudioContext;
      try {
        const instance = morse.audio('SOS');
        // Export path + spread/JSON must not allocate a live context.
        const spread = { ...instance };
        JSON.stringify(instance);
        expect(spread).toBeDefined();
        expect(constructed).toBe(0);

        // dispose before ever creating a context must not resurrect one.
        instance.dispose();
        void instance.context;
        expect(constructed).toBe(0);
      } finally {
        (window as { AudioContext: unknown }).AudioContext = RealAudioContext;
      }
    });

    it('fires onended (not onstopped) on natural completion (B14)', async () => {
      vi.useFakeTimers();
      try {
        const onended = vi.fn();
        const onstopped = vi.fn();
        const instance = morse.audio('A', { events: { onended, onstopped } });
        await instance.play();
        expect(instance.getState()).toBe('playing');

        vi.advanceTimersByTime(instance.getTotalTime() * 1000 + 50);

        expect(onended).toHaveBeenCalledTimes(1);
        expect(onstopped).not.toHaveBeenCalled();
        expect(instance.getState()).toBe('stopped');
      } finally {
        vi.useRealTimers();
      }
    });

    it('preserves volume:0 (mute) instead of defaulting to full volume (B7)', () => {
      const muted = morse.audio('E', { volume: 0 });
      const mutedCalls = (muted.gainNode.gain.setValueAtTime as ReturnType<typeof vi.fn>).mock.calls;
      expect(mutedCalls.length).toBeGreaterThan(0);
      expect(mutedCalls.every((call) => call[0] === 0)).toBe(true);

      // Contrast: full volume produces a tone gain of 1.
      const loud = morse.audio('E', { volume: 100 });
      const loudCalls = (loud.gainNode.gain.setValueAtTime as ReturnType<typeof vi.fn>).mock.calls;
      expect(loudCalls.some((call) => call[0] === 1)).toBe(true);
    });

    it('rejects a negative wpm instead of producing a negative buffer (B12)', () => {
      // negative wpm previously yielded a negative buffer length; it now falls
      // back to the default unit and renders a valid buffer.
      expect(() => morse.audio('SOS', { wpm: -5 })).not.toThrow();
      expect(morse.audio('SOS', { wpm: -5 }).getTotalTime()).toBeGreaterThan(0);
    });

    it('revokes the internally-created object URL after export (B17)', async () => {
      vi.useFakeTimers();
      try {
        const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
        const mockAnchor = { href: '', target: '', download: '', click: vi.fn() };
        const originalCreateElement = document.createElement.bind(document);
        document.createElement = vi.fn((tag: string) =>
          tag === 'a' ? (mockAnchor as unknown as HTMLElement) : originalCreateElement(tag)
        ) as typeof document.createElement;

        await audioInstance.exportWave('regression.wav');
        vi.advanceTimersByTime(1100);

        expect(revokeSpy).toHaveBeenCalled();
        document.createElement = originalCreateElement;
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Integration', () => {
    it('full playback cycle works correctly', async () => {
      // Start
      expect(audioInstance.getState()).toBe('ready');

      // Play
      await audioInstance.play();
      expect(audioInstance.getState()).toBe('playing');

      // Pause
      audioInstance.pause();
      expect(audioInstance.getState()).toBe('paused');

      // Resume
      await audioInstance.play();
      expect(audioInstance.getState()).toBe('playing');

      // Seek
      await audioInstance.seek(0.1);
      expect(audioInstance.getCurrentTime()).toBeCloseTo(0.1, 2);

      // Stop
      audioInstance.stop();
      expect(audioInstance.getState()).toBe('stopped');
      expect(audioInstance.getCurrentTime()).toBe(0);
    });
  });
});
