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
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    cancelScheduledValues: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
}

interface MockBufferSource {
  buffer: MockAudioBuffer | null;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  // Context time at which the source finishes playing its buffer (set by start).
  endsAt: number | null;
  ended: boolean;
}

// Mock Web Audio API for testing. The rendered buffer has the requested length
// (silent; allocated lazily so long renders stay cheap).
const createMockAudioBuffer = (length: number, sampleRate: number): MockAudioBuffer => {
  let data: Float32Array | null = null;
  return {
    duration: length / sampleRate,
    length,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: () => (data ??= new Float32Array(length))
  };
};

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
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn()
  },
  connect: vi.fn()
});

const endSource = (source: MockBufferSource): void => {
  if (!source.ended) {
    source.ended = true;
    // Browsers dispatch 'ended' asynchronously.
    queueMicrotask(() => source.onended?.());
  }
};

const createMockBufferSource = (ctx: MockAudioContext): MockBufferSource => {
  const source: MockBufferSource = {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn((when = 0, offset = 0) => {
      const duration = source.buffer ? source.buffer.duration : 0;
      source.endsAt = Math.max(when, ctx.currentTime) + Math.max(0, duration - offset);
      ctx.sources.push(source);
    }),
    stop: vi.fn(() => endSource(source)),
    onended: null,
    endsAt: null,
    ended: false
  };
  return source;
};

// Every render context the library creates, so tests can inspect the nodes of a
// render (see test/helpers.ts).
const offlineRenders: MockOfflineAudioContext[] = [];

class MockOfflineAudioContext {
  sampleRate: number;
  destination: object;
  length: number;
  private _oscillator: MockOscillator;
  private _gainNode: MockGainNode;

  constructor(_numberOfChannels: number, _length: number, sampleRate?: number) {
    // Match real browsers, which throw when the buffer length is < 1 frame.
    if (!_length || _length < 1) {
      throw new Error('Failed to construct \'OfflineAudioContext\': length must be at least 1.');
    }
    this.sampleRate = sampleRate || 44100;
    this.length = _length;
    this.destination = {};
    this._oscillator = createMockOscillator();
    this._gainNode = createMockGainNode();
    offlineRenders.push(this);
  }

  createOscillator(): MockOscillator {
    return this._oscillator;
  }

  createGain(): MockGainNode {
    return this._gainNode;
  }

  startRendering(): Promise<MockAudioBuffer> {
    // Simulate async rendering.
    return Promise.resolve().then(() => createMockAudioBuffer(this.length, this.sampleRate));
  }
}

// The clock only moves when a test calls advance(seconds), and never while the
// context is suspended (like the real audio clock).
class MockAudioContext {
  currentTime: number;
  state: string;
  destination: object;
  sources: MockBufferSource[];

  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
    this.sources = [];
  }

  createBufferSource(): MockBufferSource {
    return createMockBufferSource(this);
  }

  createGain(): MockGainNode {
    return createMockGainNode();
  }

  advance(seconds: number): void {
    if (this.state !== 'running') {
      return;
    }
    this.currentTime += seconds;
    for (const source of this.sources) {
      if (source.endsAt !== null && source.endsAt <= this.currentTime + 1e-9) {
        endSource(source);
      }
    }
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
(globalThis as unknown as { __offlineRenders: MockOfflineAudioContext[] }).__offlineRenders = offlineRenders;
global.window.AudioContext = MockAudioContext;
global.window.OfflineAudioContext = MockOfflineAudioContext;
