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

// Reads a code as dot/dash symbols, calling onSymbol(isDash) for each one; a
// character that starts neither symbol is skipped. Returns whether every
// character belonged to a symbol. Shared by option validation and the audio
// scheduler, so both read codes the same way.
export const scanCode = (code: string, dot: string, dash: string, onSymbol?: (isDash: boolean) => void): boolean => {
  // Longer symbol first. (Validation rejects a dot/dash that is a prefix of the
  // other, so the order only matters for speed.)
  const [first, second] = dot.length >= dash.length ? [dot, dash] : [dash, dot];
  let complete = true;
  for (let position = 0; position < code.length; ) {
    const symbol = code.startsWith(first, position) ? first : code.startsWith(second, position) ? second : null;
    if (symbol === null) {
      complete = false;
      position += 1;
      continue;
    }
    onSymbol?.(symbol === dash);
    position += symbol.length;
  }
  return complete;
};
