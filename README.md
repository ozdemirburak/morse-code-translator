# morsify

[![npm-version]][npm] [![npm-downloads]][npm] [![travis-ci]][travis]

Morse code encoder and decoder with no dependencies supports Latin, Cyrillic, Greek, Hebrew, 
Arabic, Persian, Japanese, Korean, Thai, and Unicode (Chinese and the others) characters with audio generation functionality using the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). 

Live demo can be found online at [Morse Code Translator](https://morsify.net).

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
var morsify = require('morsify');
var encoded = morsify.encode('SOS'); // .../---/... 
var decoded = morsify.decode('.../---/...'); // S O S
var characters = morsify.characters(); // {'1': {'A': '.-', ...}, ..., '11': {'ㄱ': '.-..', ...}}
var audio = morsify.audio('SOS');
audio.play(); // play audio
audio.stop(); // stop audio
```

Or alternatively, you can also use the library directly with including the source file.

```html
<script src="https://rawgit.com/ozdemirburak/morsify/master/dist/morsify.min.js"></script>
<script>
    var encoded = morsify.encode('SOS'); // .../---/... 
    var decoded = morsify.decode('.../---/...'); // S O S
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

You can customize the dash, dot or space characters and specify the alphabet with the priority option for
an accurate encoding and decoding.
 
What priority option does is, gives direction to the plugin to start to searching for the given character set first.

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
- 13 => Unicode (Chinese and the others)

```js
var cyrillic = morsify.encode('Ленинград', { priority: 5 }); // .-.././-./../-./--./.-./.-/-..
var greek = morsify.decode('.../.-/--./.-/.--./.--', { priority: 6 }); // Σ Α Γ Α Π Ω
var hebrew = morsify.decode('––– –... ––– –. ––. .. .–.. –––', { dash: '–', dot: '.', space: ' ', priority: 7 }); // ה ב ה נ ג י ל ה
var chinese = morsify.encode('你好', { priority: 13 }); // -..----.--...../-.--..-.-----.-
var characters = morsify.characters({ dash: '–', dot: '•' }); // {'1': {'A': '•–', ...}, ..., '11': {'ㄱ': '•–••', ...}}
var arabicAudio = morsify.audio('البُراق‎‎', { // generates the morse .-/.-../-.../.-./.-/--.- then generates the audio from it
  unit: 0.1, // period of one unit, in seconds, 1.2 / c where c is speed of transmission, in words per minute
  oscillator: {
    type: 'sine', // sine, square, sawtooth, triangle
    frequency: 500,  // value in hertz
    onended: function () { // event that fires when the tone has stopped playing
      console.log('ended');
    }
  }
}); 
var oscillator = arabicAudio.oscillator; // OscillatorNode 
var context = arabicAudio.context; // AudioContext; 
var gainNode = audio.gainNode; // GainNode
arabicAudio.play(); // will start playing morse audio
arabicAudio.stop(); // will stop playing morse audio
```

## Contributing and Known Issues

Contributions are welcome. 

## Generating Minified Files

Install node and npm following one of the techniques explained within 
this [link](https://gist.github.com/isaacs/579814) and run the commands below.

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
