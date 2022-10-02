interface Window {
  webkitAudioContext: typeof AudioContext
  webkitOfflineAudioContext: typeof OfflineAudioContext
}

interface Characters { [key: string]: { [key: string ]: string } }

interface Oscillator {
  type?: OscillatorType;
  frequency?: number;
  onended?: (this: AudioScheduledSourceNode, ev: Event) => any | null;
}

interface Options {
  dash: string;
  dot: string;
  space: string;
  separator: string;
  invalid: string;
  priority: number;
  unit: number;
  fwUnit: number;
  oscillator: Oscillator
}
