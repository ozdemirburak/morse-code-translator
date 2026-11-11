import { describe, it, expect, expectTypeOf } from 'vitest';
import morse, { type MorseOptions } from '../../../src/index';
import getOptions from '../../../src/options';

// 8.0.x: many letters of set 4 share a code and decode() always gave the first
// table key, also with priority 4. A Spanish reader got Ń for Ñ, a German or
// Turkish reader Ó for Ö, a Polish reader É Ä Ç È Ž for Ę Ą Ć Ł Ż.
describe('regression: prefer option', () => {
  const shared: Array<[string, string, string[]]> = [
    ['.-..-', 'È', ['İ', 'Ł']],
    ['..-..', 'É', ['Ę', 'Ë', 'Đ']],
    ['.-.-', 'Ä', ['Ą', 'Æ']],
    ['-.-..', 'Ç', ['Ć', 'Ĉ']],
    ['--..-', 'Ž', ['Ż']],
    ['---.', 'Ó', ['Ò', 'Ö', 'Ô', 'Ø']],
    ['--.--', 'Ń', ['Ñ']],
    ['.--.-', 'Ã', ['Á', 'Å', 'À', 'Â']],
    ['----', 'Ĥ', ['Ș', 'Š']],
    ['.--..', 'Ş', ['Þ']],
    ['..--', 'Ü', ['Ù', 'Ŭ', 'Û']],
    ['--.-.', 'Ğ', ['Ĝ']],
    ['.---.', 'Ì', ['Ĵ']],
  ];

  it.each(shared)('%s is %s by default and each preferred letter of its group', (code, first, others) => {
    expect(morse.decode(code)).toBe(first);
    expect(morse.decode(code, { priority: 4 })).toBe(first);
    for (const letter of others) {
      // Observed: the first letter (the option did not exist).
      expect(morse.decode(code, { prefer: letter }), letter).toBe(letter);
      expect(morse.decode(code, { prefer: letter, priority: 4 }), letter).toBe(letter);
      expect(morse.encode(letter)).toBe(code);
    }
  });

  it('decodes a text with the letters of its language', () => {
    expect(morse.decode('.-..- ... - .- -. -... ..- .-.. / --. ---. .-.. ..--', { prefer: 'İÖ' })).toBe('İSTANBUL GÖLÜ');
    const polish = { prefer: 'ĄĆĘŁŃÓŚŹŻ' };
    expect(morse.decode(morse.encode('ZAŻÓŁĆ GĘŚLĄ JAŹŃ'), polish)).toBe('ZAŻÓŁĆ GĘŚLĄ JAŹŃ');
    expect(morse.decode(morse.encode('ESPAÑA'), { prefer: 'Ñ' })).toBe('ESPAÑA');
    expect(morse.decode(morse.encode('ÅR ØL ÆRE'), { prefer: 'ÅÆØ' })).toBe('ÅR ØL ÆRE');
  });

  it('gives the results that the README shows', () => {
    expect(morse.decode('--. ---. .-.. ..--', { prefer: 'İÖ' })).toBe('GÖLÜ');
    expect(morse.decode('--. ---. .-.. ..--')).toBe('GÓLÜ');
    expect(morse.decode('.-..- ---. -.. --..-.', { prefer: 'ĄĆĘŁŃÓŚŹŻ' })).toBe('ŁÓDŹ');
    expect(morse.decode('.-..- ---. -.. --..-.')).toBe('ÈÓDŹ');
    expect(morse.decode('--.-- ---.')).toBe('ŃÓ');
    expect(morse.decode('--.-- ---.', { prefer: 'ÑÖ' })).toBe('ÑÖ');
    expect(morse.decode('..-..', { priority: 5, prefer: 'Є' })).toBe('Є');
    expect(morse.decode('..-..', { priority: 5 })).toBe('Э');
    expect(morse.decode(morse.encode('ИІ', { priority: 5 }), { priority: 5, prefer: 'І' })).toBe('ІІ');
    expect(morse.decode('.--- . ..-. .-.. .... .-..', { priority: 11 })).toBe('한국');
  });

  it('accepts lower case and decomposed letters, and the first letter given wins for a code', () => {
    expect(morse.decode('---. --.--', { prefer: 'öñ' })).toBe('ÖÑ');
    expect(morse.decode('---.', { prefer: 'ö' })).toBe('Ö');
    expect(morse.decode('---.', { prefer: 'ØÖ' })).toBe('Ø');
    expect(morse.decode('---.', { prefer: 'ÖØ' })).toBe('Ö');
  });

  it('ignores characters that have no code or that are alone on their code', () => {
    expect(morse.decode('.- ---. -..-', { prefer: ' Ö, €x' })).toBe('AÖX');
    expect(morse.decode('... --- ...', { prefer: 'SOS' })).toBe('SOS');
  });

  it('chooses in a character set only: the letters of an earlier set keep their codes', () => {
    // Ê shares -..-. with the fraction bar and Č shares -.--. with the bracket
    // (set 3 is searched before set 4), Ö shares ---. with Cyrillic Ч.
    expect(morse.decode('-..-. -.--.', { prefer: 'ÊČ' })).toBe('/(');
    expect(morse.decode('---.', { prefer: 'Ö', priority: 5 })).toBe('Ч');
    expect(morse.decode('.-', { prefer: 'А' })).toBe('A'); // Cyrillic А, Latin A
    // priority still chooses the set.
    expect(morse.decode('-..-. -.--.', { prefer: 'ÊČ', priority: 4 })).toBe('ÊČ');
  });

  it('chooses between the letters of the other alphabets too', () => {
    expect(morse.decode('.. ..-.. --.', { priority: 5 })).toBe('ИЭГ');
    expect(morse.decode('.. ..-.. --.', { priority: 5, prefer: 'ІЄҐ' })).toBe('ІЄҐ');
    expect(morse.decode('...', { priority: 12 })).toBe('ส');
    expect(morse.decode('...', { priority: 12, prefer: 'ศ' })).toBe('ศ');
    expect(morse.decode('-.-', { priority: 7, prefer: 'ך' })).toBe('ך');
  });

  it('does not change encode() or characters()', () => {
    const prefer = 'İÖĄĆĘŁŃÓŚŹŻ';
    expect(morse.encode('ÈÉÄÇŽÓŃ', { prefer })).toBe(morse.encode('ÈÉÄÇŽÓŃ'));
    expect(morse.characters({ prefer })).toEqual(morse.characters());
    expect(morse.characters({ prefer }, true)).toEqual(morse.characters({}, true));
  });

  it('keeps the results of calls with other preferred letters apart', () => {
    expect(morse.decode('---.', { prefer: 'Ö' })).toBe('Ö');
    expect(morse.decode('---.', { prefer: 'Ø' })).toBe('Ø');
    expect(morse.decode('---.')).toBe('Ó');
    expect(morse.decode('---.', { prefer: '' })).toBe('Ó');
    expect(morse.decode('---.', { prefer: 'Ö' })).toBe('Ö');
  });

  it('works with custom symbols', () => {
    expect(morse.decode('–––•', { dash: '–', dot: '•', prefer: 'Ö' })).toBe('Ö');
  });

  it('is an optional string; null and undefined mean no preferred letters', () => {
    expectTypeOf<{ prefer: string }>().toMatchTypeOf<MorseOptions>();
    expect(getOptions({}).prefer).toBe('');
    expect(getOptions({ prefer: undefined }).prefer).toBe('');
    expect(getOptions({ prefer: null as unknown as string }).prefer).toBe('');
    expect(() => morse.decode('.-', { prefer: ['Ö'] as unknown as string })).toThrow(TypeError);
    expect(() => morse.decode('.-', { prefer: 5 as unknown as string })).toThrow(/"prefer" must be a string/);
  });
});
