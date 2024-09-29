import { getCharacters, getMappedCharacters, swapCharacters } from './characters';
import getOptions from './options';
import getAudio from './audio';

declare let exports;
declare let module;
declare let define;

;(((name, root, factory) => {
  if (typeof exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (root !== undefined) {
    root[name] = factory();
  }
})('morse-code-translator', globalThis, () => {
  'use strict';

  const encode = (text: string, opts: Options) => {
    const options = getOptions(opts);
    const characters = getCharacters(options);
    return [...text.replace(/\s+/g, options.separator).trim().toLocaleUpperCase()].map(function (character) {
      for (const set in characters) {
        if (typeof characters[set] !== 'undefined' && typeof characters[set][character] !== 'undefined') {
          return characters[set][character];
        }
      }
      return options.invalid;
    }).join(options.separator).replace(/0/g, options.dot).replace(/1/g, options.dash);
  };

  const decode = (morse: string, opts: Options) => {
    const options = getOptions(opts);
    const swapped = swapCharacters(options);
    return morse.replace(/\s+/g, options.separator).trim().split(options.separator).map(function (characters) {
      if (typeof swapped[characters] !== 'undefined') {
        return swapped[characters];
      }
      return options.invalid;
    }).join('');
  };

  const characters = (options, usePriority) => getMappedCharacters(getOptions(options), usePriority);

  const audio = (text: string, opts: Options, morseString: string) => {
    const morse = morseString || encode(text, opts);
    const options = getOptions(opts);
    return getAudio(morse, options);
  }

  return {
    characters,
    decode,
    encode,
    audio
  };
}));
