import { getEncodeCharacters, getMappedCharacters, swapCharacters } from './characters.js';
import { tokenize } from './tokenize.js';
import getOptions, { assertString } from './options.js';
import getAudio from './audio.js';
import { normalizeText } from './normalize.js';
import type { MorseOptions, Options, Characters, AudioResult } from './types.js';

// One visible character (an emoji with modifiers, a letter with marks) that has
// no code becomes ONE invalid marker, not one per code point. Engines without
// Intl.Segmenter (e.g. Firefox before 125) treat every code point as a cluster.
let segmenter: Intl.Segmenter | null | undefined;
function* clusters(text: string): Generator<string> {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  }
  if (segmenter) {
    for (const { segment } of segmenter.segment(text)) yield segment;
  } else {
    yield* text;
  }
}
// Default-ignorable code points (ZWNJ/ZWJ, CGJ, direction marks, soft hyphen,
// BOM, variation selectors, Hangul fillers) are invisible: they produce no output.
const INVISIBLE = /^\p{Default_Ignorable_Code_Point}$/u;
// JavaScript's \s also matches U+FEFF, which Unicode does not count as whitespace.
const WHITESPACE = /[^\S\uFEFF]+/g;

// encode() with resolved options (audio() resolves them once for both).
const encodeWith = (text: string, options: Options): string => {
  const characters = getEncodeCharacters(options);
  const lookup = (character: string): string | undefined => {
    for (const set in characters) {
      if (Object.prototype.hasOwnProperty.call(characters[set], character)) {
        return characters[set][character];
      }
    }
    return undefined;
  };

  const codes: string[] = [];
  const push = (code: string) => {
    // '' is a dropped unknown character (invalid: ''). A run of word gaps (also
    // around dropped characters) is one gap, and never at the start.
    if (code === '' || (code === options.space && (codes.length === 0 || codes[codes.length - 1] === options.space))) {
      return;
    }
    codes.push(code);
  };
  // Normalize BEFORE the separator goes in, so it can never combine with the
  // text (NFC) or change case; trim first so boundary whitespace cannot turn
  // into a separator.
  for (const segment of clusters(normalizeText(text.trim()).replace(WHITESPACE, options.separator))) {
    let unknown = false;
    for (const character of segment) {
      // Whitespace became the separator above; it encodes as a word gap.
      const code = character === options.separator ? options.space : lookup(character);
      if (code !== undefined) {
        push(code);
        unknown = false;
      } else if (!INVISIBLE.test(character)) {
        if (!unknown) push(options.invalid);
        unknown = true;
      }
    }
  }
  if (codes[codes.length - 1] === options.space) {
    codes.pop();
  }
  return codes.join(options.separator);
};

export const encode = (text: string, opts?: MorseOptions | null): string => {
  assertString(text, 'text');
  return encodeWith(text, getOptions(opts));
};

export const decode = (morse: string, opts?: MorseOptions | null): string => {
  assertString(morse, 'morse');
  const options = getOptions(opts);
  const swapped = swapCharacters(options);
  return tokenize(morse, options)
    // swapped has a null prototype, so a "constructor" token cannot resolve.
    .map((token) => swapped[token] ?? options.invalid)
    .join('');
};

export const characters = (options?: MorseOptions | null, usePriority: boolean = false): Characters => {
  return getMappedCharacters(getOptions(options), usePriority);
};

export const audio = (text: string, opts?: MorseOptions | null, morseString?: string | null): AudioResult => {
  const options = getOptions(opts);
  // An explicit morse string (even '') wins; null/undefined encode the text.
  if (morseString !== undefined && morseString !== null) {
    assertString(morseString, 'morseString');
    return getAudio(morseString, options);
  }
  assertString(text, 'text');
  return getAudio(encodeWith(text, options), options);
};

// Export types
export type { MorseOptions, Characters, AudioResult, Oscillator, OscillatorWaveform, AudioState, AudioEvents } from './types.js';

export default {
  encode,
  decode,
  characters,
  audio,
};
