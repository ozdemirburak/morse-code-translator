import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';

// Since 0.1.0 the code of Č was '110' (--.), the code of G. The source of the
// Latin Extended set gives "Č caron -.--. (kn) (Croatian)"; '110' had lost the
// first two symbols of '10110'. With priority 4 no G could be decoded.
describe('regression: the code of Č', () => {
  it('is -.--. and not the code of G', () => {
    // Observed: '--.'.
    expect(morse.encode('Č')).toBe('-.--.');
    expect(morse.encode('č')).toBe('-.--.');
    expect(morse.encode('G')).toBe('--.');
    expect(morse.characters()['4']['Č']).toBe('-.--.');
  });

  it('decodes --. as G with every priority', () => {
    for (let priority = 1; priority <= 4; priority++) {
      // Observed with priority 4: 'Č'.
      expect(morse.decode('--.', { priority }), `priority ${priority}`).toBe('G');
    }
    expect(morse.decode(morse.encode('GO'), { priority: 4 })).toBe('GO');
  });

  it('decodes -.--. as Č when Latin Extended is searched first', () => {
    expect(morse.decode('-.--.', { priority: 4 })).toBe('Č');
    expect(morse.decode('-.--.')).toBe('('); // set 3 is searched before set 4
    expect(morse.decode(morse.encode('ČAČAK'), { priority: 4 })).toBe('ČAČAK');
  });
});
