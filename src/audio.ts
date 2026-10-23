import type { Options, AudioResult, AudioState, AudioEvents } from './types.js';
import { tokenize } from './tokenize.js';

// Audio constants
const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const WAV_HEADER_BYTES = 44;
// RIFF stores sizes as uint32 (about 13.5 hours of 16-bit mono at 44.1 kHz).
const MAX_WAV_DATA_BYTES = 0xffffffff - (WAV_HEADER_BYTES - 8);

// Morse timing constants (in units)
const DOT_DURATION = 1;
const DASH_DURATION = 3;
const INTRA_CHARACTER_GAP = 1;
const INTER_CHARACTER_GAP = 3;
const WORD_GAP = 7;

// WPM calculation constant (PARIS method)
const WPM_UNIT_DIVISOR = 50;

// Longest attack/release ramp at tone edges. The ramps sit inside each tone, so
// timing is unchanged; they remove the click of a hard gain step.
const RAMP_SECONDS = 0.005;

// Audio is rendered in chunks of about this length, each in its own
// OfflineAudioContext, so long texts never need one huge buffer.
export const CHUNK_SECONDS = 30;
// Rendered chunks kept for playback (the current one and its neighbours).
const CACHED_CHUNKS = 3;
// Fade applied by the live player when playback starts or stops mid-tone
// (play/pause/seek/stop), so cutting into a tone does not click.
const LIVE_FADE_SECONDS = 0.005;
// Playback renders in flight at most (the playing chunk and the next one).
const MAX_PLAYBACK_RENDERS = 2;
// play() also waits for the next chunk when the position is this close to it.
const PREFETCH_SECONDS = 2;
// Rejection of a queued render that was superseded before it started.
const CANCELLED = new Error('morse-code-translator: render cancelled.');

type ToneSchedule = {
  // Flat [start, duration, start, duration, ...] in seconds, sorted by start.
  tones: Float64Array;
  totalTime: number;
};

const getUnits = (opts: Options): [number, number] => {
  if (opts.wpm) {
    // WPM mode uses standardized units (PARIS method)
    const unit = 60 / (opts.wpm * WPM_UNIT_DIVISOR);
    return [unit, unit];
  }
  return [opts.unit, opts.fwUnit];
};

export const getToneSchedule = (morse: string, opts: Options): ToneSchedule => {
  const [unit, fwUnit] = getUnits(opts);
  // Try the longer symbol first. (Validation already rejects a dot/dash that is
  // a prefix of the other, so the order only matters for speed.)
  const symbolOrder: Array<[string, number]> =
    opts.dot.length >= opts.dash.length
      ? [[opts.dot, DOT_DURATION], [opts.dash, DASH_DURATION]]
      : [[opts.dash, DASH_DURATION], [opts.dot, DOT_DURATION]];

  const tones: number[] = [];
  let time = 0;
  let wordGapPending = false;
  for (const token of tokenize(morse, opts)) {
    if (token === opts.space) {
      wordGapPending = tones.length > 0;
      continue;
    }
    // An unknown character adds no tones and no gaps, even if its marker
    // happens to contain a dot/dash symbol.
    if (token === opts.invalid) {
      continue;
    }
    const durations: number[] = [];
    for (let position = 0; position < token.length; ) {
      const matched = symbolOrder.find(([symbol]) => token.startsWith(symbol, position));
      if (matched) {
        durations.push(matched[1]);
        position += matched[0].length;
      } else {
        // Skip any unexpected symbol (e.g. the invalid-character marker).
        position += 1;
      }
    }
    // A token without tones (e.g. the invalid marker) adds no gaps either.
    if (durations.length === 0) {
      continue;
    }
    if (tones.length > 0) {
      time += (wordGapPending ? WORD_GAP : INTER_CHARACTER_GAP) * fwUnit;
    }
    wordGapPending = false;
    durations.forEach((duration, index) => {
      if (index > 0) {
        time += INTRA_CHARACTER_GAP * unit;
      }
      tones.push(time, duration * unit);
      time += duration * unit;
    });
  }

  if (!Number.isFinite(time)) {
    throw new RangeError('morse-code-translator: audio duration is not finite; use a smaller unit/fwUnit.');
  }
  return { tones: Float64Array.from(tones), totalTime: time };
};

/**
 * Delay in seconds from `offset` to the oscillator's next zero-phase point, so
 * every chunk's oscillator is in phase with absolute time. Half a frame of
 * tolerance (plus float slack) lets a boundary placed on a zero-phase point
 * start at once instead of one period late.
 */
export const phaseDelay = (offset: number, frequency: number, sampleRate: number): number => {
  const tolerance = (0.5 * frequency) / sampleRate + 1e-6;
  return Math.max(0, Math.ceil(offset * frequency - tolerance) / frequency - offset);
};

type ChunkPlan = {
  // Start frame of the chunk that contains `frame`.
  startFor: (frame: number) => number;
  // Start frame of the chunk after the one starting at `start` (>= totalFrames: none).
  next: (start: number) => number;
};

/**
 * Splits [0, totalFrames) into chunks of one to two target lengths. Boundary k
 * is computed from k alone (no walk from the start), so seeking anywhere is
 * cheap and the plan works for any duration. A boundary goes in silence when a
 * gap is near (at least one oscillator period before the next tone, so the
 * phase-aligned oscillator start below never clips a tone); otherwise (tones
 * longer than a chunk) it goes on a zero-phase point of the oscillator.
 */
export const createChunkPlan = (
  tones: Float64Array,
  totalFrames: number,
  sampleRate: number,
  frequency: number,
  targetFrames: number = CHUNK_SECONDS * sampleRate
): ChunkPlan => {
  const count = tones.length / 2;
  const startFrame = (i: number) => Math.floor(tones[i * 2] * sampleRate);
  const endFrame = (i: number) => Math.ceil((tones[i * 2] + tones[i * 2 + 1]) * sampleRate);
  const guard = Math.ceil(sampleRate / frequency) + 1;

  // First tone whose end frame is after `frame` (count if none).
  const firstToneEndingAfter = (frame: number): number => {
    let low = 0;
    let high = count;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (endFrame(mid) <= frame) low = mid + 1;
      else high = mid;
    }
    return low;
  };

  const boundaryAt = (k: number): number => {
    const target = k * targetFrames;
    if (k === 0 || target >= totalFrames) {
      return Math.min(target, totalFrames);
    }
    const limit = target + targetFrames;
    for (let tone = firstToneEndingAfter(target); tone <= count; tone++) {
      // The gap before `tone` (the tail after the last tone has no next tone).
      const candidate = tone === 0 ? target : Math.max(target, endFrame(tone - 1));
      if (candidate >= limit || candidate >= totalFrames) {
        break;
      }
      if (tone === count || startFrame(tone) - candidate >= guard) {
        return candidate;
      }
    }
    // No usable gap: if the rest of the audio fits, the chunk runs to the end
    // (so the final tone is never split); else split on a zero-phase point.
    if (totalFrames <= limit) {
      return totalFrames;
    }
    return Math.min(Math.round((Math.ceil((target / sampleRate) * frequency) / frequency) * sampleRate), totalFrames);
  };

  return {
    startFor: (frame) => {
      const k = Math.floor(frame / targetFrames);
      const start = boundaryAt(k);
      return start <= frame ? start : boundaryAt(k - 1);
    },
    next: (start) => boundaryAt(Math.floor(start / targetFrames) + 1),
  };
};

// Chunk start frames in order (for tests and diagnostics).
export const getChunkStarts = (
  tones: Float64Array,
  totalFrames: number,
  sampleRate: number,
  targetFrames: number = CHUNK_SECONDS * sampleRate,
  frequency = 500
): number[] => {
  const plan = createChunkPlan(tones, totalFrames, sampleRate, frequency, targetFrames);
  const starts: number[] = [];
  for (let start = 0; start < Math.max(1, totalFrames); start = plan.next(start)) {
    starts.push(start);
  }
  return starts;
};


/**
 * Renders frames [startFrame, endFrame) of the schedule in its own
 * OfflineAudioContext. The oscillator starts in phase with absolute time and the
 * gain envelope starts at its value at startFrame, so consecutive renders join
 * into exactly the audio of one long render.
 */
export const renderFrames = (
  OfflineAudioContextClass: typeof OfflineAudioContext,
  tones: Float64Array,
  opts: Options,
  startFrame: number,
  endFrame: number
): Promise<AudioBuffer> => {
  // OfflineAudioContext requires a length of at least one sample frame, so an
  // empty/silent morse string still yields a valid tiny buffer.
  const length = Math.max(1, endFrame - startFrame);
  const offlineContext = new OfflineAudioContextClass(CHANNELS, length, SAMPLE_RATE);
  const oscillator = offlineContext.createOscillator();
  const gainNode = offlineContext.createGain();
  const frequency = opts.oscillator.frequency ?? 500;
  const volume = opts.volume / 100.0;
  oscillator.type = opts.oscillator.type ?? 'sine';
  oscillator.frequency.value = frequency;

  const offset = startFrame / SAMPLE_RATE;
  const end = offset + length / SAMPLE_RATE;

  // Each tone: 0 at start, linear attack to volume, hold, linear release to 0 at
  // its end. The ramps sit inside the tone, so timing is unchanged.
  const envelope = (i: number): Array<[number, number, boolean]> => {
    const start = tones[i * 2];
    const duration = tones[i * 2 + 1];
    const ramp = Math.min(RAMP_SECONDS, duration / 4);
    return [
      [start, 0, false],
      [start + ramp, volume, true],
      [start + duration - ramp, volume, false],
      [start + duration, 0, true],
    ];
  };

  // First tone that ends after the chunk start.
  let first = 0;
  for (let low = 0, high = tones.length / 2; low < high; ) {
    const mid = (low + high) >> 1;
    if (tones[mid * 2] + tones[mid * 2 + 1] <= offset) low = mid + 1;
    else high = mid;
    first = low;
  }

  const gain = gainNode.gain;
  let initial = 0;
  if (first * 2 < tones.length && tones[first * 2] < offset) {
    // A tone runs across the chunk start: begin at its envelope value there.
    const points = envelope(first);
    for (let p = 1; p < points.length; p++) {
      const [time, value, ramped] = points[p];
      if (time > offset) {
        const [previousTime, previousValue] = points[p - 1];
        initial = ramped ? previousValue + ((value - previousValue) * (offset - previousTime)) / (time - previousTime) : previousValue;
        break;
      }
    }
  }
  gain.setValueAtTime(initial, 0);
  for (let i = first; i * 2 < tones.length && tones[i * 2] < end; i++) {
    for (const [time, value, ramped] of envelope(i)) {
      if (time > offset) {
        if (ramped) gain.linearRampToValueAtTime(value, time - offset);
        else gain.setValueAtTime(value, time - offset);
      }
    }
  }

  oscillator.connect(gainNode);
  gainNode.connect(offlineContext.destination);
  oscillator.start(phaseDelay(offset, frequency, SAMPLE_RATE));

  return offlineContext.startRendering();
};

const writeString = (view: DataView, offset: number, text: string) => {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
};

/**
 * WAV (RIFF, 16-bit PCM, mono) header for dataSize bytes of samples.
 * Based on: https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js#L155
 */
const encodeWAVHeader = (sampleRate: number, dataSize: number): ArrayBuffer => {
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const blockAlign = CHANNELS * bytesPerSample;
  const view = new DataView(new ArrayBuffer(WAV_HEADER_BYTES));

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, WAV_HEADER_BYTES - 8 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  return view.buffer;
};

const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
  const view = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return view.buffer;
};

// A throwing user callback must not break the instance; report it instead.
const safeCall = <A extends unknown[]>(callback: ((...args: A) => void) | undefined, ...args: A): void => {
  try {
    callback?.(...args);
  } catch (err) {
    console.error(err);
  }
};

const audio = (morse: string, options: Options): AudioResult => {
  const scope: Partial<typeof globalThis> = typeof window !== 'undefined' && window ? window : globalThis;
  const AudioContextClass = scope.AudioContext;
  const OfflineAudioContextClass = scope.OfflineAudioContext;

  if (!AudioContextClass || !OfflineAudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser. Please use a modern browser with Web Audio API support.');
  }

  const { tones, totalTime } = getToneSchedule(morse, options);
  // An empty/silent morse string still renders one (silent) frame.
  const totalFrames = Math.max(1, Math.ceil(SAMPLE_RATE * totalTime));
  const plan = createChunkPlan(tones, totalFrames, SAMPLE_RATE, options.oscillator.frequency ?? 500);
  const renderChunk = (start: number): Promise<AudioBuffer> =>
    renderFrames(OfflineAudioContextClass, tones, options, start, Math.min(plan.next(start), totalFrames));

  // The live playback AudioContext is created lazily: callers who only render or
  // export WAV data never allocate one (browsers cap the number of live contexts).
  let context: AudioContext | null = null;
  // State management (declared before getContext so it can read `state`)
  const sources = new Set<AudioBufferSourceNode>();
  // Live gain node of the current playback run (fades in on start, out on stop),
  // the context time its fade-in started, and when the last stop fade ends.
  let fader: GainNode | null = null;
  let faderStartedAt = 0;
  let fadeEndsAt = 0;
  // First frame not yet scheduled in the current run, and whether the render of
  // that chunk is in flight (a run keeps at most one chunk scheduled ahead).
  let scheduledEnd = 0;
  let renderingAhead = false;
  let state: AudioState = 'ready';
  let pausedAt = 0;
  let startTime = 0;
  // True while a play() (or the resume of a seek) is in its async startup.
  // Lets pause()/stop()/seek() know a playback intent is in flight.
  let pendingPlay = false;
  // While seek() resumes playback the internal state is 'paused' (a resume is
  // pending); getState() keeps reporting the state the events last announced.
  let shownState: AudioState | null = null;
  // Incremented by play()/pause()/stop()/seek()/dispose(); lets in-flight work
  // (a play() awaiting a render, the next chunk's scheduling, a source's ended
  // event) detect it was superseded and bail.
  let epoch = 0;

  const getContext = (): AudioContext => {
    // Never create (or resurrect) a live context once disposed.
    if (!context && state !== 'disposed') {
      context = new AudioContextClass();
    }
    return context as AudioContext;
  };

  const events: AudioEvents = options.events || {};

  // Rendered chunks by start frame, oldest first.
  const chunks = new Map<number, Promise<AudioBuffer>>();
  // Renders requested for playback run at most MAX_PLAYBACK_RENDERS at a time.
  // A queued render that no requester wants any more (a later seek/stop
  // superseded them all) never starts, so scrubbing cannot pile up renders.
  type RenderJob = {
    start: number;
    wanted: Array<() => boolean>;
    promise: Promise<AudioBuffer>;
    resolve: (buffer: AudioBuffer) => void;
    reject: (error: unknown) => void;
  };
  const queued: RenderJob[] = [];
  const jobs = new Map<number, RenderJob>();
  let rendering = 0;
  // A render that throws synchronously (e.g. in the OfflineAudioContext
  // constructor) becomes a rejection, so it cannot leak a render slot.
  const safeRender = (start: number): Promise<AudioBuffer> => {
    try {
      return renderChunk(start);
    } catch (err) {
      return Promise.reject(err);
    }
  };
  // Forget a job (and its cached promise) only if they are still this job's;
  // a newer request for the same chunk may have replaced them.
  const forget = (job: RenderJob) => {
    if (jobs.get(job.start) === job) jobs.delete(job.start);
    if (chunks.get(job.start) === job.promise) chunks.delete(job.start);
  };
  const pump = () => {
    while (rendering < MAX_PLAYBACK_RENDERS && queued.length > 0) {
      const job = queued.shift() as RenderJob;
      if (!job.wanted.some((wanted) => wanted())) {
        // Removed from the cache at once, so no later request receives it.
        forget(job);
        job.reject(CANCELLED);
        continue;
      }
      rendering++;
      safeRender(job.start)
        .then(job.resolve, job.reject)
        .finally(() => {
          if (jobs.get(job.start) === job) jobs.delete(job.start);
          rendering--;
          pump();
        });
    }
  };

  // Queues a render in the pool (playback and WAV export share its slots).
  const enqueue = (start: number, wanted: () => boolean): RenderJob => {
    const job = { start, wanted: [wanted] } as RenderJob;
    job.promise = new Promise<AudioBuffer>((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });
    queued.push(job);
    return job;
  };

  // A cached playback render of the chunk at `start`, rendered if needed.
  const getChunk = (start: number, wanted: () => boolean = () => true): Promise<AudioBuffer> => {
    let buffer = chunks.get(start);
    if (buffer) {
      jobs.get(start)?.wanted.push(wanted);
      chunks.delete(start); // re-insert as most recent
    } else {
      const job = enqueue(start, wanted);
      jobs.set(start, job);
      buffer = job.promise;
      const pending = buffer;
      // A failed or cancelled render must not poison the cache.
      pending.catch(() => {
        if (chunks.get(start) === pending) chunks.delete(start);
      });
    }
    chunks.set(start, buffer);
    while (chunks.size > CACHED_CHUNKS) {
      chunks.delete(chunks.keys().next().value as number);
    }
    pump();
    return buffer;
  };

  // Resolves once the first chunk is rendered. A failed render is forgotten so
  // the next play()/getWaveBlob() renders again instead of failing forever.
  let ready: Promise<void> | null = null;
  const whenReady = (): Promise<void> => {
    ready ??= getChunk(0).then(
      () => {
        // Do not signal readiness if disposed meanwhile, and do NOT reset state to
        // 'ready' (the caller may have already stopped/started during rendering).
        if (state !== 'disposed') {
          safeCall(events.onready);
        }
      },
      (err) => {
        ready = null;
        throw err;
      }
    );
    return ready;
  };
  // Render eagerly; a failure surfaces from the next play()/getWaveBlob().
  whenReady().catch(() => {});

  // Fades the current run out and stops its sources once silent. Returns
  // whether there was a run to fade.
  const stopSources = (): boolean => {
    const ctx = context as AudioContext | null;
    const fading = ctx !== null && fader !== null;
    const stopAt = fading ? (ctx as AudioContext).currentTime + LIVE_FADE_SECONDS : 0;
    if (fading) {
      const { gain } = fader as GainNode;
      const now = (ctx as AudioContext).currentTime;
      // The fader's level now, from its fade-in (gain.value can still read the
      // default 1 before the first rendered quantum).
      const level = Math.min(1, Math.max(0, (now - faderStartedAt) / LIVE_FADE_SECONDS));
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(level, now);
      gain.linearRampToValueAtTime(0, stopAt);
      fadeEndsAt = stopAt;
    }
    for (const source of sources) {
      try {
        source.stop(stopAt);
      } catch (e) {
        // Ignore if already stopped
      }
    }
    sources.clear();
    fader = null;
    renderingAhead = false;
    return fading;
  };

  const finish = () => {
    sources.clear();
    fader = null;
    state = 'stopped';
    pausedAt = 0;
    startTime = 0;
    safeCall(events.onended);
  };

  // Starts the chunk at `start` at its place on the playback timeline (startTime
  // is the context time of position 0).
  const scheduleChunk = (start: number, buffer: AudioBuffer, myEpoch: number) => {
    const ctx = context as AudioContext;
    const when = startTime + start / SAMPLE_RATE;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (now > when + 1 / SAMPLE_RATE) {
      // Late (slow render): it starts mid-chunk, so fade it in like a resume.
      const fadeIn = ctx.createGain();
      fadeIn.gain.setValueAtTime(0, now);
      fadeIn.gain.linearRampToValueAtTime(1, now + LIVE_FADE_SECONDS);
      fadeIn.connect(fader as GainNode);
      source.connect(fadeIn);
    } else {
      source.connect(fader as GainNode);
    }
    source.onended = () => {
      sources.delete(source);
      if (epoch !== myEpoch || state !== 'playing') {
        return;
      }
      if (sources.size === 0 && scheduledEnd >= totalFrames) {
        // Natural end follows the audio clock: the last chunk finished playing.
        finish();
      } else {
        scheduleAhead(myEpoch);
      }
    };
    // Starting mid-chunk (play/seek) or late (slow render): skip what has passed.
    source.start(Math.max(when, now), Math.max(0, now - when));
    sources.add(source);
    scheduledEnd = plan.next(start);
  };

  // Keeps one chunk scheduled after the playing one. A failed render is tried
  // again (at once if nothing is playing, else when the playing chunk ends);
  // when it fails again with nothing left to play, playback stops.
  let failedStart = -1;
  const scheduleAhead = (myEpoch: number) => {
    if (renderingAhead || sources.size >= 2 || scheduledEnd >= totalFrames) {
      return;
    }
    const start = scheduledEnd;
    const current = () => epoch === myEpoch && state === 'playing';
    renderingAhead = true;
    getChunk(start, current).then(
      (buffer) => {
        if (current()) {
          renderingAhead = false;
          scheduleChunk(start, buffer, myEpoch);
          scheduleAhead(myEpoch);
        }
      },
      (err) => {
        if (!current()) {
          return;
        }
        renderingAhead = false;
        if (err === CANCELLED) {
          scheduleAhead(myEpoch);
          return;
        }
        console.error(err);
        if (failedStart !== start) {
          failedStart = start;
          if (sources.size === 0) scheduleAhead(myEpoch);
        } else if (sources.size === 0) {
          stop();
        }
      }
    );
  };

  const play = async () => {
    // Already playing or disposed -> nothing to do.
    if (state === 'playing' || state === 'disposed') {
      return;
    }
    // Claim a fresh epoch. Any EARLIER in-flight play() now sees a changed epoch
    // and bails (so concurrent play() calls start exactly once).
    // Create/resume the live context now, inside the caller's user gesture
    // (iOS Safari keeps a context suspended when it is resumed later). If the
    // constructor throws (browsers cap live contexts), nothing has changed yet.
    const ctx = getContext();
    const needsResume = () => (ctx.state as string) === 'suspended' || (ctx.state as string) === 'interrupted';
    const resuming = needsResume() ? ctx.resume() : null;
    // Awaited only if this play() gets that far; never left unhandled.
    resuming?.catch(() => {});
    const myEpoch = ++epoch;
    pendingPlay = true;
    const current = (): boolean => epoch === myEpoch && state !== 'disposed';
    // One retry for a failed render; a superseded play() bails quietly.
    const load = (start: number) => getChunk(start, current).catch(() => (current() ? getChunk(start, current) : Promise.reject(CANCELLED)));
    try {
      const position = pausedAt;
      const chunk = plan.startFor(Math.floor(position * SAMPLE_RATE));
      const next = plan.next(chunk);
      const playing = load(chunk);
      // Close to the end of its chunk, wait for the next one as well, so the
      // playing chunk cannot run out before the next is rendered. If the next
      // one fails, play the current chunk and let scheduleAhead() try again.
      const following =
        next < totalFrames && next / SAMPLE_RATE - position < PREFETCH_SECONDS ? getChunk(next, current).catch(() => null) : null;
      // Combined (and given a handler) at once: the renders may reject while
      // whenReady() is still awaited, which would count as unhandled.
      const renders = Promise.all([playing, following]);
      renders.catch(() => {});
      let rendered: [AudioBuffer, AudioBuffer | null];
      try {
        rendered = await renders;
        // Bail if superseded during the render await (before whenReady(), so a
        // disposed instance never starts another render).
        if (!current()) return;
        // onready (first chunk) fires before onstarted, also when the eager
        // render failed and was retried; a failure here is the playing chunk's
        // render to report, not this one.
        await whenReady().catch(() => {});
        if (!current()) return;
        if (resuming) {
          await resuming;
        }
        if (needsResume()) {
          await ctx.resume();
        }
      } catch (err) {
        if (!current()) return;
        // A failed render or resume. After a seek's resume, playback that was
        // announced as playing stops (onstopped); otherwise the announced state stays.
        if (shownState === 'playing') {
          stop();
        } else if (shownState !== null) {
          state = shownState;
          shownState = null;
        }
        throw err;
      }

      // Re-check after the resume await.
      if (!current()) {
        return;
      }

      startTime = ctx.currentTime - position;
      state = 'playing';
      pendingPlay = false;
      shownState = null;
      failedStart = -1;
      // Fade in, in case playback resumes in the middle of a tone.
      faderStartedAt = ctx.currentTime;
      fader = ctx.createGain();
      fader.gain.setValueAtTime(0, ctx.currentTime);
      fader.gain.linearRampToValueAtTime(1, ctx.currentTime + LIVE_FADE_SECONDS);
      fader.connect(ctx.destination);
      renderingAhead = false;
      scheduleChunk(chunk, rendered[0], myEpoch);
      if (rendered[1]) {
        scheduleChunk(next, rendered[1], myEpoch);
      }
      scheduleAhead(myEpoch);
      safeCall(events.onstarted);
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
      epoch++;
      pendingPlay = false;
      shownState = null;
      pausedAt = Math.min(getContext().currentTime - startTime, totalTime);
      stopSources();
      state = 'paused';
      safeCall(events.onpaused);
      return;
    }

    // An in-flight play() that has not started yet: supersede it (so it bails
    // on resume) and settle into 'paused' rather than dropping the intent.
    if (pendingPlay) {
      epoch++;
      pendingPlay = false;
      shownState = null;
      stopSources();
      state = 'paused';
      safeCall(events.onpaused);
    }
  };

  const stop = (dispose = false) => {
    if (state === 'disposed') {
      return;
    }

    epoch++;
    stopSources();

    // Active = playing, paused, or a play()/seek-resume in flight; in each case
    // the listener believes there is playback to stop.
    const wasActive = state === 'playing' || state === 'paused' || pendingPlay;
    pendingPlay = false;
    shownState = null;
    state = 'stopped';
    pausedAt = 0;
    startTime = 0;

    if (wasActive) {
      safeCall(events.onstopped);
    }

    if (dispose) {
      // Release rendered audio; it re-renders on the next play/export.
      chunks.clear();
    }
  };

  const seek = async (time: number) => {
    if (state === 'disposed') {
      return;
    }

    // Resume afterwards if playback is active or a play() is in flight (so a
    // play() immediately followed by seek() is not silently swallowed).
    const wasActive = state === 'playing' || pendingPlay;
    // Plain-JS callers may pass anything; NaN-like values seek to 0, and
    // ±Infinity clamps to the [0, totalTime] range.
    const requested = Number(time);
    const clampedTime = Number.isNaN(requested) ? 0 : Math.max(0, Math.min(requested, totalTime));

    const seekEpoch = ++epoch;
    stopSources();
    pausedAt = clampedTime;
    if (wasActive) {
      // Internally a resume is pending (so a pause()/stop() from the callback
      // below settles it like any pending play); getState() keeps showing the
      // announced state ('playing', or the state before a pending play()).
      shownState ??= getState();
      state = 'paused';
      pendingPlay = true;
    }
    safeCall(events.onseeked, clampedTime);

    // A callback that paused, stopped or seeked again wins over this resume.
    if (!wasActive || epoch !== seekEpoch) {
      return;
    }
    // A failure is settled by play() itself (stop, or the announced state).
    await play();
  };

  const dispose = () => {
    if (state === 'disposed') {
      return;
    }
    stop(true);
    state = 'disposed';
    const ctx = context as AudioContext | null;
    if (ctx && ctx.state !== 'closed') {
      // Let a stop fade (from this stop() or an earlier stop()/pause()) play out
      // first; a closed context outputs nothing. close() rejects if the caller
      // closed the context already.
      const close = () => ctx.close().catch(() => {});
      const fadeLeft = fadeEndsAt - ctx.currentTime;
      if (fadeLeft > 0) {
        setTimeout(close, fadeLeft * 1000 + 45);
      } else {
        close();
      }
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
    return shownState ?? state;
  };

  // Concurrent calls (e.g. a double click on Download) share one export.
  let exporting: Promise<Blob> | null = null;
  const getWaveBlob = (): Promise<Blob> => {
    if (state === 'disposed') {
      return Promise.reject(new Error('Audio buffer not available'));
    }
    exporting ??= exportWav().finally(() => {
      exporting = null;
    });
    return exporting;
  };

  const exportWav = async (): Promise<Blob> => {
    await whenReady();
    if (state === 'disposed') {
      throw new Error('Audio buffer not available');
    }
    const dataSize = totalFrames * (BITS_PER_SAMPLE / 8) * CHANNELS;
    if (dataSize > MAX_WAV_DATA_BYTES) {
      throw new RangeError('morse-code-translator: audio is too long for a WAV file (about 13.5 hours at most).');
    }
    // Header plus one PCM part per chunk: the Blob never needs one contiguous
    // copy of the whole recording, and each rendered chunk can be released.
    const parts: ArrayBuffer[] = [encodeWAVHeader(SAMPLE_RATE, dataSize)];
    for (let start = 0; start < totalFrames; start = plan.next(start)) {
      // Reuse a playback render when there is one (if playback abandons it
      // meanwhile, render the chunk here); export renders are not cached.
      const render = () => {
        const job = enqueue(start, () => state !== 'disposed');
        pump();
        return job.promise;
      };
      const cached = chunks.get(start);
      const buffer = await (cached ? cached.catch((err) => (err === CANCELLED ? render() : Promise.reject(err))) : render());
      parts.push(floatTo16BitPCM(buffer.getChannelData(0)));
    }
    return new Blob(parts, { type: 'audio/wav' });
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
  } as Omit<AudioResult, 'context'>;

  // Context access (for advanced users); created lazily on first access. Defined
  // as a NON-enumerable getter so object spread / JSON.stringify / Object.keys do
  // not accidentally allocate a live AudioContext (browsers cap how many exist).
  Object.defineProperty(result, 'context', {
    get: getContext,
    enumerable: false,
    configurable: true,
  });

  return result as AudioResult;
};

export default audio;
