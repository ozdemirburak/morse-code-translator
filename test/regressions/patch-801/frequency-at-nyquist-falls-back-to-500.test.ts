import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';
import getOptions from '../../../src/options';
import { firstRender } from '../../helpers';

// 22050 Hz passed validation, but at 44.1 kHz an oscillator that starts on a
// zero-phase point renders only zero samples there (sin(pi * n) = 0): silent
// playback and a silent WAV file.
describe('regression: frequency at the Nyquist limit', () => {
  it('falls back to 500 Hz at 22050 Hz and keeps frequencies below it', () => {
    // Observed: 22050. Expected: 500, like other unusable frequencies.
    expect(getOptions({ oscillator: { frequency: 22050 } }).oscillator.frequency).toBe(500);
    expect(getOptions({ oscillator: { frequency: 22049.5 } }).oscillator.frequency).toBe(22049.5);
    const render = firstRender(() => morse.audio('E', { oscillator: { frequency: 22050 } }));
    expect(render.oscillator.frequency.value).toBe(500);
  });
});
