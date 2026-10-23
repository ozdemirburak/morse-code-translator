import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';

// ARABIC_MARKS no longer strips U+0653-0655. NFC (which runs first) has already
// composed every hamza/madda that has a precomposed letter, and no table key
// contains them, so the change only affects marks that did not compose: they
// now add an invalid marker after a valid letter. Persian ezafe (heh + U+0654)
// is normal text. Deliberate per test/regressions/text-round3.test.ts ('كٔ').
describe('regression: hamza/madda that did not compose', () => {
  it('Persian ezafe heh + hamza encodes like heh (as before round 3)', () => {
    // Observed: '-..- .- -. . #'. Before round 3: '-..- .- -. .'.
    expect(morse.encode('خانهٔ', { priority: 9 })).toBe(morse.encode('خانه', { priority: 9 }));
  });
});
