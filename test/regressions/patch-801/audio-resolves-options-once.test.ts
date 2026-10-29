import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';

// audio() resolved and validated the options, then encode() resolved them
// again from the raw input.
describe('regression: audio() resolves its options once', () => {
  it('reads an option as often as encode() does', () => {
    let reads = 0;
    const opts = {
      get wpm() {
        reads++;
        return 20;
      },
    };
    morse.encode('SOS', opts);
    const encodeReads = reads;
    reads = 0;
    morse.audio('SOS', opts).dispose();
    // Observed: audio() reads wpm twice as often as encode().
    // Expected: the same number of reads (one getOptions() call).
    expect(reads).toBe(encodeReads);
  });
});
