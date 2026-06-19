import type { Options } from './types.js';
import { baseCharacters } from './characters.js';

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

const validateSymbols = (o: Options): void => {
  if (o.dot === o.dash) {
    throw new Error('morse-code-translator: "dot" and "dash" symbols must be different.');
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
  // The audio renderer splits on the space/separator before tokenizing dot/dash,
  // so a dot/dash that contains either would be torn apart.
  for (const [name, value] of [['dot', o.dot], ['dash', o.dash]] as const) {
    if (value.includes(o.space) || value.includes(o.separator)) {
      throw new Error(`morse-code-translator: "${name}" must not contain the "space" or "separator" symbol.`);
    }
  }
  // The separator stands in for whitespace in the input, so it must not also be
  // an encodable character (that would make input occurrences ambiguous).
  if (isCharacterKey(o.separator)) {
    throw new Error('morse-code-translator: "separator" must not be an encodable character.');
  }
  // A non-empty invalid marker must not look like a code, or it would be
  // re-tokenized into audible tones by the audio renderer.
  if (o.invalid !== '' && isCodeLike(o.invalid, o.dot, o.dash)) {
    throw new Error('morse-code-translator: "invalid" must not be composed solely of "dot"/"dash" symbols.');
  }
  // '0'/'1' are the internal code sentinels; symbols that pass through the
  // code-substitution step must not contain them.
  for (const [name, value] of [['space', o.space], ['invalid', o.invalid]] as const) {
    if (/[01]/.test(value)) {
      throw new Error(`morse-code-translator: "${name}" must not contain the reserved characters "0" or "1".`);
    }
  }
};

const getOptions = (opts: Partial<Options> = {}): Options => {
  // unit/fwUnit/wpm/frequency must be positive finite; zero, negative, NaN and
  // Infinity are degenerate (they produce empty/negative/infinite buffers or
  // throw in real browsers).
  const unit = isPositiveNumber(opts.unit) ? opts.unit : 0.08;
  const fwUnit = isPositiveNumber(opts.fwUnit) ? opts.fwUnit : unit;
  const wpm = isPositiveNumber(opts.wpm) ? opts.wpm : undefined;
  const frequency = isPositiveNumber(opts.oscillator?.frequency) ? (opts.oscillator as { frequency: number }).frequency : 500;
  // volume is 0-100; 0 is a legitimate value (mute), only non-finite/missing fall back.
  const volume = typeof opts.volume === 'number' && Number.isFinite(opts.volume) ? opts.volume : 100;
  // priority must be an integer in [1, 12]; out-of-range silently selects the
  // wrong/empty alphabet otherwise.
  const priority = Number.isInteger(opts.priority) && (opts.priority as number) >= 1 && (opts.priority as number) <= 12 ? (opts.priority as number) : 1;
  // oscillator.type must be a valid OscillatorType, or it throws in real browsers.
  const requestedType = opts.oscillator?.type;
  const oscillatorType: OscillatorType =
    requestedType === 'sine' || requestedType === 'square' || requestedType === 'sawtooth' || requestedType === 'triangle'
      ? requestedType
      : 'sine';

  const options: Options = {
    ...opts,
    dash: opts.dash || '-',
    dot: opts.dot || '.',
    space: opts.space || '/',
    separator: opts.separator || ' ',
    invalid: opts.invalid ?? '#', // '' is legitimate: drop unknown characters
    priority,
    wpm, // words per minute - PARIS method used in favour of unit/fwUnit options
    unit, // period of one unit, in seconds, 1.2 / c where c is speed of transmission, in words per minute
    fwUnit, // Farnsworth unit to control intercharacter and interword gaps
    volume,
    oscillator: {
      ...opts.oscillator,
      type: oscillatorType, // sine, square, sawtooth, triangle
      frequency, // value in hertz
      onended: opts.oscillator?.onended || null // event that fires when the tone has stopped playing
    },
    // Clone events so internal mutation (backwards-compat onended) never leaks
    // back into the caller-supplied object.
    events: opts.events ? { ...opts.events } : opts.events
  };

  validateSymbols(options);
  return options;
};

export default getOptions;
