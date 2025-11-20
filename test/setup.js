import { vi } from 'vitest';

// Mock Web Audio API for testing
const createMockAudioBuffer = () => ({
  duration: 1.0,
  length: 44100,
  numberOfChannels: 1,
  sampleRate: 44100,
  getChannelData: () => new Float32Array(44100)
});

const createMockOscillator = () => ({
  type: 'sine',
  frequency: { value: 500 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null
});

const createMockGainNode = () => ({
  gain: {
    value: 1,
    setValueAtTime: vi.fn()
  },
  connect: vi.fn()
});

const createMockBufferSource = () => ({
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null
});

class MockOfflineAudioContext {
  constructor(numberOfChannels, length, sampleRate) {
    this.sampleRate = sampleRate || 44100;
    this.destination = {};
    this.oncomplete = null;
    this._oscillator = createMockOscillator();
    this._gainNode = createMockGainNode();
  }

  createOscillator() {
    return this._oscillator;
  }

  createGain() {
    return this._gainNode;
  }

  startRendering() {
    // Simulate async rendering
    return Promise.resolve().then(() => {
      if (this.oncomplete) {
        this.oncomplete({
          renderedBuffer: createMockAudioBuffer()
        });
      }
    });
  }

  addEventListener(event, callback) {
    if (event === 'error') {
      this.onerror = callback;
    }
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }

  createBufferSource() {
    return createMockBufferSource();
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }

  async close() {
    this.state = 'closed';
  }
}

// Set up global mocks
global.window = global.window || {};
global.window.AudioContext = MockAudioContext;
global.window.OfflineAudioContext = MockOfflineAudioContext;

// Mock URL.createObjectURL
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
}
