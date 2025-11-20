import type { Options, AudioResult, AudioState, AudioEvents } from './types.js';

// Audio constants
const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

// Morse timing constants (in units)
const DOT_DURATION = 1;
const DASH_DURATION = 3;
const INTRA_CHARACTER_GAP = 1;
const INTER_CHARACTER_GAP = 3;
const WORD_GAP = 7;

// WPM calculation constant (PARIS method)
const WPM_UNIT_DIVISOR = 50;

type GainTiming = [number, number];
type GainTimings = [GainTiming[], number];

const getGainTimings = (morse: string, opts: Options, currentTime = 0): GainTimings => {
  const timings: GainTiming[] = [];
  let { unit, fwUnit } = opts;
  let time = 0;

  if (opts.wpm) {
    // WPM mode uses standardized units (PARIS method)
    unit = fwUnit = 60 / (opts.wpm * WPM_UNIT_DIVISOR);
  }

  timings.push([0, time]);

  const addTiming = (gainValue: number, duration: number, useUnit = true) => {
    timings.push([gainValue, currentTime + time]);
    time += duration * (useUnit ? unit : fwUnit);
  };

  const tone = (duration: number) => addTiming(opts.volume / 100.0, duration);
  const silence = (duration: number) => addTiming(0, duration);
  const gap = (duration: number) => addTiming(0, duration, false);

  for (let i = 0, needsSilence = false; i <= morse.length; i++) {
    const char = morse[i];
    const nextChar = morse[i + 1];
    const prevChar = morse[i - 1];

    if (char === opts.space) {
      gap(WORD_GAP);
      needsSilence = false;
    } else if (char === opts.dot) {
      if (needsSilence) silence(INTRA_CHARACTER_GAP);
      tone(DOT_DURATION);
      needsSilence = true;
    } else if (char === opts.dash) {
      if (needsSilence) silence(INTRA_CHARACTER_GAP);
      tone(DASH_DURATION);
      needsSilence = true;
    } else if (
      nextChar !== undefined && nextChar !== opts.space &&
      prevChar !== undefined && prevChar !== opts.space
    ) {
      // Inter-character gap (separator between characters)
      gap(INTER_CHARACTER_GAP);
      needsSilence = false;
    }
  }

  return [timings, time];
};

/**
 * Encodes audio samples to WAV format
 * Based on: https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js#L155
 */
const encodeWAV = (sampleRate: number, samples: Float32Array): DataView => {
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const blockAlign = CHANNELS * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize; // WAV header is 44 bytes

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  const floatTo16BitPCM = (offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += bytesPerSample) {
      const sample = Math.max(-1, Math.min(1, input[i]));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, value, true);
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true); // File size - 8
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  floatTo16BitPCM(44, samples);

  return view;
};

const audio = (morse: string, options: Options): AudioResult => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const OfflineAudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

  if (!AudioContextClass || !OfflineAudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser. Please use a modern browser with Web Audio API support.');
  }

  const context = new AudioContextClass();
  const [gainValues, totalTime] = getGainTimings(morse, options);
  const bufferLength = Math.ceil(SAMPLE_RATE * totalTime);
  const offlineContext = new OfflineAudioContextClass(CHANNELS, bufferLength, SAMPLE_RATE);

  const oscillator = offlineContext.createOscillator();
  const gainNode = offlineContext.createGain();

  oscillator.type = options.oscillator.type as OscillatorType;
  oscillator.frequency.value = options.oscillator.frequency ?? 500;

  gainValues.forEach(([value, time]) => {
    gainNode.gain.setValueAtTime(value, time);
  });

  oscillator.connect(gainNode);
  gainNode.connect(offlineContext.destination);

  // State management
  let source: AudioBufferSourceNode | null = null;
  let renderedBuffer: AudioBuffer | null = null;
  let state: AudioState = 'ready';
  let pausedAt = 0;
  let startTime = 0;
  let timeout: number | null = null;

  const events: AudioEvents = options.events || {};

  // Backwards compatibility: support old onended in oscillator options
  if (options.oscillator.onended && !events.onended) {
    events.onended = options.oscillator.onended as any;
  }

  // Render the audio buffer
  const render = new Promise<void>((resolve, reject) => {
    oscillator.start(0);
    offlineContext.startRendering();
    offlineContext.oncomplete = (e) => {
      try {
        renderedBuffer = e.renderedBuffer;
        state = 'ready';
        events.onready?.();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    offlineContext.addEventListener('error', (err) => {
      reject(err);
    });
  });

  // Helper: Create a new audio source
  const createSource = (): AudioBufferSourceNode => {
    const newSource = context.createBufferSource();
    newSource.buffer = renderedBuffer;
    newSource.connect(context.destination);
    newSource.onended = () => {
      const currentTime = getCurrentTime();
      // Only fire onended if playback completed naturally (not stopped/paused)
      if (state === 'playing' && currentTime >= totalTime - 0.01) {
        state = 'stopped';
        pausedAt = 0;
        events.onended?.();
      }
    };
    return newSource;
  };

  const play = async () => {
    await render;

    // Resume audio context if suspended
    if (context.state === 'suspended') {
      await context.resume();
    }

    // If already playing, do nothing
    if (state === 'playing') {
      return;
    }

    // Create new source if needed
    if (!source || source.buffer === null) {
      source = createSource();
    }

    // Start playback from pausedAt position
    source.start(context.currentTime, pausedAt);
    startTime = context.currentTime - pausedAt;
    state = 'playing';
    events.onstarted?.();

    // Set up auto-stop when playback completes
    const remainingTime = (totalTime - pausedAt) * 1000;
    timeout = window.setTimeout(() => {
      if (state === 'playing') {
        stop();
      }
    }, remainingTime);
  };

  const pause = () => {
    if (state !== 'playing') {
      return;
    }

    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }

    pausedAt = Math.min(context.currentTime - startTime, totalTime);

    if (source) {
      source.stop(0);
      source = null;
    }

    state = 'paused';
    events.onpaused?.();
  };

  const stop = (dispose = false) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }

    if (source) {
      try {
        source.stop(0);
      } catch (e) {
        // Ignore if already stopped
      }
      source = null;
    }

    const wasPlaying = state === 'playing';
    state = 'stopped';
    pausedAt = 0;
    startTime = 0;

    if (wasPlaying) {
      events.onstopped?.();
    }

    if (dispose) {
      renderedBuffer = null;
    }
  };

  const seek = async (time: number) => {
    const wasPlaying = state === 'playing';
    const clampedTime = Math.max(0, Math.min(time, totalTime));

    // Stop current playback
    if (source) {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      try {
        source.stop(0);
      } catch (e) {
        // Ignore
      }
      source = null;
    }

    pausedAt = clampedTime;
    events.onseeked?.(clampedTime);

    // Resume playback if was playing
    if (wasPlaying) {
      state = 'paused'; // Set to paused so play() will work
      await play();
    }
  };

  const dispose = () => {
    stop(true);
    if (context.state !== 'closed') {
      context.close();
    }
  };

  const getCurrentTime = (): number => {
    if (state === 'playing') {
      return Math.min(context.currentTime - startTime, totalTime);
    }
    return pausedAt;
  };

  const getTotalTime = (): number => {
    return totalTime;
  };

  const getState = (): AudioState => {
    return state;
  };

  const getWaveBlob = async (): Promise<Blob> => {
    await render;
    if (!renderedBuffer) {
      throw new Error('Audio buffer not available');
    }
    const waveData = encodeWAV(offlineContext.sampleRate, renderedBuffer.getChannelData(0));
    // Create a proper Uint8Array copy for Blob
    const uint8Array = new Uint8Array(waveData.byteLength);
    for (let i = 0; i < waveData.byteLength; i++) {
      uint8Array[i] = waveData.getUint8(i);
    }
    return new Blob([uint8Array], { type: 'audio/wav' });
  };

  const getWaveUrl = async () => {
    const audioBlob = await getWaveBlob();
    return URL.createObjectURL(audioBlob);
  };

  const exportWave = async (filename: string = 'morse.wav') => {
    const waveUrl = await getWaveUrl();
    const anchor = document.createElement('a');
    anchor.href = waveUrl;
    anchor.target = '_blank';
    anchor.download = filename;
    anchor.click();
  };

  return {
    // Playback control
    play,
    pause,
    stop,
    seek,
    dispose,

    // Playback information
    getCurrentTime,
    getTotalTime,
    getState,

    // Export functionality
    getWaveBlob,
    getWaveUrl,
    exportWave,

    // Context access (for advanced users)
    context,
    oscillator,
    gainNode,
  };
};

export default audio;
