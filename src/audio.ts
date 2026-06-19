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

// Upper bound on rendered audio length, so a degenerate (huge / non-finite)
// unit/wpm cannot produce an Infinite totalTime, buffer, or playback timer.
const MAX_TOTAL_SECONDS = 3600;

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

  // Try the longer symbol first so a shorter dot/dash that is a prefix of the
  // other (e.g. dot '..' vs dash '...') cannot greedily mis-tokenize it.
  const symbolOrder: Array<[string, number]> =
    opts.dot.length >= opts.dash.length
      ? [[opts.dot, DOT_DURATION], [opts.dash, DASH_DURATION]]
      : [[opts.dash, DASH_DURATION], [opts.dot, DOT_DURATION]];

  // Split into words by the word-gap symbol, then characters by the separator,
  // then consume whole dot/dash symbols. Matching whole symbols (rather than
  // single code points) supports multi-character dot/dash/space symbols. Empty
  // words are dropped so leading/trailing/doubled word separators do not emit
  // phantom word gaps.
  const words = morse
    .split(opts.space)
    .map((word) => word.split(opts.separator).filter((character) => character !== ''))
    .filter((characters) => characters.length > 0);
  words.forEach((characters, wordIndex) => {
    if (wordIndex > 0) {
      gap(WORD_GAP);
    }
    characters.forEach((character, characterIndex) => {
      if (characterIndex > 0) {
        gap(INTER_CHARACTER_GAP);
      }
      let position = 0;
      let needsSilence = false;
      while (position < character.length) {
        const matched = symbolOrder.find(([symbol]) => symbol && character.startsWith(symbol, position));
        if (matched) {
          if (needsSilence) silence(INTRA_CHARACTER_GAP);
          tone(matched[1]);
          needsSilence = true;
          position += matched[0].length;
        } else {
          // Skip any unexpected symbol (e.g. the invalid-character marker).
          position += 1;
        }
      }
    });
  });

  // Clamp so a degenerate unit/wpm cannot yield a non-finite or absurd duration.
  return [timings, Math.min(time, MAX_TOTAL_SECONDS)];
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

  const [gainValues, totalTime] = getGainTimings(morse, options);
  // OfflineAudioContext requires a length of at least one sample frame, so an
  // empty/silent morse string still yields a valid tiny buffer. The upper bound
  // is already enforced by getGainTimings clamping totalTime to MAX_TOTAL_SECONDS.
  const bufferLength = Math.max(1, Math.ceil(SAMPLE_RATE * totalTime));
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

  // The live playback AudioContext is created lazily: callers who only render or
  // export WAV data never allocate one (browsers cap the number of live contexts).
  let context: AudioContext | null = null;
  // State management (declared before getContext so it can read `state`)
  let source: AudioBufferSourceNode | null = null;
  let renderedBuffer: AudioBuffer | null = null;
  let state: AudioState = 'ready';
  let pausedAt = 0;
  let startTime = 0;
  let timeout: number | null = null;
  // True while a play() is in its async startup (between the synchronous entry
  // and the moment it actually starts or bails). Lets stop()/seek() know a
  // playback intent is in flight.
  let pendingPlay = false;
  // Incremented by play()/stop()/seek()/dispose(); lets an in-flight play()
  // detect it was superseded during an await and bail instead of resurrecting.
  let epoch = 0;

  const getContext = (): AudioContext => {
    // Never create (or resurrect) a live context once disposed.
    if (!context && state !== 'disposed') {
      context = new AudioContextClass();
    }
    return context as AudioContext;
  };

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
        // If the instance was disposed before rendering finished, do not populate
        // the buffer or signal readiness — keeps post-dispose export deterministic
        // (getWaveBlob throws) instead of timing-dependent. Still resolve so any
        // awaiters do not hang. Otherwise: do NOT reset state to 'ready' (the
        // caller may have already stopped/started during rendering).
        if (state !== 'disposed') {
          renderedBuffer = e.renderedBuffer;
          events.onready?.();
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    offlineContext.addEventListener('error', (err) => {
      reject(err);
    });
  });

  const clearAutoStop = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const stopSource = () => {
    if (source) {
      try {
        source.stop(0);
      } catch (e) {
        // Ignore if already stopped
      }
      source = null;
    }
  };

  // Helper: Create a new audio source
  const createSource = (): AudioBufferSourceNode => {
    const ctx = getContext();
    const newSource = ctx.createBufferSource();
    newSource.buffer = renderedBuffer;
    newSource.connect(ctx.destination);
    return newSource;
  };

  const play = async () => {
    // Already playing or disposed -> nothing to do.
    if (state === 'playing' || state === 'disposed') {
      return;
    }
    // Claim a fresh epoch. Any EARLIER in-flight play() now sees a changed epoch
    // and bails (so concurrent play() calls start exactly once); stop()/seek()/
    // dispose() also bump the epoch to supersede an in-flight play.
    const myEpoch = ++epoch;
    pendingPlay = true;
    const superseded = (): boolean => epoch !== myEpoch || getState() === 'disposed';
    try {
      await render;

      // Bail if superseded during the render await. Checked BEFORE touching the
      // context so a disposed/stopped instance never lazily creates one.
      if (superseded()) {
        return;
      }

      const ctx = getContext();
      // Resume audio context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Re-check after the resume await for the same reason.
      if (superseded()) {
        return;
      }

      // Create new source if needed (source is null whenever not actively playing)
      if (!source) {
        source = createSource();
      }

      // Start playback from pausedAt position
      source.start(ctx.currentTime, pausedAt);
      startTime = ctx.currentTime - pausedAt;
      state = 'playing';
      events.onstarted?.();

      // Set up auto-stop when playback completes naturally. pause()/stop()/seek()
      // all clear this timer, so when it fires playback genuinely reached the end.
      clearAutoStop();
      const remainingTime = (totalTime - pausedAt) * 1000;
      timeout = window.setTimeout(() => {
        if (state === 'playing') {
          clearAutoStop();
          stopSource();
          state = 'stopped';
          pausedAt = 0;
          startTime = 0;
          events.onended?.();
        }
      }, remainingTime);
    } finally {
      // Only the current epoch's play() owns the pendingPlay flag; a superseding
      // call manages its own lifecycle.
      if (epoch === myEpoch) {
        pendingPlay = false;
      }
    }
  };

  const pause = () => {
    if (state === 'disposed') {
      return;
    }

    if (state === 'playing') {
      clearAutoStop();
      pausedAt = Math.min(getContext().currentTime - startTime, totalTime);
      stopSource();
      state = 'paused';
      events.onpaused?.();
      return;
    }

    // An in-flight play() that has not started yet: supersede it (so it bails
    // on resume) and settle into 'paused' rather than dropping the intent.
    if (pendingPlay) {
      epoch++;
      pendingPlay = false;
      clearAutoStop();
      stopSource();
      state = 'paused';
      events.onpaused?.();
    }
  };

  const stop = (dispose = false) => {
    if (state === 'disposed') {
      return;
    }

    epoch++;
    clearAutoStop();
    stopSource();

    // Active = currently playing OR a play()/seek-resume is in flight; in both
    // cases the playback the listener believes is happening is being stopped.
    const wasActive = state === 'playing' || pendingPlay;
    pendingPlay = false;
    state = 'stopped';
    pausedAt = 0;
    startTime = 0;

    if (wasActive) {
      events.onstopped?.();
    }

    if (dispose) {
      renderedBuffer = null;
    }
  };

  const seek = async (time: number) => {
    if (state === 'disposed') {
      return;
    }

    // Resume afterwards if playback is active or a play() is in flight (so a
    // play() immediately followed by seek() is not silently swallowed).
    const wasActive = state === 'playing' || pendingPlay;
    // Neutralize only NaN (Math.min/Math.max do not); ±Infinity still clamps to
    // the [0, totalTime] range as expected.
    const safeTime = Number.isNaN(time) ? 0 : time;
    const clampedTime = Math.max(0, Math.min(safeTime, totalTime));

    epoch++;
    // Stop current playback
    clearAutoStop();
    stopSource();

    pausedAt = clampedTime;
    events.onseeked?.(clampedTime);

    if (wasActive) {
      state = 'paused'; // transient; play() sets it back to 'playing'
      await play();
    }
  };

  const dispose = () => {
    stop(true);
    state = 'disposed';
    if (context && context.state !== 'closed') {
      context.close();
    }
  };

  const getCurrentTime = (): number => {
    if (state === 'playing') {
      return Math.min(getContext().currentTime - startTime, totalTime);
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
    // Release the internally-created object URL once the download has started.
    setTimeout(() => URL.revokeObjectURL(waveUrl), 1000);
  };

  const result = {
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

    // Audio nodes (for advanced users)
    oscillator,
    gainNode,
  } as AudioResult;

  // Context access (for advanced users); created lazily on first access. Defined
  // as a NON-enumerable getter so object spread / JSON.stringify / Object.keys do
  // not accidentally allocate a live AudioContext (browsers cap how many exist).
  Object.defineProperty(result, 'context', {
    get: getContext,
    enumerable: false,
    configurable: true,
  });

  return result;
};

export default audio;
