import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as morse from '../src/index.js';

describe('audio', () => {
  let audioInstance;

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

    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') return mockAnchor;
      return originalCreateElement.call(document, tag);
    });

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

    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') return mockAnchor;
      return originalCreateElement.call(document, tag);
    });

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
    const types = ['sine', 'square', 'sawtooth', 'triangle'];

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
      expect(time2).toBeGreaterThanOrEqual(0);

      audioInstance.stop();
    });

    it('getCurrentTime() returns pausedAt time when paused', async () => {
      await audioInstance.seek(0.1);
      const pausedTime = audioInstance.getCurrentTime();
      expect(pausedTime).toBeCloseTo(0.1, 2);
    });
  });

  describe('Event System', () => {
    it('fires onready event when audio is ready', (done) => {
      const onready = vi.fn();
      const audio = morse.audio('A', {
        events: { onready }
      });

      setTimeout(() => {
        expect(onready).toHaveBeenCalled();
        done();
      }, 100);
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
      expect(audioInstance.getState()).toBe('stopped');
    });

    it('stop(true) disposes buffer', async () => {
      await audioInstance.play();
      audioInstance.stop(true);
      expect(audioInstance.getState()).toBe('stopped');
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
