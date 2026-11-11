import { describe, it, expect } from 'vitest';
import morse from '../../../src/index';

// 8.0.x: the punctuation that phones and word processors write in place of
// ' " - and ... gave the invalid marker. ITU-R M.1677-1 has one signal for
// "hyphen or dash or subtraction sign", one for inverted commas and one for the
// apostrophe, and section 3 says how the signs without a signal are sent.
describe('regression: typographic punctuation', () => {
  it.each(['‘', '’', '‚', '‛', '‹', '›', '´', '`', '′', 'ʼ', '׳'])('sends %s as the apostrophe', (sign) => {
    // Observed: '#'.
    expect(morse.encode(sign)).toBe('.----.');
  });

  it.each(['“', '”', '„', '‟', '«', '»', '״'])('sends %s as the quotation mark', (sign) => {
    expect(morse.encode(sign)).toBe('.-..-.');
  });

  it.each(['‐', '‑', '‒', '–', '—', '―', '−'])('sends %s as the hyphen', (sign) => {
    expect(morse.encode(sign)).toBe('-....-');
  });

  it('sends the ellipsis as three full stops', () => {
    expect(morse.encode('…')).toBe('.-.-.- .-.-.- .-.-.-');
  });

  it('sends typed text with no invalid marker', () => {
    expect(morse.encode('“L’été” – déjà… «oui» — don’t')).toBe(morse.encode('"L\'été" - déjà... "oui" - don\'t'));
    expect(morse.encode('„Größe“ ‚a‘')).toBe(morse.encode('"Größe" \'a\''));
  });
});

describe('regression: signs that ITU-R M.1677-1 sends with other signals', () => {
  it('sends the multiplication sign as X (3.2.1)', () => {
    // Observed: '#'.
    expect(morse.encode('×')).toBe('-..-');
    expect(morse.encode('3×4')).toBe(morse.encode('3X4'));
  });

  it('sends % as 0/0 and ‰ as 0/00, joined to a number with a hyphen (3.3)', () => {
    expect(morse.encode('%')).toBe(morse.encode('0/0'));
    expect(morse.encode('‰')).toBe(morse.encode('0/00'));
    // "For 2%, transmit 2-0/0, and not 20/0."
    expect(morse.encode('2%')).toBe(morse.encode('2-0/0'));
    expect(morse.encode('6.7%')).toBe(morse.encode('6.7-0/0'));
    expect(morse.encode('5‰')).toBe(morse.encode('5-0/00'));
    expect(morse.encode('٥%', { priority: 8 })).toBe(morse.encode('5-0/0'));
    expect(morse.encode('٥٠٪', { priority: 8 })).toBe(morse.encode('50-0/0')); // Arabic percent sign
    // An invisible character between the number and the sign changes nothing
    // (a direction mark is usual in Arabic and Hebrew text).
    expect(morse.encode('5\u200F%')).toBe(morse.encode('5-0/0'));
    expect(morse.encode('5\u200B\uFE0F%')).toBe(morse.encode('5-0/0'));
    // A dropped unknown character is not there; a marked one is.
    expect(morse.encode('5€%', { invalid: '' })).toBe(morse.encode('5-0/0'));
    expect(morse.encode('5€%')).toBe('..... # ----- -..-. -----');
    // No hyphen when no number is directly before the sign.
    expect(morse.encode('50 %')).toBe(morse.encode('50 0/0'));
    expect(morse.encode('A%')).toBe(morse.encode('A0/0'));
  });

  it('sends the minute and second signs as one and two apostrophes (3.5.1)', () => {
    expect(morse.encode('1′15″')).toBe(morse.encode("1'15''"));
    expect(morse.encode('″')).toBe('.----. .----.');
  });

  it('leaves signs that have no rule unknown', () => {
    // The base of ≠ is =, but that is another sign: only letters fall to their base.
    expect(morse.encode('≠')).toBe('#');
    expect(morse.encode('€')).toBe('#');
    expect(morse.encode('£ ¥ § ©')).toBe('# / # / # / #');
  });

  it('never reads a custom separator as one of these signs', () => {
    // The separator stands for the gap between characters, also in the text.
    expect(morse.encode('A—B', { separator: '—' })).toBe('.-—/—-...');
    expect(morse.encode('A%B', { separator: '%' })).toBe('.-%/%-...');
    expect(morse.encode('2–3', { separator: '|' })).toBe('..---|-....-|...--');
  });
});
