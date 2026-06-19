import { describe, it, expect, vi } from 'vitest';
import * as morse from '../src/index';

describe('morse', () => {
  it('encodes english alphabet', () => {
    expect(morse.encode('the quick brown fox jumps over the lazy dog')).toBe('- .... . / --.- ..- .. -.-. -.- / -... .-. --- .-- -. / ..-. --- -..- / .--- ..- -- .--. ... / --- ...- . .-. / - .... . / .-.. .- --.. -.-- / -.. --- --.');
    expect(morse.encode('the quick brown fox jumps over the lazy dog', { dash: '–', dot: '•', space: '\\' })).toBe('– •••• • \\ ––•– ••– •• –•–• –•– \\ –••• •–• ––– •–– –• \\ ••–• ––– –••– \\ •––– ••– –– •––• ••• \\ ––– •••– • •–• \\ – •••• • \\ •–•• •– ––•• –•–– \\ –•• ––– ––•');
  });
  it('decodes english alphabet', () => {
    expect(morse.decode('- .... . / --.- ..- .. -.-. -.- / -... .-. --- .-- -. / ..-. --- -..- / .--- ..- -- .--. ... / --- ...- . .-. / - .... . / .-.. .- --.. -.-- / -.. --- --.')).toBe('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG');
    expect(morse.decode('– •••• • \\ ––•– ••– •• –•–• –•– \\ –••• •–• ––– •–– –• \\ ••–• ––– –••– \\ •––– ••– –– •––• ••• \\ ––– •••– • •–• \\ – •••• • \\ •–•• •– ––•• –•–– \\ –•• ––– ––•', {dash: '–', dot: '•', space: '\\'})).toBe('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG');
  });
  it('encodes numbers', () => {
    expect(morse.encode('0123456789')).toBe('----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----.');
  });
  it('decodes numbers', () => {
    expect(morse.decode('----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----.')).toBe('0123456789');
  });
  it('encodes punctuation', () => {
    expect(morse.encode('.,?\'!/(')).toBe('.-.-.- --..-- ..--.. .----. -.-.-- -..-. -.--.');
    expect(morse.encode(')&:;=¿¡')).toBe('-.--.- .-... ---... -.-.-. -...- ..-.- --...-');
  });
  it('decodes punctuation', () => {
    expect(morse.decode('.-.-.- --..-- ..--.. .----. -.-.-- -..-. -.--.')).toBe('.,?\'!/(');
    expect(morse.decode('-.--.- .-... ---... -.-.-. -...- ..-.- --...-')).toBe(')&:;=¿¡');
  });
  it('encodes non-english alphabet', () => {
    expect(morse.encode('ÃÁÅÀÂÄ')).toBe('.--.- .--.- .--.- .--.- .--.- .-.-');
    expect(morse.encode('ĄÆÇĆĈČ')).toBe('.-.- .-.- -.-.. -.-.. -.-.. --.');
    expect(morse.encode('ĘÐÈËĘÉ')).toBe('..-.. ..--. .-..- ..-.. ..-.. ..-..');
    expect(morse.encode('ÊĞĜĤİÏ')).toBe('-..-. --.-. --.-. ---- .-..- -..--');
    expect(morse.encode('ÌĴŁŃÑÓ')).toBe('.---. .---. .-..- --.-- --.-- ---.');
    expect(morse.encode('ÒÖÔØŚŞ')).toBe('---. ---. ---. ---. ...-... .--..');
    expect(morse.encode('ȘŠŜßÞÜ')).toBe('---- ---- ...-. ... ... .--.. ..--');
    expect(morse.encode('ÙŬŽŹŻ')).toBe('..-- ..-- --..- --..-. --..-');
  });
  it('decodes non-english alphabet', () => {
    const options = { priority: 4 };
    expect(morse.decode('.--.- .--.- .--.- .--.- .--.- .-.-', options)).toBe('ÃÃÃÃÃÄ');
    expect(morse.decode('.-.- .-.- -.-.. -.-.. -.-.. --.', options)).toBe('ÄÄÇÇÇČ');
    expect(morse.decode('..-.. ..--. .-..- ..-.. ..-.. ..-..', options)).toBe('ĘÐÈĘĘĘ');
    expect(morse.decode('-..-. --.-. --.-. ---- .-..- -..--', options)).toBe('ÊĞĞĤÈÏ');
    expect(morse.decode('.---. .---. .-..- --.-- --.-- ---.', options)).toBe('ÌÌÈŃŃÓ');
    expect(morse.decode('---- ---- ...-. ... ... .--.. ..--', options)).toBe('ĤĤŜSSŞÜ');
    expect(morse.decode('..-- ..-- --..- --..-. --..-', options)).toBe('ÜÜŽŹŽ');
  });
  it('encodes cyrilic alphabet', () => {
    expect(morse.encode('АБВГДЕ')).toBe('.- -... .-- --. -.. .');
    expect(morse.encode('ЖЗИЙКЛ')).toBe('...- --.. .. .--- -.- .-..');
    expect(morse.encode('МНОПРС')).toBe('-- -. --- .--. .-. ...');
    expect(morse.encode('ТУФХЦЧ')).toBe('- ..- ..-. .... -.-. ---.');
    expect(morse.encode('ШЩЪЫЬЭ')).toBe('---- --.- --.-- -.-- -..- ..-..');
    expect(morse.encode('ЮЯЄІЇҐ')).toBe('..-- .-.- ..-.. .. .---. --.');
  });
  it('decodes cyrilic alphabet', () => {
    const options = { priority: 5 };
    expect(morse.decode('.- -... .-- --. -.. .', options)).toBe('АБВГДЕ');
    expect(morse.decode('...- --.. .. .--- -.- .-..', options)).toBe('ЖЗИЙКЛ');
    expect(morse.decode('-- -. --- .--. .-. ...', options)).toBe('МНОПРС');
    expect(morse.decode('- ..- ..-. .... -.-. ---.', options)).toBe('ТУФХЦЧ');
    expect(morse.decode('---- --.- --.-- -.-- -..- ..-..', options)).toBe('ШЩЪЫЬЭ');
    expect(morse.decode('..-- .-.- ..-.. .. .---.', options)).toBe('ЮЯЭИЇ');
  });
  it('encodes greek alphabet', () => {
    const options = { priority: 6 };
    expect(morse.encode('ΑΒΓΔΕΖ', options)).toBe('.- -... --. -.. . --..');
    expect(morse.encode('ΗΘΙΚΛΜ', options)).toBe('.... -.-. .. -.- .-.. --');
    expect(morse.encode('ΝΞΟΠΡΣ', options)).toBe('-. -..- --- .--. .-. ...');
    expect(morse.encode('ΤΥΦΧΨΩ', options)).toBe('- -.-- ..-. ---- --.- .--');
  });
  it('decodes greek alphabet', () => {
    const options = { priority: 6 };
    expect(morse.decode('.- -... --. -.. . --..', options)).toBe('ΑΒΓΔΕΖ');
    expect(morse.decode('.... -.-. .. -.- .-.. --', options)).toBe('ΗΘΙΚΛΜ');
    expect(morse.decode('-. -..- --- .--. .-. ...', options)).toBe('ΝΞΟΠΡΣ');
    expect(morse.decode('- -.-- ..-. ---- --.- .--', options)).toBe('ΤΥΦΧΨΩ');
  });
  it('encodes hebrew alphabet', () => {
    expect(morse.encode('אבגדהו')).toBe('.- -... --. -.. --- .');
    expect(morse.encode('זחטיכל')).toBe('--.. .... ..- .. -.- .-..');
    expect(morse.encode('מנסעפצ')).toBe('-- -. -.-. .--- .--. .--');
    expect(morse.encode('קרשת')).toBe('--.- .-. ... -');
  });
  it('decodes hebrew alphabet', () => {
    const options = { priority: 7 };
    expect(morse.decode('.- -... --. -.. --- .', options)).toBe('אבגדהו');
    expect(morse.decode('--.. .... ..- .. -.- .-..', options)).toBe('זחטיכל');
    expect(morse.decode('-- -. -.-. .--- .--. .--', options)).toBe('מנסעפצ');
    expect(morse.decode('--.- .-. ... -', options)).toBe('קרשת');
  });
  it('encodes arabic alphabet', () => {
    expect(morse.encode('ابتثجح')).toBe('.- -... - -.-. .--- ....');
    expect(morse.encode('خدذرزس')).toBe('--- -.. --.. .-. ---. ...');
    expect(morse.encode('شصضطظع')).toBe('---- -..- ...- ..- -.-- .-.-');
    expect(morse.encode('غفقكلم')).toBe('--. ..-. --.- -.- .-.. --');
    expect(morse.encode('نهويﺀ')).toBe('-. ..-.. .-- .. .');
  });
  it('decodes arabic alphabet', () => {
    const options = { priority: 8 };
    expect(morse.decode('.- -... - -.-. .--- ....', options)).toBe('ابتثجح');
    expect(morse.decode('--- -.. --.. .-. ---. ...', options)).toBe('خدذرزس');
    expect(morse.decode('---- -..- ...- ..- -.-- .-.-', options)).toBe('شصضطظع');
    expect(morse.decode('--. ..-. --.- -.- .-.. --', options)).toBe('غفقكلم');
    expect(morse.decode('-. ..-.. .-- .. .', options)).toBe('نهويﺀ');
  });
  it('encodes persian alphabet', () => {
    const options = { priority: 9 };
    expect(morse.encode('ابپتثج', options)).toBe('.- -... .--. - -.-. .---');
    expect(morse.encode('چحخدذر', options)).toBe('---. .... -..- -.. ...- .-.');
    expect(morse.encode('زژسشصض', options)).toBe('--.. --. ... ---- .-.- ..-..');
    expect(morse.encode('طظعغفق', options)).toBe('..- -.-- --- ..-- ..-. ---...');
    expect(morse.encode('کگلمنو', options)).toBe('-.- --.- .-.. -- -. .--');
    expect(morse.encode('هی', options)).toBe('. ..');
  });
  it('decodes persian alphabet', () => {
    const options = { priority: 9 };
    expect(morse.decode('.- -... .--. - -.-. .---', options)).toBe('ابپتثج');
    expect(morse.decode('---. .... -..- -.. ...- .-.', options)).toBe('چحخدذر');
    expect(morse.decode('--.. --. ... ---- .-.- ..-..', options)).toBe('زژسشصض');
    expect(morse.decode('..- -.-- --- ..-- ..-. ---...', options)).toBe('طظعغفق');
    expect(morse.decode('. ..', options)).toBe('هی');
  });
  it('encodes japanese alphabet', () => {
    const options = { priority: 10, dash: '－', dot: '・', separator: '　' };
    expect(morse.encode('アカサタナハ', options)).toBe('－－・－－　・－・・　－・－・－　－・　・－・　－・・・');
    expect(morse.encode('マヤラワイキ', options)).toBe('－・・－　・－－　・・・　－・－　・－　－・－・・');
    expect(morse.encode('シチニヒミリ', options)).toBe('－－・－・　・・－・　－・－・　－－・・－　・・－・－　－－・');
    expect(morse.encode('ヰウクスツヌ', options)).toBe( '・－・・－　・・－　・・・－　－－－・－　・－－・　・・・・');
    expect(morse.encode('フムユルンエ', options)).toBe('－－・・　－　－・・－－　－・－－・　・－・－・　－・－－－');
    expect(morse.encode('ケセテネヘメ', options)).toBe('－・－－　・－－－・　・－・－－　－－・－　・　－・・・－');
    expect(morse.encode('レヱ、オコソ', options)).toBe('－－－　・－－・・　・－・－・－　・－・・・　－－－－　－－－・');
    expect(morse.encode('トノホモヨロ', options)).toBe('・・－・・　・・－－　－・・　－・・－・　－－　・－・－');
    expect(morse.encode('ヲ゛゜。ー', options)).toBe('・－－－　・・　・・－－・　・－・－・・　・－－・－');
    expect(morse.encode('（）', options)).toBe('－・－－・－　・－・・－・');
  });
  it('decodes japanese alphabet', () => {
    const options = { priority: 10, dash: '－', dot: '・', separator: '　' };
    expect(morse.decode('－－・－－　・－・・　－・－・－　－・　・－・　－・・・', options)).toBe('アカサタナハ');
    expect(morse.decode('－・・－　・－－　・・・　－・－　・－　－・－・・', options)).toBe('マヤラワイキ');
    expect(morse.decode('－－・－・　・・－・　－・－・　－－・・－　・・－・－　－－・', options)).toBe('シチニヒミリ');
    expect(morse.decode('・－・・－　・・－　・・・－　－－－・－　・－－・　・・・・', options)).toBe('ヰウクスツヌ');
    expect(morse.decode('－－・・　－　－・・－－　－・－－・　・－・－・　－・－－－', options)).toBe('フムユルンエ');
    expect(morse.decode('－・－－　・－－－・　・－・－－　－－・－　・　－・・・－', options)).toBe('ケセテネヘメ');
    expect(morse.decode('－－－　・－－・・　・－・－・－　・－・・・　－－－－　－－－・', options)).toBe('レヱ、オコソ');
    expect(morse.decode('・・－・・　・・－－　－・・　－・・－・　－－　・－・－', options)).toBe('トノホモヨロ');
    expect(morse.decode('・－－－　・・　・・－－・　・－・－・・　・－－・－', options)).toBe('ヲ゛゜。ー');
    expect(morse.decode('－・－－・－　・－・・－・', options)).toBe('（）');
  });
  it('encodes korean alphabet', () => {
    const options = { priority: 11 };
    expect(morse.encode('ㄱㄴㄷㄹㅁㅂ', options)).toBe('.-.. ..-. -... ...- -- .--');
    expect(morse.encode('ㅅㅇㅈㅊㅋㅌ', options)).toBe('--. -.- .--. -.-. -..- --..');
    expect(morse.encode('ㅍㅎㅏㅑㅓㅕ', options)).toBe('--- .--- . .. - ...');
    expect(morse.encode('ㅗㅛㅜㅠㅡㅣ', options)).toBe('.- -. .... .-. -.. ..-');
  });
  it('decodes korean alphabet', () => {
    const options = { priority: 11 };
    expect(morse.decode('.-.. ..-. -... ...- -- .--', options)).toBe('ㄱㄴㄷㄹㅁㅂ');
    expect(morse.decode('--. -.- .--. -.-. -..- --..', options)).toBe('ㅅㅇㅈㅊㅋㅌ');
    expect(morse.decode('--- .--- . .. - ...', options)).toBe('ㅍㅎㅏㅑㅓㅕ');
    expect(morse.decode('.- -. .... .-. -.. ..-', options)).toBe('ㅗㅛㅜㅠㅡㅣ');
  });
  it('encodes thai alphabet', () => {
    const options = { priority: 12 };
    expect(morse.encode('กขคง', options)).toBe('--. -.-. -.- -.--.');
    expect(morse.encode('จฉชซญด', options)).toBe('-..-. ---- -..- --.. .--- -..');
    expect(morse.encode('ตถทนบ', options)).toBe('- -.-.. -..-- -. -...');
    expect(morse.encode('ปผฝพฟ', options)).toBe('.--. --.- -.-.- .--.. ..-.');
    expect(morse.encode('มยรลว', options)).toBe('-- -.-- .-. .-.. .--');
    expect(morse.encode('สหอฮฤ', options)).toBe('... .... -...- --.-- .-.--');
    expect(morse.encode('ะาิีึืุูเแไโำ', options)).toBe('.-... .- ..-.. .. ..--. ..-- ..-.- ---. . .-.- .-..- --- ...-.');
    expect(morse.encode('่้๊๋', options)).toBe('..- ...- --... .-.-.');
    expect(morse.encode('ั็์ๆฯ', options)).toBe('.--.- ---.. --..- -.--- --.-.');
  });
  it('decodes thai alphabet', () => {
    const options = { priority: 12 };
    expect(morse.decode('--. -.-. -.- -.--.', options)).toBe('กขคง');
    expect(morse.decode('-..-. ---- -..- --.. .--- -..', options)).toBe('จฉชซญด');
    expect(morse.decode('- -.-.. -..-- -. -...', options)).toBe('ตถทนบ');
    expect(morse.decode('.--. --.- -.-.- .--.. ..-.', options)).toBe('ปผฝพฟ');
    expect(morse.decode('-- -.-- .-. .-.. .--', options)).toBe('มยรลว');
    expect(morse.decode('... .... -...- --.-- .-.--', options)).toBe('สหอฮฤ');
    expect(morse.decode('.-... .- ..-.. .. ..--. ..-- ..-.- ---. . .-.- .-..- --- ...-.', options)).toBe('ะาิีึืุูเแไโำ');
    expect(morse.decode('..- ...- --... .-.-.', options)).toBe('่้๊๋');
    expect(morse.decode('.--.- ---.. --..- -.--- --.-.', options)).toBe('ั็์ๆฯ');
  });
  it('returns mapped characters', () => {
    let characters = morse.characters();
    expect(characters[1]['A']).toBe('.-');
    expect(characters[2]['0']).toBe('-----');
    expect(characters[3]['.']).toBe('.-.-.-');
    expect(characters[4]['Ç']).toBe('-.-..');
    expect(characters[5]['Я']).toBe('.-.-');
    expect(characters[6]['Ω']).toBe('.--');
    expect(characters[7]['א']).toBe('.-');
    expect(characters[8]['ا']).toBe('.-');
    expect(characters[9]['ا']).toBe('.-');
    expect(characters[10]['ア']).toBe('--.--');
    expect(characters[11]['ㄱ']).toBe('.-..');
    expect(characters[12]['ก']).toBe('--.');
    characters = morse.characters({ dash: '–', dot: '•' });
    expect(characters[1]['A']).toBe('•–');
    expect(characters[2]['0']).toBe('–––––');
    expect(characters[3]['.']).toBe('•–•–•–');
    expect(characters[4]['Ç']).toBe('–•–••');
    expect(characters[5]['Я']).toBe('•–•–');
    expect(characters[6]['Ω']).toBe('•––');
    expect(characters[7]['א']).toBe('•–');
    expect(characters[8]['ا']).toBe('•–');
    expect(characters[9]['ا']).toBe('•–');
    expect(characters[10]['ア']).toBe('––•––');
    expect(characters[11]['ㄱ']).toBe('•–••');
    expect(characters[12]['ก']).toBe('––•');
  });
  it('trims and removes multiple spaces', () => {
    expect(morse.encode(' hello   there ')).toBe('.... . .-.. .-.. --- / - .... . .-. .');
    expect(morse.decode(' --. .   -. . .-. .- .-.. / -.- . -. --- -... .. ')).toBe('GENERAL KENOBI');
  });

  describe('regression', () => {
    it('decodes empty / whitespace-only input to an empty string (B16)', () => {
      expect(morse.decode('')).toBe('');
      expect(morse.decode('    ')).toBe('');
    });

    it('does not leak prototype members when decoding (B5)', () => {
      expect(morse.decode('constructor')).toBe('#');
      expect(morse.decode('toString')).toBe('#');
      expect(morse.decode('hasOwnProperty')).toBe('#');
      expect(morse.decode('__proto__')).toBe('#');
    });

    it('round-trips word spacing with a custom separator (B6)', () => {
      const options = { separator: '|' };
      const encoded = morse.encode('a b c', options);
      expect(morse.decode(encoded, options)).toBe('A B C');
    });

    it('rejects a custom space/separator that is indistinguishable from a code (B6/B9)', () => {
      // space '.-' would collide with A's morse code -> ambiguous, so reject it.
      expect(() => morse.decode('.-', { space: '.-' })).toThrow();
      expect(() => morse.encode('A B', { separator: '..' })).toThrow();
    });

    it('throws when separator and space are the same symbol (B9)', () => {
      expect(() => morse.encode('HI BY', { separator: '|', space: '|' })).toThrow();
    });

    it('rejects a separator that is an encodable character (round2 #2)', () => {
      expect(() => morse.encode('A B', { separator: 'X' })).toThrow();
      expect(() => morse.encode('A B', { separator: '/' })).toThrow(); // '/' is punctuation
    });

    it('rejects a code-like invalid marker but allows empty (round2 #4)', () => {
      expect(() => morse.encode('x', { invalid: '.-' })).toThrow();
      expect(() => morse.encode('x', { invalid: '' })).not.toThrow();
    });

    it('drops unknown characters cleanly with no phantom separators (round3 #1)', () => {
      expect(morse.encode('A€B', { invalid: '' })).toBe('.- -...');
      expect(morse.encode('A€B', { invalid: '', separator: '|' })).toBe('.-|-...');
      expect(morse.encode('AB€', { invalid: '', separator: '|' })).toBe('.-|-...');
      expect(morse.encode('A€€€B', { invalid: '' })).toBe('.- -...');
    });

    it('round-trips a realistic mixed character-set string (retry-2)', () => {
      // exercises the cross-set priority fallthrough (letters + numbers + punctuation)
      expect(morse.decode(morse.encode('SOS 911!'))).toBe('SOS 911!');
      expect(morse.decode(morse.encode('Hello, World!'))).toBe('HELLO, WORLD!');
    });

    it('decode drops unrecognized tokens in drop-unknown mode (retry)', () => {
      expect(morse.decode('.- ........ -...', { invalid: '' })).toBe('AB');
      expect(morse.decode('.- ........ -...')).toBe('A#B'); // default marker
    });

    it('characters(options, true) exposes the priority set under key "0" (retry)', () => {
      const withPriority = morse.characters({ priority: 5 }, true);
      expect(withPriority['0']['А']).toBe('.-'); // Cyrillic А via priority set
      expect(morse.characters()['0']).toBeUndefined(); // omitted by default
    });

    it('rejects a separator/space mixing whitespace with other characters (round3 #2)', () => {
      expect(() => morse.encode('A B', { separator: ' / ' })).toThrow();
      expect(() => morse.encode('A B', { space: ' // ', separator: '|' })).toThrow();
      expect(() => morse.encode('A B', { separator: ' ' })).not.toThrow();
    });

    it('rejects a multi-character separator/space (round4 #1)', () => {
      expect(() => morse.encode('A B', { separator: 'XX' })).toThrow();
      expect(() => morse.encode('A B', { space: '##', separator: '|' })).toThrow();
    });

    it('rejects dot/dash containing the space or separator symbol (round5 #1)', () => {
      expect(() => morse.encode('T', { dash: '-/-' })).toThrow(); // contains space '/'
      expect(() => morse.encode('E', { dot: '. .' })).toThrow(); // contains separator ' '
    });

    it('defaults out-of-range/non-integer priority to 1 (round6)', () => {
      // خ is shared between Arabic(8) and Persian(9); priority:9 picks Persian.
      expect(morse.encode('خ', { priority: 9 })).toBe('-..-');
      // invalid priorities must NOT silently land on a wrong alphabet.
      const arabicDefault = morse.encode('خ', { priority: 8 });
      expect(morse.encode('خ', { priority: 13 })).toBe(morse.encode('خ'));
      expect(morse.encode('خ', { priority: 9.5 })).toBe(morse.encode('خ'));
      expect(morse.encode('خ', { priority: 9 })).not.toBe(arabicDefault);
    });

    it('does not turn a stray combining mark on a non-Japanese base into a voicing tone (round6)', () => {
      // Latin A + combining katakana voiced mark -> mark stays invalid.
      expect(morse.encode(String.fromCodePoint(0x41, 0x3099))).toBe('.- #');
    });

    it('drops orphaned word-gaps in drop-unknown mode (round5 #5)', () => {
      expect(morse.encode('# A', { invalid: '' })).toBe('.-');
      expect(morse.encode('A #', { invalid: '' })).toBe('.-');
      expect(morse.encode('# #', { invalid: '' })).toBe('');
      expect(morse.decode(morse.encode('A #', { invalid: '' }))).toBe('A');
    });

    it('trims boundary whitespace with a custom separator (round4 #2/#3)', () => {
      expect(morse.encode('  AB  ', { separator: '|' })).toBe('.-|-...');
      expect(morse.encode('   ', { separator: '|' })).toBe('');
      expect(morse.decode('  .-  ', { separator: '|' })).toBe('A');
      expect(morse.decode(morse.encode('  A B  ', { separator: '|' }), { separator: '|' })).toBe('A B');
    });

    it('treats canonically-equivalent NFD and NFC Latin identically (round4 #4)', () => {
      const nfc = morse.encode('Á'); // Á precomposed
      const nfd = morse.encode('Á'); // A + combining acute
      void nfc;
      void nfd;
      const composed = morse.encode(String.fromCodePoint(0x00c1)); // Á precomposed (NFC)
      const decomposed = morse.encode(String.fromCodePoint(0x41, 0x0301)); // A + combining acute (NFD)
      expect(decomposed).toBe(composed);
      expect(composed).toBe('.--.-');
    });

    it('encodes correctly when dot/dash contain the internal 0/1 sentinels (B4-binary)', () => {
      // dot='1', dash='0' must not be corrupted by the code-substitution step.
      expect(morse.encode('A', { dot: '1', dash: '0' })).toBe('10'); // A = 01 internal -> dot,dash
      expect(morse.decode('10', { dot: '1', dash: '0' })).toBe('A');
      expect(morse.decode(morse.encode('SOS', { dot: '1', dash: '0' }), { dot: '1', dash: '0' })).toBe('SOS');
    });

    it('encodes precomposed (NFC) katakana such as ガ (B2)', () => {
      const options = { priority: 10, dash: '－', dot: '・', separator: '　' };
      // precomposed ガ decomposes to base カ (・－・・) + dakuten ゛ (・・)
      expect(morse.encode('ガ', options)).toBe('・－・・　・・');
      // base katakana still encodes as before
      expect(morse.encode('カ', options)).toBe('・－・・');
    });

    it('does not break precomposed Latin keys when normalizing (B2)', () => {
      expect(morse.encode('ÃÁÅÀÂÄ')).toBe('.--.- .--.- .--.- .--.- .--.- .-.-');
    });

    it('encodes decomposed (NFD) katakana as well as precomposed (B2)', () => {
      const options = { priority: 10, dash: '－', dot: '・', separator: '　' };
      const decomposed = 'ガ'; // カ + combining dakuten -> same as precomposed ガ
      expect(morse.encode(decomposed, options)).toBe('・－・・　・・');
    });

    it('uppercases deterministically regardless of locale (B4)', () => {
      expect(morse.encode('i')).toBe('..');
      expect(morse.encode('istanbul')).toBe('.. ... - .- -. -... ..- .-..');
      // Guard against regressing to toLocaleUpperCase (which would break under tr-TR).
      const spy = vi.spyOn(String.prototype, 'toLocaleUpperCase');
      morse.encode('istanbul');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('drops unknown characters when invalid is empty (B7)', () => {
      expect(morse.encode('×')).toBe('#');
      expect(morse.encode('×', { invalid: '' })).toBe('');
    });

    it('throws on colliding dot/dash/separator symbols (B9)', () => {
      expect(() => morse.encode('A', { dot: '.', dash: '.' })).toThrow();
      expect(() => morse.encode('A', { separator: '.' })).toThrow();
      expect(() => morse.encode('A', { space: '-' })).toThrow();
    });
  });
});
