# [Morse Code Translator](https://morsecodetranslator.com)

[![npm-version]][npm] [![npm-downloads]][npm]

Morse code encoder and Morse decoder with no dependencies. It supports Latin, Cyrillic, Greek, Hebrew, Arabic,
Persian, Japanese, Korean, and Thai, with audio-generation functionality using the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).

## Installation

### npm

```bash
$ npm install @ozdemirburak/morse-code-translator --save
```

```js
import morse from '@ozdemirburak/morse-code-translator';             // ES module
const morse = require('@ozdemirburak/morse-code-translator').default; // CommonJS (Node 22.12+, require(esm))
```

The package is ESM-only and needs Node.js 22.12 or later (Node 22.12 itself prints an `ExperimentalWarning`
on `require()`; newer releases do not). TypeScript users need `moduleResolution` `bundler` or `nodenext`;
the CommonJS form `import morse = require(...)` in `.cts` files needs TypeScript 5.8 or later.

### Browser (CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/@ozdemirburak/morse-code-translator@8/dist/morse-code-translator.umd.js"></script>
<script>MorseCodeTranslator.encode('SOS');</script>
```

## Usage

```js
import morse from '@ozdemirburak/morse-code-translator';

const encoded = morse.encode('SOS'); // ... --- ...
const decoded = morse.decode('... --- ...'); // SOS
const characters = morse.characters(); // {'1': {'A': '.-', ...}, ..., '12': {'ก': '--.', ...}}
const withPriority = morse.characters({ priority: 5 }, true); // also includes the priority set as key '0'

const audio = morse.audio('SOS');

// Playback control
await audio.play();           // play audio (returns Promise)
audio.pause();                // pause audio
await audio.play();           // resume from paused position
await audio.seek(1.5);        // seek to 1.5 seconds
audio.stop();                 // stop audio and reset to beginning
audio.stop(true);             // stop and release the rendered audio (it re-renders on the next play/export)

// Playback state and info
audio.getState();             // 'ready', 'playing', 'paused', 'stopped', or 'disposed'
audio.getCurrentTime();       // current playback position in seconds
audio.getTotalTime();         // total duration in seconds

// Export audio
await audio.exportWave();     // download audio wave file (promise)
const url = await audio.getWaveUrl();  // get audio wave url (promise)
const blob = await audio.getWaveBlob(); // get audio wave blob (promise)

audio.dispose();              // release everything; the instance cannot be used after this

// Play your own Morse instead of encoding text (any whitespace separates characters;
// null or undefined encodes the text instead, '' plays silence)
const custom = morse.audio('', {}, '... --- ...');
```

### Options and localization

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
const cyrillic = morse.encode('Ленинград', { priority: 5 }); // .-.. . -. .. -. --. .-. .- -..
const greek = morse.decode('... .- --. .- .--. .--', { priority: 6 }); // ΣΑΓΑΠΩ
const hebrew = morse.decode('.. ––– . –––', { dash: '–', dot: '.', priority: 7 }); // יהוה
const japanese = morse.encode('NEWS', { priority: 10, dash: '－', dot: '・', separator: '　' }); // －・　・　・－－　・・・
const characters = morse.characters({ dash: '–', dot: '•' }); // {'1': {'A': '•–', ...}, ..., '11': {'ㄱ': '•–••', ...}, ...}
const arabicAudio = morse.audio('البراق', { // generates the Morse .- .-.. -... .-. .- --.- then generates the audio from it
  wpm: 18, // sets the wpm based on the Paris method, note that setting this will override and set the unit and fwUnits accordingly
  unit: 0.1, // period of one unit, in seconds, 1.2 / c where c is speed of transmission, in words per minute
  fwUnit: 0.1, // period of one Farnsworth unit to control intercharacter and interword gaps
  volume: 100, // the volume in percent (0-100)
  oscillator: {
    type: 'sine', // sine, square, sawtooth, triangle
    frequency: 500  // value in hertz
  },
  events: {
    onready: () => console.log('Audio is ready'),
    onstarted: () => console.log('Playback started'),
    onpaused: () => console.log('Playback paused'),
    onstopped: () => console.log('Playback stopped'),
    onended: () => console.log('Playback completed naturally'),
    onseeked: (time) => console.log('Seeked to:', time)
  }
});

// The live AudioContext used for playback (created on first access)
const context = arabicAudio.context;

// Playback control
await arabicAudio.play(); // will start playing Morse audio
arabicAudio.pause();      // will pause Morse audio
await arabicAudio.play(); // will resume from where it was paused
arabicAudio.stop();       // will stop and reset to beginning
```

### Options

| Option | Default | Notes |
|---|---|---|
| `dot` | `'.'` | Dot symbol. Must differ from `dash`, neither may start with the other, and it must not contain whitespace, `space` or `separator`. |
| `dash` | `'-'` | Dash symbol. Same rules as `dot`. |
| `separator` | `' '` | Between characters. A single character that is not itself encodable (so not a key such as `'X'` or `'?'`) and differs from `dot`/`dash`. |
| `space` | `'/'` | Word gap. A single, non-whitespace character that differs from `separator`, `dot` and `dash`. |
| `invalid` | `'#'` | Output for unknown characters; `''` drops them. Must not consist only of `dot`/`dash` symbols, or contain whitespace, `space` or `separator`. |
| `priority` | `1` | Character set to search first (1-12, number or numeric string). |
| `unit` | `0.08` | Length of one unit in seconds (15 wpm). |
| `fwUnit` | `unit` | Farnsworth unit for the gaps between characters and words. |
| `wpm` | – | Words per minute (PARIS); overrides `unit` and `fwUnit`. |
| `volume` | `100` | 0-100, out-of-range values are clamped. |
| `oscillator.type` | `'sine'` | `sine`, `square`, `sawtooth` or `triangle`. |
| `oscillator.frequency` | `500` | Hertz, from 1 to below 22050 (the Nyquist frequency of the 44.1 kHz render); other values fall back to 500. |
| `events` | – | `onready`, `onstarted`, `onpaused`, `onstopped`, `onended`, `onseeked(time)`. |

Invalid symbol options throw an error (they would corrupt the output); invalid numeric options fall back
to their default. Text and symbol options must be strings (`TypeError` otherwise).

### Writing systems

Text is folded to the forms Morse operators send before it is encoded:

- Korean syllables are split into jamo (한 → ㅎㅏㄴ), double and compound jamo into basic jamo (ㄲ → ㄱㄱ, ㅘ → ㅗㅏ).
- Japanese hiragana, small kana and half-width kana are sent as full-size katakana (きゃ → キヤ); voiced kana as kana + ゛.
- Greek tonos is not transmitted (ή → Η); Russian Ё is sent as Е; Hebrew final forms as their base letters; ẞ as SS.
- Thai letters that share a sound share a code (ศ ษ ส).
- Hebrew points and cantillation, Arabic vowel marks, a leftover hamza or madda mark (such as the Persian
  ezafe on ه) and the tatweel are not transmitted; letters such as أ that contain a hamza stay as they are.
  Arabic-Indic, Persian and Thai digits are sent as digits (٣ → 3).
- Full-width Latin letters and digits are sent as ASCII (ＳＯＳ → SOS); Thai ํ + า is sent as ำ; Arabic ؟ ، ؛
  and the Hebrew maqaf ־ are sent as ? , ; and -.
- Invisible characters (Unicode default-ignorable code points: zero-width joiners, direction marks, soft
  hyphens, the BOM, variation selectors, Hangul fillers) are ignored. An unknown visible character, such
  as an emoji, gives one `invalid` marker (one per code point in engines without `Intl.Segmenter`).
- A run of whitespace gives one word gap.

Decoding returns the base forms.

### Audio

Audio is rendered in chunks of about 30 seconds, so long texts play and export in full without one huge
buffer. Tones have 5 ms attack and release ramps, and playback fades in and out on play, pause, seek and stop,
so there are no clicks. `onended` follows the audio clock. Playback and WAV export together render at most
two chunks at a time (playback renders go first), so seeking through a long text stays cheap; a chunk that fails to render is tried
again before playback stops. While `seek()` resumes playback, `getState()` stays `'playing'`. `play()`
creates and resumes the live `AudioContext` at once, inside the user gesture that called it, and
`dispose()` closes it after the stop fade. WAV export is limited by the format to about 13.5 hours, and it
keeps the 16-bit samples in memory until the `Blob` is built (about 320 MB per hour of audio). In Node.js
or during server-side rendering `audio()` throws, because there is no Web Audio API.

## Upgrading from 7.x

- ESM-only; Node.js 22.12 or later. CommonJS code can `require()` the package through Node's
  require(esm) support. The UMD build (`dist/morse-code-translator.umd.js`) is for browsers and CDNs only.
  TypeScript users need `moduleResolution` `bundler` or `nodenext` (TypeScript 5.8+ for `.cts` files).
- `decode('..-..')` returns `É` (ITU), not `Ę`; Arabic `.` decodes to `ء` (U+0621), not U+FE80.
- `decode('.-/-...')` returns `A B`; runs of a custom separator and spaces around it are ignored. Each
  word-gap symbol decodes to a space, also next to a code: `.- // -...` gives `A  B` (was `A#B`) and
  `.-/` gives `A ` (was `#`).
- Characters that encoded as `#` now encode (see Writing systems). An unknown visible character gives one
  marker (an emoji with a variation selector used to give two), and invisible characters give none.
- A run of whitespace or separator characters in the text, also around a dropped unknown character
  (`invalid: ''`), gives one word gap: `encode('I ❤ YOU', { invalid: '' })` keeps the gap before `YOU`.
- New errors: dot/dash that are prefixes of each other or contain whitespace, an `invalid` marker that
  contains whitespace, `space` or `separator`, and non-string text or symbols. `space` and `invalid` may now
  contain `0` and `1`. The new table keys (Ё, ء, Hebrew final forms, the added Thai letters) can no longer
  be used as `separator`.
- A custom separator no longer interacts with the text: `separator: 'x'` keeps word gaps (it used to
  turn them into the letter X).
- `priority` accepts numeric strings; `volume` is clamped; a frequency below 1 Hz or of 22050 Hz and above falls back to 500.
- Audio: no 1-hour limit, ramps at tone edges, unknown characters add no silence, whitespace in a custom
  Morse string separates characters, an explicit `''` Morse string is honored (`null` encodes the text), `onstopped` also fires
  when stopping from pause, `stop(true)` re-renders on the next play, and a throwing event callback is
  logged instead of breaking the instance.
- Removed: `audio.oscillator` and `audio.gainNode` (they never affected playback), the deprecated
  `oscillator.onended` option (use `events.onended`), and the `webkitAudioContext` fallbacks.
- Types: new `MorseOptions` (the `Options` type is no longer exported); `oscillator.type` excludes
  `'custom'`; `AudioResult` members are readonly.

## Contributions

[morse-code-translator](https://github.com/ozdemirburak/morse-code-translator) has been developed 
with extensive feedback and contributions from [numerous developers](https://github.com/ozdemirburak/morse-code-translator/graphs/contributors).

Special thanks to [Chris Jones](https://github.com/chris--jones), who added many great features.

## License & Attribution

[MIT licensed](LICENSE), use it however you want. But if this library saved you time, link back to
the project homepage. It is how open-source maintainers get credit for their work.

```html
<a href="https://morsecodetranslator.com">Morse Code Translator</a>
```

Takes 30 seconds. Appreciated, not required.

  [npm-version]: https://img.shields.io/npm/v/@ozdemirburak/morse-code-translator.svg?style=flat-square
  [npm-downloads]: https://img.shields.io/npm/dm/@ozdemirburak/morse-code-translator.svg?style=flat-square
  [npm]: https://www.npmjs.com/package/@ozdemirburak/morse-code-translator
