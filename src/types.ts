export interface Window {
  webkitAudioContext: typeof AudioContext;
  webkitOfflineAudioContext: typeof OfflineAudioContext;
}

export type Characters = {
  [key: string]: Record<string, string>;
};

export interface Oscillator {
  type?: OscillatorType;
  frequency?: number;
  // Deprecated: Use audio.events.onended instead
  onended?: ((this: AudioScheduledSourceNode, ev: Event) => any) | null;
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

export type AudioState = 'playing' | 'paused' | 'stopped' | 'ready';

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
  play: () => Promise<void>;
  pause: () => void;
  stop: (dispose?: boolean) => void;
  seek: (time: number) => Promise<void>;
  dispose: () => void;

  // Playback information
  getCurrentTime: () => number;
  getTotalTime: () => number;
  getState: () => AudioState;

  // Export functionality
  getWaveBlob: () => Promise<Blob>;
  getWaveUrl: () => Promise<string>;
  exportWave: (filename?: string) => Promise<void>;

  // Context access (for advanced users)
  context: AudioContext;
  oscillator: OscillatorNode;
  gainNode: GainNode;
}
