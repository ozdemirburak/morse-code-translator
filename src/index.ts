import { getCharacters, getMappedCharacters, swapCharacters } from './characters.js';
import getOptions from './options.js';
import getAudio from './audio.js';
import type { Options, Characters, AudioResult } from './types.js';

// Decompose precomposed (NFC) katakana such as ガ (U+30AC) into base kana + a
// standalone voiced/semi-voiced mark (カ + ゛) so they match the Japanese map.
// Scoped to the katakana block so precomposed Latin/other scripts that rely on
// NFC keys (e.g. Ã, Á) are left untouched.
const KATAKANA = /[゠-ヿ]/;
const KATAKANA_ITERATION = /[ヽヾ]/; // U+30FD/U+30FE: decompose to a non-letter base, leave them alone
const normalizeKatakana = (text: string): string =>
  // NFC first so canonically-equivalent decomposed input (e.g. NFD Latin 'A'+◌́)
  // recomposes to its precomposed key ('Á') before lookup.
  [...text.normalize('NFC')]
    .map((character) =>
      KATAKANA.test(character) && !KATAKANA_ITERATION.test(character)
        ? // Decompose the katakana char and map its combining voiced/semi-voiced
          // mark to the standalone mark used as a map key. Scoped to katakana so a
          // stray combining mark on a non-Japanese base stays invalid. (NFC above
          // recomposes already-decomposed NFD katakana input first.)
          character.normalize('NFD').replace(/゙/g, '゛').replace(/゚/g, '゜')
        : character
    )
    .join('');

export const encode = (text: string, opts?: Partial<Options>): string => {
  const options = getOptions(opts);
  const characters = getCharacters(options);
  // toUpperCase (not toLocaleUpperCase) keeps casing deterministic regardless of
  // the host locale (e.g. avoids the Turkish i -> İ mapping).
  // trim BEFORE substituting whitespace so boundary whitespace cannot turn into
  // a (non-whitespace) separator that then emits phantom leading/trailing gaps.
  let codes = [...normalizeKatakana(text.trim().replace(/\s+/g, options.separator).toUpperCase())]
    .map((character) => {
      for (const set in characters) {
        const charSet = characters[set as keyof typeof characters];
        if (charSet && charSet[character]) {
          return charSet[character];
        }
      }
      return options.invalid;
    })
    // Substitute the internal 0/1 sentinels per code in a single pass (before
    // joining) so dot/dash symbols that themselves contain '0'/'1' are not
    // re-scanned, and so the separator is never subjected to substitution.
    .map((code) => code.replace(/[01]/g, (c) => (c === '0' ? options.dot : options.dash)))
    // Drop empty tokens so unknown characters in drop-unknown mode (invalid: '')
    // do not leave phantom/leading/trailing separators in the output.
    .filter((code) => code !== '');

  // In drop-unknown mode a dropped character can leave an orphaned word-gap
  // symbol at an edge or doubled-up; remove word gaps not flanked by real codes.
  if (options.invalid === '') {
    codes = codes.filter(
      (code, i) =>
        code !== options.space ||
        (codes[i - 1] !== undefined &&
          codes[i - 1] !== options.space &&
          codes[i + 1] !== undefined &&
          codes[i + 1] !== options.space)
    );
  }

  return codes.join(options.separator);
};

export const decode = (morse: string, opts?: Partial<Options>): string => {
  const options = getOptions(opts);
  const swapped = swapCharacters(options);
  const normalized = morse.trim().replace(/\s+/g, options.separator);
  if (normalized === '') {
    return '';
  }
  return normalized
    .split(options.separator)
    .map((characters) =>
      // hasOwnProperty guards against inherited Object.prototype members
      // (e.g. a "constructor" token) leaking into the decoded output.
      Object.prototype.hasOwnProperty.call(swapped, characters) ? swapped[characters] : options.invalid
    )
    .join('');
};

export const characters = (options?: Partial<Options>, usePriority: boolean = false): Characters => {
  return getMappedCharacters(getOptions(options), usePriority);
};

export const audio = (text: string, opts?: Partial<Options>, morseString?: string): AudioResult => {
  const options = getOptions(opts);
  const morse = morseString || encode(text, opts);
  return getAudio(morse, options);
};

// Export types
export type { Options, Characters, AudioResult, Oscillator, AudioState, AudioEvents } from './types.js';

export default {
  encode,
  decode,
  characters,
  audio,
};
