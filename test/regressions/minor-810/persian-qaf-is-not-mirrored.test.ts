import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';

// Until 8.0.x the Persian ق had the code ---..., the mirror image of its code
// ...--- (Persian text runs right to left, and so do some printed tables: in
// them every code is mirrored). It was the only mirrored letter of the set, and
// ---... is the colon, so with priority 9 no colon could be decoded.
describe('regression: the code of Persian ق', () => {
  const persian = { priority: 9 };

  it('is ...---', () => {
    // Observed: '---...'.
    expect(morse.encode('ق', persian)).toBe('...---');
    expect(morse.characters()['9']['ق']).toBe('...---');
    expect(morse.decode('...---', persian)).toBe('ق');
    expect(morse.decode(morse.encode('قاشق', persian), persian)).toBe('قاشق');
  });

  it('gives the colon its code back with priority 9', () => {
    // Observed: 'ق'.
    expect(morse.decode('---...', persian)).toBe(':');
    expect(morse.decode(morse.encode('ساعت 12:30', persian), persian)).toBe('ساعت 12:30');
  });

  it('leaves the Arabic ق as it is', () => {
    expect(morse.encode('ق', { priority: 8 })).toBe('--.-');
    expect(morse.encode('ق')).toBe('--.-');
    expect(morse.decode('--.-', { priority: 8 })).toBe('ق');
  });
});
