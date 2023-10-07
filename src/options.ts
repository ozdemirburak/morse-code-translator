const getOptions = (opts: Partial<Options> = {}): Options => {
  const options: Options = {
    ...opts,
    dash: opts.dash || '-',
    dot: opts.dot || '.',
    space: opts.space || '/',
    separator: opts.separator || ' ',
    invalid: opts.invalid || '#',
    priority: opts.priority || 1,
    wpm: opts.wpm, // words per minute - PARIS method used in favour of unit/fwUnit options
    unit: opts.unit || 0.08, // period of one unit, in seconds, 1.2 / c where c is speed of transmission, in words per minute
    fwUnit: opts.fwUnit || opts.unit || 0.08, // Farnsworth unit to control intercharacter and interword gaps
    oscillator: {
      ...opts.oscillator,
      type: opts.oscillator?.type || 'sine', // sine, square, sawtooth, triangle
      frequency: opts.oscillator?.frequency || 500, // value in hertz
      onended: opts.oscillator?.onended || null // event that fires when the tone has stopped playing
    }
  };
  return options;
};

export default getOptions;
