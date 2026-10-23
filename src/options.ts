import type { MorseOptions, Options } from './types.js';
import { baseCharacters } from './characters.js';

// Highest frequency a 44.1 kHz render can represent (Nyquist); above it the
// oscillator renders pure silence.
const MAX_FREQUENCY = 22050;
const SYMBOL_DEFAULTS = { dash: '-', dot: '.', space: '/', separator: ' ', invalid: '#' } as const;

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

// True if the symbol is an encodable character in any character set (so it
// cannot safely double as a delimiter — input occurrences would be ambiguous).
const isCharacterKey = (symbol: string): boolean =>
  Object.values(baseCharacters).some((set) => Object.prototype.hasOwnProperty.call(set, symbol));

// A symbol is "code-like" if it can be tokenized entirely into dot/dash, which
// would make it indistinguishable from a real character code.
const isCodeLike = (symbol: string, dot: string, dash: string): boolean => {
  if (symbol === '') return false;
  let i = 0;
  while (i < symbol.length) {
    if (symbol.startsWith(dot, i)) i += dot.length;
    else if (symbol.startsWith(dash, i)) i += dash.length;
    else return false;
  }
  return true;
};

export function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`morse-code-translator: ${name} must be a string.`);
  }
}

// Symbols must be strings; a missing value falls back to the default, and so
// does '' for every symbol except invalid ('' there means "drop unknown").
const getSymbol = (opts: MorseOptions, name: keyof typeof SYMBOL_DEFAULTS): string => {
  const value: unknown = opts[name];
  if (value === undefined || value === null) {
    return SYMBOL_DEFAULTS[name];
  }
  assertString(value, `"${name}"`);
  return value === '' && name !== 'invalid' ? SYMBOL_DEFAULTS[name] : value;
};

// priority must be an integer in [1, 12] given as a number or a plain decimal
// string (e.g. an HTML <select> value); anything else selects Latin.
const getPriority = (value: unknown): number => {
  const priority = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return Number.isInteger(priority) && (priority as number) >= 1 && (priority as number) <= 12 ? (priority as number) : 1;
};

const validateSymbols = (o: Options): void => {
  if (o.dot === o.dash) {
    throw new Error('morse-code-translator: "dot" and "dash" symbols must be different.');
  }
  // A prefix pair makes codes ambiguous (dot '.' + dash '..': T and I both
  // become '..'), so one symbol must never start with the other.
  if (o.dot.startsWith(o.dash) || o.dash.startsWith(o.dot)) {
    throw new Error('morse-code-translator: "dot" and "dash" must not be a prefix of each other.');
  }
  if (o.separator === o.space) {
    throw new Error('morse-code-translator: "separator" and "space" symbols must be different.');
  }
  for (const [name, value] of [['separator', o.separator], ['space', o.space]] as const) {
    // encode() spreads text per code point, so a multi-character separator/space
    // cannot be matched as a single delimiter — require exactly one code point.
    if ([...value].length !== 1) {
      throw new Error(`morse-code-translator: "${name}" must be a single character.`);
    }
    if (value === o.dot || value === o.dash) {
      throw new Error(`morse-code-translator: "${name}" must differ from the "dot" and "dash" symbols.`);
    }
    if (isCodeLike(value, o.dot, o.dash)) {
      throw new Error(`morse-code-translator: "${name}" must not be composed solely of "dot"/"dash" symbols.`);
    }
    // The word-gap (space) symbol cannot be whitespace: decode collapses all
    // whitespace runs into the separator, which would obliterate it. (The
    // separator itself may be a single whitespace character — it is the
    // normalization target.)
    if (name === 'space' && /\s/.test(value)) {
      throw new Error('morse-code-translator: "space" must not be a whitespace character.');
    }
  }
  // The tokenizer splits on whitespace and the space/separator symbols, so a
  // dot/dash that contains any of them would be torn apart.
  for (const [name, value] of [['dot', o.dot], ['dash', o.dash]] as const) {
    if (value.includes(o.space) || value.includes(o.separator) || /\s/.test(value)) {
      throw new Error(`morse-code-translator: "${name}" must not contain whitespace or the "space"/"separator" symbol.`);
    }
  }
  // The separator stands in for whitespace in the input, so it must not also be
  // an encodable character (that would make input occurrences ambiguous).
  if (isCharacterKey(o.separator)) {
    throw new Error('morse-code-translator: "separator" must not be an encodable character.');
  }
  if (o.invalid !== '') {
    // A non-empty invalid marker must not look like a code, or it would be
    // re-tokenized into audible tones by the audio renderer.
    if (isCodeLike(o.invalid, o.dot, o.dash)) {
      throw new Error('morse-code-translator: "invalid" must not be composed solely of "dot"/"dash" symbols.');
    }
    // ...nor contain a delimiter (whitespace, space, separator), or decode
    // would read it as a word gap or split it.
    if (o.invalid.includes(o.space) || o.invalid.includes(o.separator) || /\s/.test(o.invalid)) {
      throw new Error('morse-code-translator: "invalid" must not contain whitespace or the "space"/"separator" symbol.');
    }
  }
};

const getOptions = (input?: MorseOptions | null): Options => {
  const opts: MorseOptions = input ?? {};
  // unit/fwUnit/wpm/frequency must be positive finite; zero, negative, NaN and
  // Infinity are degenerate (they produce empty/negative/infinite buffers or
  // throw in real browsers).
  const unit = isPositiveNumber(opts.unit) ? opts.unit : 0.08;
  const fwUnit = isPositiveNumber(opts.fwUnit) ? opts.fwUnit : unit;
  const wpm = isPositiveNumber(opts.wpm) ? opts.wpm : undefined;
  const requestedFrequency = opts.oscillator?.frequency;
  const frequency = isPositiveNumber(requestedFrequency) && requestedFrequency <= MAX_FREQUENCY ? requestedFrequency : 500;
  // volume is 0-100 (clamped); 0 is a legitimate value (mute), only
  // non-finite/missing fall back.
  const volume = typeof opts.volume === 'number' && Number.isFinite(opts.volume) ? Math.min(100, Math.max(0, opts.volume)) : 100;
  const priority = getPriority(opts.priority);
  // oscillator.type must be a valid OscillatorType, or it throws in real browsers.
  const requestedType: unknown = opts.oscillator?.type;
  const oscillatorType: Options['oscillator']['type'] =
    requestedType === 'sine' || requestedType === 'square' || requestedType === 'sawtooth' || requestedType === 'triangle'
      ? requestedType
      : 'sine';

  const options: Options = {
    ...opts,
    dash: getSymbol(opts, 'dash'),
    dot: getSymbol(opts, 'dot'),
    space: getSymbol(opts, 'space'),
    separator: getSymbol(opts, 'separator'),
    invalid: getSymbol(opts, 'invalid'), // '' is legitimate: drop unknown characters
    priority,
    wpm, // words per minute - PARIS method used in favour of unit/fwUnit options
    unit, // period of one unit, in seconds, 1.2 / c where c is speed of transmission, in words per minute
    fwUnit, // Farnsworth unit to control intercharacter and interword gaps
    volume,
    oscillator: {
      type: oscillatorType, // sine, square, sawtooth, triangle
      frequency // value in hertz
    },
    events: opts.events ? { ...opts.events } : opts.events
  };

  validateSymbols(options);
  return options;
};

export default getOptions;
