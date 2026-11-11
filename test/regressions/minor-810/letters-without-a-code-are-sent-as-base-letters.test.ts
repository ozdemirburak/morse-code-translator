import { describe, it, expect, vi } from 'vitest';
import morse from '../../../src/index';

// 8.0.x: a letter that has no code gave the invalid marker, so common Czech,
// French, Hungarian, Portuguese, Romanian, Spanish and Vietnamese text had
// holes. Operators send such a letter as its base letter.
describe('regression: letters that have no code', () => {
  it.each([
    ['ď', 'D'], ['ň', 'N'], ['ř', 'R'], ['ť', 'T'], ['ů', 'U'], ['ý', 'Y'], ['î', 'I'], ['ÿ', 'Y'], ['ő', 'O'],
    ['ű', 'U'], ['õ', 'O'], ['ă', 'A'], ['ț', 'T'], ['ơ', 'O'], ['ư', 'U'], ['ả', 'A'], ['ạ', 'A'], ['í', 'I'],
    ['ú', 'U'], ['ě', 'E'], ['ī', 'I'], ['ķ', 'K'], ['ấ', 'A'], ['ệ', 'E'], ['ǿ', 'Ø'], ['œ', 'OE'], ['ĳ', 'IJ'],
  ])('sends %s as %s', (letter, base) => {
    // Observed: '#'.
    expect(morse.encode(letter)).toBe(morse.encode(base));
    expect(morse.encode(letter.toUpperCase())).toBe(morse.encode(base));
    expect(morse.encode(letter.normalize('NFD'))).toBe(morse.encode(base));
  });

  it('sends whole sentences with no invalid marker', () => {
    expect(morse.encode('Příliš žluťoučký kůň úpěl ďábelské ódy')).not.toContain('#');
    expect(morse.encode('Árvíztűrő tükörfúrógép')).not.toContain('#');
    expect(morse.encode('Tiếng Việt, Đà Nẵng')).not.toContain('#');
    expect(morse.encode('El pingüino Wenceslao hizo kilómetros bajo exhaustiva lluvia y frío, añoraba a su querido cachorro')).not.toContain('#');
    expect(morse.encode('Cœur, île, Noël, où, ÿ')).not.toContain('#');
  });

  it('drops a combining mark that could not join the letter before it', () => {
    // Observed: '-..- #'.
    expect(morse.encode('x́')).toBe('-..-');
    expect(morse.encode('é́')).toBe('..-..');
    expect(morse.encode('ạ́')).toBe('.-');
    // A Russian stress mark (и + U+0301 has no precomposed form).
    expect(morse.encode('Росси́я', { priority: 5 })).toBe(morse.encode('Россия', { priority: 5 }));
  });

  it('keeps a mark that has no letter before it, and a letter with no usable base, unknown', () => {
    expect(morse.encode('́')).toBe('#');
    expect(morse.encode('A ́')).toBe('.- / #');
    expect(morse.encode('中́')).toBe('#');
    expect(morse.encode('Ǯ')).toBe('#'); // its base Ʒ has no code either
    expect(morse.encode('Ə')).toBe('#');
  });

  it('sends Arabic letters that have no code as their base letter', () => {
    const arabic = { priority: 8 };
    // Hamza on a seat: the bare seat letter. Observed: '#'.
    for (const [letter, base] of [['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ؤ', 'و'], ['ئ', 'ي'], ['ة', 'ه'], ['ى', 'ي']]) {
      expect(morse.encode(letter, arabic), letter).toBe(morse.encode(base, arabic));
    }
    expect(morse.encode('ة', arabic)).toBe('..-..');
    expect(morse.encode('ى', arabic)).toBe('..');
    expect(morse.encode('اللغة العربية إلى المدرسة، سؤال، مسئول', arabic)).not.toContain('#');
  });

  it('sends the Persian forms of heh as heh', () => {
    const persian = { priority: 9 };
    for (const letter of ['ة', 'ھ', 'ۀ']) {
      expect(morse.encode(letter, persian), letter).toBe('.');
    }
    expect(morse.encode('خانۀ ما', persian)).toBe(morse.encode('خانه ما', persian));
  });

  it('gives Đ and Û the codes of the Latin Extended source, after the letters that had them', () => {
    // Observed: '#'.
    expect(morse.encode('Đ')).toBe('..-..');
    expect(morse.encode('đ')).toBe('..-..');
    expect(morse.encode('û')).toBe('..--');
    // Appended keys: decode() still gives the first letter of the code.
    expect(morse.decode('..-..')).toBe('É');
    expect(morse.decode('..--')).toBe('Ü');
    expect(morse.decode('..-.. ..--', { priority: 4 })).toBe('ÉÜ');
    const keys = Object.keys(morse.characters()['4']);
    expect(keys.slice(-2)).toEqual(['Đ', 'Û']);
  });

  it('changes nothing for a letter that has a code of its own', () => {
    expect(morse.encode('éñüçöşğİ')).toBe('..-.. --.-- ..-- -.-.. ---. .--.. --.-. .-..-');
    expect(morse.encode('й', { priority: 5 })).toBe('.---');
    // Thai combining marks have codes of their own.
    expect(morse.encode('น้ำ', { priority: 12 })).toBe('-. ...- ...-.');
    expect(morse.encode('กิ่ง', { priority: 12 })).toBe('--. ..-.. ..- -.--.');
    // Kana marks keep their rules: voiced kana is kana + ゛, and a kana mark
    // after another letter stays unknown.
    expect(morse.encode('ガ', { priority: 10 })).toBe('.-.. ..');
    expect(morse.encode('A゙')).toBe('.- #');
    expect(morse.encode('한', { priority: 11 })).toBe('.--- . ..-.');
  });

  it('gives the same results in an engine without Intl.Segmenter (Firefox before 125)', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
    vi.resetModules();
    Reflect.deleteProperty(Intl, 'Segmenter');
    try {
      const fresh = (await import('../../../src/index')).default;
      expect(fresh.encode('x́ ř œ Росси́я')).toBe(morse.encode('x́ ř œ Росси́я'));
      expect(fresh.encode('x́ ř œ')).toBe('-..- / .-. / --- .');
      expect(fresh.encode('أ ة', { priority: 8 })).toBe('.- / ..-..');
      expect(fresh.encode('’ – … 2%')).toBe(morse.encode("' - ... 2-0/0"));
      expect(fresh.decode(fresh.encode('한국어', { priority: 11 }), { priority: 11 })).toBe('한국어');
      expect(fresh.decode('---.', { prefer: 'Ö' })).toBe('Ö');
    } finally {
      if (descriptor) Object.defineProperty(Intl, 'Segmenter', descriptor);
      vi.resetModules();
    }
  });

  it('still reads a separator that is a combining mark as the separator', () => {
    // The separator stands for the gap between characters, also in the text (as in 8.0).
    // (Marks that have no precomposed letter with x: NFC joins the others to the x, as in 8.0.)
    for (const separator of ['\u0301', '\u0304', '\u0327']) {
      const options = { separator };
      expect(morse.encode(`x${separator}y`, options), separator).toBe(['-..-', '/', '-.--'].join(separator));
      expect(morse.decode(morse.encode(`x${separator}y`, options), options), separator).toBe('X Y');
      expect(morse.encode('hi there', options), separator).toBe(['....', '..', '/', '-', '....', '.', '.-.', '.'].join(separator));
    }
    // Another mark is dropped as with every separator.
    expect(morse.encode('x\u0302y', { separator: '\u0301' })).toBe('-..-\u0301-.--');
  });

  it('keeps a custom separator out of these rules', () => {
    // The separator is not text, also when it is a letter that has a base letter.
    expect(morse.encode('A B', { separator: 'ř' })).toBe('.-ř/ř-...');
    expect(morse.encode('ARB', { separator: 'ř' })).toBe('.-ř.-.ř-...');
  });
});
