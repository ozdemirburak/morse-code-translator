import { getCharacters, getMappedCharacters, swapCharacters } from './characters.js';
import getOptions from './options.js';
import getAudio from './audio.js';
import type { Options, Characters, AudioResult } from './types.js';

export const encode = (text: string, opts?: Partial<Options>): string => {
  const options = getOptions(opts);
  const characters = getCharacters(options);
  return [...text.replace(/\s+/g, options.separator).trim().toLocaleUpperCase()]
    .map((character) => {
      for (const set in characters) {
        const charSet = characters[set as keyof typeof characters];
        if (charSet && charSet[character]) {
          return charSet[character];
        }
      }
      return options.invalid;
    })
    .join(options.separator)
    .replace(/0/g, options.dot)
    .replace(/1/g, options.dash);
};

export const decode = (morse: string, opts?: Partial<Options>): string => {
  const options = getOptions(opts);
  const swapped = swapCharacters(options);
  return morse
    .replace(/\s+/g, options.separator)
    .trim()
    .split(options.separator)
    .map((characters) => {
      if (typeof swapped[characters] !== 'undefined') {
        return swapped[characters];
      }
      return options.invalid;
    })
    .join('');
};

export const characters = (options?: Partial<Options>, usePriority: boolean = false): Characters => {
  return getMappedCharacters(getOptions(options), usePriority);
};

export const audio = (text: string, opts?: Partial<Options>, morseString?: string): AudioResult => {
  const morse = morseString || encode(text, opts);
  const options = getOptions(opts);
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
