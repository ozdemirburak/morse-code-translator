import { vi } from 'vitest';

interface MockAudioBuffer {
  duration: number;
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  getChannelData: () => Float32Array;
}

interface MockOscillator {
  type: string;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

interface MockGainNode {
  gain: {
    value: number;
    setValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
}

interface MockBufferSource {
  buffer: AudioBuffer | null;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

// Mock Web Audio API for testing
const createMockAudioBuffer = (): MockAudioBuffer => ({
  duration: 1.0,
  length: 44100,
  numberOfChannels: 1,
  sampleRate: 44100,
  getChannelData: () => new Float32Array(44100)
});

const createMockOscillator = (): MockOscillator => ({
  type: 'sine',
  frequency: { value: 500 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null
});

const createMockGainNode = (): MockGainNode => ({
  gain: {
    value: 1,
    setValueAtTime: vi.fn()
  },
  connect: vi.fn()
});

const createMockBufferSource = (): MockBufferSource => ({
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null
});

class MockOfflineAudioContext {
  sampleRate: number;
  destination: object;
  oncomplete: ((event: { renderedBuffer: MockAudioBuffer }) => void) | null;
  onerror: ((error: Error) => void) | null;
  private _oscillator: MockOscillator;
  private _gainNode: MockGainNode;

  constructor(_numberOfChannels: number, _length: number, sampleRate?: number) {
    this.sampleRate = sampleRate || 44100;
    this.destination = {};
    this.oncomplete = null;
    this.onerror = null;
    this._oscillator = createMockOscillator();
    this._gainNode = createMockGainNode();
  }

  createOscillator(): MockOscillator {
    return this._oscillator;
  }

  createGain(): MockGainNode {
    return this._gainNode;
  }

  startRendering(): Promise<void> {
    // Simulate async rendering
    return Promise.resolve().then(() => {
      if (this.oncomplete) {
        this.oncomplete({
          renderedBuffer: createMockAudioBuffer()
        });
      }
    });
  }

  addEventListener(event: string, callback: (error: Error) => void): void {
    if (event === 'error') {
      this.onerror = callback;
    }
  }
}

class MockAudioContext {
  currentTime: number;
  state: string;
  destination: object;

  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }

  createBufferSource(): MockBufferSource {
    return createMockBufferSource();
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }
}

// Set up global mocks
declare const global: {
  window: {
    AudioContext?: typeof MockAudioContext;
    OfflineAudioContext?: typeof MockOfflineAudioContext;
  };
};

global.window = global.window || {};
global.window.AudioContext = MockAudioContext;
global.window.OfflineAudioContext = MockOfflineAudioContext;

// Mock URL.createObjectURL
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
}
