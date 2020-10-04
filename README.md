# [Morse Code Translator](https://morsedecoder.com) with Audio - Morsify

[![npm-version]][npm] [![npm-downloads]][npm] [![travis-ci]][travis]

Morsify is a Morse code encoder and decoder with no dependencies. Currently, it supports Latin, Cyrillic, Greek, Hebrew, Arabic,
Persian, Japanese, Korean, and Thai, with audio-generation functionality using the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).

## Installation

### npm

```bash
$ npm install morsify --save
```

### yarn

```bash
$ yarn add morsify
```

## Usage

```js
const morsify = require('morsify');
const encoded = morsify.encode('SOS'); // ... --- ...
const decoded = morsify.decode('... --- ...'); // SOS
const characters = morsify.characters(); // {'1': {'A': '.-', ...}, ..., '11': {'ㄱ': '.-..', ...}}
const audio = morsify.audio('SOS');
audio.play(); // play audio
audio.stop(); // stop audio
```

Alternatively, you can use the library directly with including the source file.

```html
<script src="https://rawgit.com/ozdemirburak/morsify/master/dist/morsify.min.js"></script>
<script>
    var encoded = morsify.encode('SOS'); // ... --- ...
    var decoded = morsify.decode('... --- ...'); // SOS
    var characters = morsify.characters(); // {'1': {'A': '.-', ...}, ..., '11': {'ㄱ': '.-..', ...}}
    var audio = morsify.audio('SOS');
    var oscillator = audio.oscillator; // OscillatorNode
    var context = audio.context; // AudioContext
    var gainNode = audio.gainNode; // GainNode
    audio.play(); // play audio
    audio.stop(); // stop audio
</script>
```

## Options and Localization

You can customize the dash, dot, or space characters and specify the alphabet with the priority option for
an accurate encoding and decoding.

The priority option gives direction to the plugin to start searching for the given character set first.

Set the priority option according to the list below.

- 1 => ASCII (Default)
- 2 => Numbers
- 3 => Punctuation
- 4 => Latin Extended (Turkish, Polish etc.)
- 5 => Cyrillic
- 6 => Greek
- 7 => Hebrew
- 8 => Arabic
- 9 => Persian
- 10 => Japanese
- 11 => Korean
- 12 => Thai

```js
const cyrillic = morsify.encode('Ленинград', { priority: 5 }); // .-.. . -. .. -. --. .-. .- -..
const greek = morsify.decode('... .- --. .- .--. .--', { priority: 6 }); // ΣΑΓΑΠΩ
const hebrew = morsify.decode('.. ––– . –––', { dash: '–', dot: '.', priority: 7 }); // יהוה
const japanese = morsify.encode('NEWS', { priority: 10, dash: '－', dot: '・', separator: '　' }); // －・　・　・－－　・・・
const characters = morsify.characters({ dash: '–', dot: '•' }); // {'1': {'A': '•–', ...}, ..., '11': {'ㄱ': '•–••', ...}}
const arabicAudio = morsify.audio('البراق', { // generates the Morse .- .-.. -... .-. .- --.- then generates the audio from it
  unit: 0.1, // period of one unit, in seconds, 1.2 / c where c is speed of transmission, in words per minute
  fwUnit: 0.1, // period of one Farnsworth unit to control intercharacter and interword gaps
  oscillator: {
    type: 'sine', // sine, square, sawtooth, triangle
    frequency: 500,  // value in hertz
    onended: function () { // event that fires when the tone stops playing
      console.log('ended');
    }
  }
});
const oscillator = arabicAudio.oscillator; // OscillatorNode
const context = arabicAudio.context; // AudioContext;
const gainNode = arabicAudio.gainNode; // GainNode
arabicAudio.play(); // will start playing Morse audio
arabicAudio.stop(); // will stop playing Morse audio
```

## Contributing and Known Issues

Contributions are welcome.

## Generating Minified Files

Install node and npm and run the commands below.

``` bash
$ npm install --global gulp-cli
$ npm install
$ gulp
```

## License
The MIT License (MIT). Please see [License File](LICENSE) for more information.

  [npm-version]: https://img.shields.io/npm/v/morsify.svg?style=flat-square
  [npm-downloads]: https://img.shields.io/npm/dm/morsify.svg?style=flat-square
  [travis-ci]: https://img.shields.io/travis/ozdemirburak/morsify/master.svg?style=flat-square

  [npm]: https://www.npmjs.com/package/morsify
  [travis]: https://travis-ci.org/ozdemirburak/morsify
