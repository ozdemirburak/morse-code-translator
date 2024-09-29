const getGainTimings = (morse: string, opts: Options, currentTime = 0): [[[number, number]?], number] => {
  const timings: [[number, number]?] = [];
  let {unit, fwUnit} = opts;
  let time = 0;

  if (opts.wpm) {
    // wpm mode uses standardised units
    unit = fwUnit = 60 / (opts.wpm * 50)
  }

  timings.push([0, time]);

  const tone = (i: number) => {
    timings.push([1 * (opts.volume / 100.0), currentTime + time]);
    time += i * unit;
  };

  const silence = (i: number) => {
    timings.push([0, currentTime + time]);
    time += i * unit;
  };

  const gap = (i: number) => {
    timings.push([0, currentTime + time]);
    time += i * fwUnit;
  };

  for (let i = 0, addSilence = false; i <= morse.length; i++) {
    if (morse[i] === opts.space) {
      gap(7);
      addSilence = false;
    } else if (morse[i] === opts.dot) {
      if (addSilence) silence(1); else addSilence = true;
      tone(1);
    } else if (morse[i] === opts.dash) {
      if (addSilence) silence(1); else addSilence = true;
      tone(3);
    } else if (
      (typeof morse[i + 1] !== 'undefined' && morse[i + 1] !== opts.space) &&
      (typeof morse[i - 1] !== 'undefined' && morse[i - 1] !== opts.space)
    ) {
      gap(3);
      addSilence = false;
    }
  }

  return [timings, time];
};

// Source: https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js#L155
const encodeWAV = (sampleRate: number, samples: Float32Array) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 4, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);
  // to PCM
  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };
  floatTo16BitPCM(view, 44, samples);
  return view;
};

const audio = (morse: string, options: Options) => {
  let AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  let OfflineAudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

  if (!AudioContextClass || !OfflineAudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser');
  }

  const context = new AudioContextClass();
  const [gainValues, totalTime] = getGainTimings(morse, options);
  const offlineContext = new OfflineAudioContextClass(1, 44100 * totalTime, 44100);

  const oscillator = offlineContext.createOscillator();
  const gainNode = offlineContext.createGain();

  oscillator.type = options.oscillator.type as OscillatorType;
  oscillator.frequency.value = options.oscillator.frequency;

  gainValues.forEach(([value, time]) => gainNode.gain.setValueAtTime(value, time));

  oscillator.connect(gainNode);
  gainNode.connect(offlineContext.destination);

  let source: AudioBufferSourceNode;

  // Render the audio buffer
  const render = new Promise<void>((resolve, reject) => {
    oscillator.start(0);
    offlineContext.startRendering();
    offlineContext.oncomplete = (e) => {
      try {
        source = context.createBufferSource();
        source.buffer = e.renderedBuffer;
        source.connect(context.destination);
        source.onended = options.oscillator.onended;
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    offlineContext.onerror = (err) => {
      reject(err);
    };
  });

  let timeout: number;

  const play = async () => {
    await render;
    if (context.state === 'suspended') {
      await context.resume();
    }
    source.start(context.currentTime);
    timeout = window.setTimeout(() => { stop(); }, totalTime * 1000);
  };

  const stop = () => {
    clearTimeout(timeout);
    if (source) {
      source.stop(0);
    }
  };

  const getWaveBlob = async () => {
    await render;
    const waveData = encodeWAV(offlineContext.sampleRate, source.buffer.getChannelData(0));
    return new Blob([waveData], { type: 'audio/wav' });
  };

  const getWaveUrl = async () => {
    const audioBlob = await getWaveBlob();
    return URL.createObjectURL(audioBlob);
  };

  const exportWave = async (filename: string) => {
    const waveUrl = await getWaveUrl();
    const anchor = document.createElement('a');
    anchor.href = waveUrl;
    anchor.target = '_blank';
    anchor.download = filename || 'morse.wav';
    anchor.click();
  };

  return {
    play,
    stop,
    getWaveBlob,
    getWaveUrl,
    exportWave,
    context,
    oscillator,
    gainNode
  };
};

export default audio;
