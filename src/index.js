;(((name, root, factory) => {
  if (typeof exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root[name] = factory();
  }
})('morse-decoder', this, () => {
  'use strict';

  const characters = {
    '1': { // Latin => https://en.wikipedia.org/wiki/Morse_code
      'A': '01', 'B': '1000', 'C': '1010', 'D': '100', 'E': '0', 'F': '0010',
      'G': '110', 'H': '0000', 'I': '00', 'J': '0111', 'K': '101', 'L': '0100',
      'M': '11', 'N': '10', 'O': '111', 'P': '0110', 'Q': '1101', 'R': '010',
      'S': '000', 'T': '1', 'U': '001', 'V': '0001', 'W': '011', 'X': '1001',
      'Y': '1011', 'Z': '1100'
    },
    '2': { // Numbers
      '0': '11111', '1': '01111', '2': '00111', '3': '00011', '4': '00001',
      '5': '00000', '6': '10000', '7': '11000', '8': '11100', '9': '11110'
    },
    '3': { // Punctuation
      '.': '010101', ',': '110011', '?': '001100', '\'': '011110', '!': '101011', '/': '10010',
      '(': '10110', ')': '101101', '&': '01000', ':': '111000', ';': '101010', '=': '10001',
      '+': '01010', '-': '100001', '_': '001101', '"': '010010', '$': '0001001', '@': '011010',
      '¿': '00101', '¡': '110001'
    },
    '4': { // Latin Extended => https://ham.stackexchange.com/questions/1379/international-characters-in-morse-code
      'Ã': '01101', 'Á': '01101', 'Å': '01101', 'À': '01101', 'Â': '01101', 'Ä': '0101',
      'Ą': '0101', 'Æ': '0101', 'Ç': '10100', 'Ć': '10100', 'Ĉ': '10100', 'Č': '110',
      'Ð': '00110', 'È': '01001', 'Ę': '00100', 'Ë': '00100', 'É': '00100',
      'Ê': '10010', 'Ğ': '11010', 'Ĝ': '11010', 'Ĥ': '1111', 'İ': '01001', 'Ï': '10011',
      'Ì': '01110', 'Ĵ': '01110', 'Ł': '01001', 'Ń': '11011', 'Ñ': '11011', 'Ó': '1110',
      'Ò': '1110', 'Ö': '1110', 'Ô': '1110', 'Ø': '1110', 'Ś': '0001000', 'Ş': '01100',
      'Ș': '1111', 'Š': '1111', 'Ŝ': '00010', 'ß': '000000', 'Þ': '01100', 'Ü': '0011',
      'Ù': '0011', 'Ŭ': '0011', 'Ž': '11001', 'Ź': '110010', 'Ż': '11001'
    },
    '5': { // Cyrillic Alphabet => https://en.wikipedia.org/wiki/Russian_Morse_code
      'А': '01', 'Б': '1000', 'В': '011', 'Г': '110', 'Д': '100', 'Е': '0',
      'Ж': '0001', 'З': '1100', 'И': '00', 'Й': '0111', 'К': '101','Л': '0100',
      'М': '11', 'Н': '10', 'О': '111', 'П': '0110', 'Р': '010', 'С': '000',
      'Т': '1', 'У': '001', 'Ф': '0010', 'Х': '0000', 'Ц': '1010', 'Ч': '1110',
      'Ш': '1111', 'Щ': '1101', 'Ъ': '11011', 'Ы': '1011', 'Ь': '1001', 'Э': '00100',
      'Ю': '0011', 'Я': '0101', 'Ї': '01110', 'Є': '00100', 'І': '00', 'Ґ': '110'
    },
    '6': { // Greek Alphabet => https://en.wikipedia.org/wiki/Morse_code_for_non-Latin_alphabets
      'Α': '01', 'Β':'1000', 'Γ':'110', 'Δ':'100', 'Ε':'0', 'Ζ':'1100',
      'Η':'0000', 'Θ':'1010', 'Ι': '00', 'Κ': '101', 'Λ': '0100', 'Μ': '11',
      'Ν': '10', 'Ξ': '1001', 'Ο': '111', 'Π': '0110', 'Ρ': '010', 'Σ':'000',
      'Τ':'1', 'Υ': '1011', 'Φ':'0010', 'Χ': '1111', 'Ψ': '1101', 'Ω':'011'
    },
    '7': { // Hebrew Alphabet => https://en.wikipedia.org/wiki/Morse_code_for_non-Latin_alphabets
      'א': '01', 'ב': '1000', 'ג': '110', 'ד': '100', 'ה': '111', 'ו': '0',
      'ז': '1100', 'ח': '0000', 'ט': '001', 'י': '00', 'כ': '101', 'ל': '0100',
      'מ': '11', 'נ': '10', 'ס': '1010', 'ע': '0111', 'פ': '0110', 'צ': '011',
      'ק': '1101', 'ר': '010', 'ש': '000', 'ת': '1'
    },
    '8': { // Arabic Alphabet => https://en.wikipedia.org/wiki/Morse_code_for_non-Latin_alphabets
      'ا': '01', 'ب': '1000', 'ت': '1', 'ث': '1010', 'ج': '0111', 'ح': '0000',
      'خ': '111', 'د': '100', 'ذ': '1100', 'ر': '010', 'ز': '1110', 'س': '000',
      'ش': '1111', 'ص': '1001', 'ض': '0001', 'ط': '001', 'ظ': '1011', 'ع': '0101',
      'غ': '110', 'ف': '0010', 'ق': '1101', 'ك': '101', 'ل': '0100', 'م':	'11',
      'ن':	'10', 'ه':	'00100', 'و':	'011', 'ي':	'00', 'ﺀ':	'0'
    },
    '9': { // Persian Alphabet => https://en.wikipedia.org/wiki/Morse_code_for_non-Latin_alphabets
      'ا': '01', 'ب': '1000', 'پ': '0110', 'ت': '1', 'ث': '1010', 'ج': '0111',
      'چ': '1110', 'ح': '0000', 'خ' : '1001', 'د': '100', 'ذ': '0001', 'ر': '010',
      'ز': '1100', 'ژ': '110', 'س': '000', 'ش': '1111', 'ص': '0101', 'ض': '00100',
      'ط': '001', 'ظ': '1011', 'ع': '111', 'غ': '0011', 'ف': '0010', 'ق': '111000',
      'ک': '101', 'گ': '1101', 'ل': '0100', 'م': '11', 'ن': '10', 'و': '011',
      'ه': '0', 'ی': '00'
    },
    '10': { // Japanese Alphabet => https://ja.wikipedia.org/wiki/%E3%83%A2%E3%83%BC%E3%83%AB%E3%82%B9%E7%AC%A6%E5%8F%B7#%E5%92%8C%E6%96%87%E3%83%A2%E3%83%BC%E3%83%AB%E3%82%B9%E7%AC%A6%E5%8F%B7
      'ア': '11011', 'カ': '0100', 'サ': '10101', 'タ': '10',	'ナ': '010', 'ハ': '1000',
      'マ': '1001', 'ヤ': '011', 'ラ': '000', 'ワ': '101', 'イ': '01', 'キ': '10100',
      'シ': '11010', 'チ': '0010', 'ニ': '1010', 'ヒ': '11001', 'ミ': '00101', 'リ': '110',
      'ヰ': '01001', 'ウ': '001', 'ク': '0001', 'ス': '11101', 'ツ': '0110', 'ヌ': '0000',
      'フ': '1100', 'ム': '1', 'ユ': '10011', 'ル': '10110', 'ン': '01010', 'エ': '10111',
      'ケ': '1011', 'セ': '01110', 'テ': '01011', 'ネ': '1101', 'ヘ': '0', 'メ': '10001',
      'レ': '111', 'ヱ': '01100', 'オ': '01000', 'コ': '1111', 'ソ':'1110', 'ト': '00100',
      'ノ': '0011', 'ホ': '100', 'モ': '10010', 'ヨ': '11', 'ロ': '0101', 'ヲ': '0111',
      '゛': '00', '゜': '00110', '。': '010100',  'ー': '01101', '、': '010101',
      '（': '101101', '）': '010010'
    },
    '11': { // Korean Alphabet => https://en.wikipedia.org/wiki/SKATS
      'ㄱ': '0100', 'ㄴ': '0010', 'ㄷ': '1000', 'ㄹ': '0001', 'ㅁ': '11', 'ㅂ': '011',
      'ㅅ': '110', 'ㅇ': '101', 'ㅈ': '0110', 'ㅊ': '1010', 'ㅋ': '1001', 'ㅌ': '1100',
      'ㅍ': '111', 'ㅎ': '0111', 'ㅏ': '0', 'ㅑ': '00', 'ㅓ': '1', 'ㅕ': '000',
      'ㅗ': '01', 'ㅛ': '10', 'ㅜ': '0000', 'ㅠ': '010', 'ㅡ': '100', 'ㅣ': '001'
    },
    '12' : { // Thai Alphabet => https://th.wikipedia.org/wiki/รหัสมอร์ส
      'ก': '110', 'ข': '1010', 'ค': '101', 'ง': '10110', 'จ': '10010',
      'ฉ': '1111', 'ช': '1001', 'ซ': '1100', 'ญ': '0111', 'ด': '100',
      'ต': '1', 'ถ': '10100', 'ท': '10011', 'น': '10', 'บ': '1000',
      'ป': '0110', 'ผ':'1101', 'ฝ': '10101', 'พ': '01100', 'ฟ': '0010',
      'ม': '11', 'ย': '1011', 'ร': '010', 'ล': '0100', 'ว': '011',
      'ส': '000', 'ห': '0000', 'อ': '10001', 'ฮ': '11011', 'ฤ': '01011',
      'ะ': '01000', 'า': '01', 'ิ': '00100', 'ี': '00', 'ึ': '00110',
      'ื': '0011', 'ุ': '00101', 'ู': '1110', 'เ': '0', 'แ': '0101',
      'ไ': '01001', 'โ': '111', 'ำ': '00010', '่': '001', '้': '0001',
      '๊': '11000', '๋':'01010',  'ั': '01101', '็': '11100', '์': '11001',
      'ๆ': '10111', 'ฯ': '11010'
    }
  };

  const getCharacters = (opts, usePriority) => {
    const options = getOptions(opts);
    const mapped = {};
    for (const set in characters) {
      mapped[set] = {};
      for (const key in characters[set]) {
        mapped[set][key] = characters[set][key].replace(/0/g, options.dot).replace(/1/g, options.dash);
      }
    }
    if (usePriority !== true) {
      delete mapped[0];
    }
    return mapped;
  };

  const swapCharacters = (options) => {
    const swapped = {};
    const mappedCharacters = getCharacters(options, true);
    for (const set in mappedCharacters) {
      for (const key in mappedCharacters[set]) {
        if (typeof swapped[mappedCharacters[set][key]] === 'undefined') {
          swapped[mappedCharacters[set][key]] = key;
        }
      }
    }
    return swapped;
  };

  const getOptions = (options) => {
    options = options || {};
    options.oscillator = options.oscillator || {};
    options = {
      dash: options.dash || '-',
      dot: options.dot || '.',
      space: options.space || '/',
      separator: options.separator || ' ',
      invalid: options.invalid || '#',
      priority: options.priority || 1,
      unit: options.unit || 0.08, // period of one unit, in seconds, 1.2 / c where c is speed of transmission, in words per minute
      fwUnit: options.fwUnit || options.unit || 0.08, // Farnsworth unit to control intercharacter and interword gaps
      oscillator: {
        type: options.oscillator.type || 'sine', // sine, square, sawtooth, triangle
        frequency: options.oscillator.frequency || 500,  // value in hertz
        onended: options.oscillator.onended || null  // event that fires when the tone has stopped playing
      }
    };
    characters[1][options.separator] = options.space;
    characters[0] = characters[options.priority];
    return options;
  };

  const encode = (text, opts) => {
    const options = getOptions(opts);
    return [...text.replace(/\s+/g, options.separator).trim().toLocaleUpperCase()].map(function(character) {
      for (let set in characters) {
        if (typeof characters[set] !== 'undefined' && typeof characters[set][character] !== 'undefined') {
          return characters[set][character];
        }
      }
      return options.invalid;
    }).join(options.separator).replace(/0/g, options.dot).replace(/1/g, options.dash);
  };

  const decode = (morse, opts) => {
    const options = getOptions(opts), swapped = swapCharacters(options);
    return morse.replace(/\s+/g, options.separator).trim().split(options.separator).map(function(characters) {
      if (typeof swapped[characters] !== 'undefined') {
        return swapped[characters];
      }
      return options.invalid;
    }).join('');
  };

  const getGainTimings = (morse, opts, currentTime = 0) => {
    let timings = [];
    let time = 0;

    timings.push([0, time]);

    const tone = (i) => {
      timings.push([1, currentTime + time]);
      time += i * opts.unit;
    };

    const silence = (i) => {
      timings.push([0, currentTime + time]);
      time += i * opts.unit;
    };

    const gap = (i) => {
      timings.push([0, currentTime + time]);
      time += i * opts.fwUnit;
    };

    for (let i = 0; i <= morse.length; i++) {
      if (morse[i] === opts.space) {
        gap(7);
      } else if (morse[i] === opts.dot) {
        tone(1);
        silence(1);
      } else if (morse[i] === opts.dash) {
        tone(3);
        silence(1);
      } else if (
        (typeof morse[i + 1] !== 'undefined' && morse[i + 1] !== opts.space) &&
        (typeof morse[i - 1] !== 'undefined' && morse[i - 1] !== opts.space)
      ) {
        gap(3);
      }
    }

    return [timings, time];
  };

  // Source: https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js#L155
  const encodeWAV = (sampleRate, samples) => {
    let buffer = new ArrayBuffer(44 + samples.length * 2);
    let view = new DataView(buffer);
    const writeString = (view, offset, string) => {
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
    const floatTo16BitPCM = (output, offset, input) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    };
    floatTo16BitPCM(view, 44, samples);
    return view;
  };

  const audio = (text, opts, morseString) => {
    let AudioContext = null;
    let OfflineAudioContext = null;
    let context = null;
    let offlineContext = null;
    let source;

    const options = getOptions(opts);
    const morse = morseString || encode(text, opts);
    const [gainValues, totalTime] = getGainTimings(morse, options);

    if (AudioContext === null && typeof window !== 'undefined') {
      AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      source = context.createBufferSource();
      source.connect(context.destination);
    }

    if (OfflineAudioContext === null && typeof window !== 'undefined') {
      OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      offlineContext = new OfflineAudioContext(1, 44100 * totalTime, 44100);
    }

    const oscillator = offlineContext.createOscillator();
    const gainNode = offlineContext.createGain();

    oscillator.type = options.oscillator.type;
    oscillator.frequency.value = options.oscillator.frequency;

    gainValues.forEach(([value, time]) => gainNode.gain.setValueAtTime(value, time));

    oscillator.connect(gainNode);
    gainNode.connect(offlineContext.destination);
    source.onended = options.oscillator.onended;

    // Inspired by: http://joesul.li/van/tale-of-no-clocks/
    let render = new Promise(resolve => {
      oscillator.start(0);
      offlineContext.startRendering();
      offlineContext.oncomplete = (e) => {
        source.buffer = e.renderedBuffer;
        resolve();
      };
    });

    let timeout;

    const play = async () => {
      await render;
      source.start(context.currentTime);
      timeout = setTimeout(() => stop(), totalTime * 1000);
    };

    const stop = () => {
      clearTimeout(timeout);
      timeout = 0;
      source.stop(0);
    };

    const getWaveBlob = async () => {
      await render;
      const waveData = encodeWAV(offlineContext.sampleRate, source.buffer.getChannelData(0));
      return new Blob([waveData], { 'type': 'audio/wav' });
    };

    const getWaveUrl = async () => {
      const audioBlob = await getWaveBlob();
      return URL.createObjectURL(audioBlob);
    };

    const exportWave = async (filename) => {
      let waveUrl = await getWaveUrl();
      let anchor = document.createElement('a');
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

  return {
    characters: getCharacters,
    decode,
    encode,
    audio
  };
}));
