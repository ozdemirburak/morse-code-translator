import type { Options } from './types.js';

// Splits Morse text into character codes and word-gap symbols. Shared by decode()
// and the audio scheduler so both read the same input the same way: any
// whitespace separates codes, runs of separators collapse, and a word-gap symbol
// may touch its neighbours ('.-/-...').
export const tokenize = (morse: string, o: Options): string[] => {
  const tokens: string[] = [];
  for (const token of morse.trim().replace(/\s+/g, o.separator).split(o.separator)) {
    // Validation guarantees dot/dash/invalid never contain the space symbol, so
    // splitting on it cannot tear a code apart.
    token.split(o.space).forEach((part, index) => {
      if (index > 0) tokens.push(o.space);
      if (part !== '') tokens.push(part);
    });
  }
  return tokens;
};
