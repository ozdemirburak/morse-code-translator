# morsify

[![npm-version]][npm] [![npm-downloads]][npm] [![travis-ci]][travis]

Morse code encoder and decoder with no dependencies supports Latin, Cyrilic, Greek, Hebrew, 
Arabic, Persian, Japanese, and Korean characters with audio generation functionality.

## Install
```bash
$ npm install morsify --save
```

## Usage

```js
var morsify = require('morsify');

morsify.encode('SOS'); // .../---/... 
morsify.decode('.../---/...'); // S O S
morsify.audio('SOS') // will return base64 encoded audio/wav data
```

You can customize the dash, dot or space characters and specify the alphabet with the priority option for
an accurate encoding and decoding.
 
What priority option does is, gives direction to the plugin to start to searching for the given character set first.

Set the priority option according to the list below.

- 1 => ASCII (Default)
- 2 => Numbers
- 3 => Punctuation
- 4 => Latin Extended (Turkish, Polski etc.)
- 5 => Cyrilic
- 6 => Greek
- 7 => Hebrew
- 8 => Arabic
- 9 => Persian
- 10 => Japanese
- 11 => Korean

```js
morsify.encode('Ленинград', { priority: 5 }) // .-.././-./../-./--./.-./.-/-..
morsify.decode('.../.-/--./.-/.--./.--', { priority: 6 }) // Σ Α Γ Α Π Ω
morsify.decode('––– –... ––– –. ––. .. .–.. –––', { dash: '–', dot: '.', space: ' ', priority: 7 }) // ה ב ה נ ג י ל ה
morsify.audio('البُراق‎‎', { // generates the morse .-/.-../-.../.-./.-/--.- then generates the audio from it
  channels: 1, 
  sampleRate: 1012, 
  bitDepth: 16,
  unit: 0.1,
  frequency: 440.0,
  volume: 32767,
  priority: 8
})
```

  [npm-version]: https://img.shields.io/npm/v/morsify.svg?style=flat-square
  [npm-downloads]: https://img.shields.io/npm/dm/morsify.svg?style=flat-square
  [travis-ci]: https://img.shields.io/travis/ozdemirburak/morsify/master.svg?style=flat-square

  [npm]: https://www.npmjs.com/package/morsify
  [travis]: https://travis-ci.org/ozdemirburak/morsify
