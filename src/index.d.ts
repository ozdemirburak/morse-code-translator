interface Window {
  webkitAudioContext: typeof AudioContext
  webkitOfflineAudioContext: typeof OfflineAudioContext
}

type Characters = Record<string, Record<string, string>>

interface Oscillator {
  type?: OscillatorType;
  frequency?: number;
  onended?: ((this: AudioScheduledSourceNode, ev: Event) => any) | null;
}

interface Options {
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
  oscillator: Oscillator
}
