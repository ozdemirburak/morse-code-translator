/// <reference lib="dom" preserve="true" />

export type Characters = {
  [key: string]: Record<string, string>;
};

/** Built-in OscillatorNode waveforms ('custom' needs a PeriodicWave and is not supported). */
export type OscillatorWaveform = Exclude<OscillatorType, 'custom'>;

export interface Oscillator {
  type?: OscillatorWaveform;
  frequency?: number;
}

export interface Options {
  dash: string;
  dot: string;
  space: string;
  separator: string;
  invalid: string;
  priority: number;
  wpm?: number;
  unit: number;
  fwUnit: number;
  volume: number;
  oscillator: Oscillator;
  events?: AudioEvents;
}

/** Options accepted by encode(), decode(), characters() and audio(); every field is optional. */
export type MorseOptions = Partial<Omit<Options, 'oscillator' | 'priority'>> & {
  /** Character set searched first, 1-12; a decimal string such as a `<select>` value ('5') also works. */
  priority?: number | string;
  oscillator?: Oscillator;
};

export type AudioState = 'playing' | 'paused' | 'stopped' | 'ready' | 'disposed';

export interface AudioEvents {
  onstarted?: () => void;
  onpaused?: () => void;
  onstopped?: () => void;
  onended?: () => void;
  onready?: () => void;
  onseeked?: (time: number) => void;
}

export interface AudioResult {
  // Playback control
  readonly play: () => Promise<void>;
  readonly pause: () => void;
  /** Stops playback; with dispose = true also releases the rendered audio (it re-renders on the next play/export). */
  readonly stop: (dispose?: boolean) => void;
  readonly seek: (time: number) => Promise<void>;
  readonly dispose: () => void;

  // Playback information
  readonly getCurrentTime: () => number;
  readonly getTotalTime: () => number;
  readonly getState: () => AudioState;

  // Export functionality
  readonly getWaveBlob: () => Promise<Blob>;
  readonly getWaveUrl: () => Promise<string>;
  readonly exportWave: (filename?: string) => Promise<void>;

  /** The live playback AudioContext, created on first access; null after dispose() if never created. */
  readonly context: AudioContext | null;
}
