import { describe, it, expect, expectTypeOf } from 'vitest';
import morse, { type MorseOptions } from '../../../src/index';
import getOptions from '../../../src/options';
import { baseCharacters } from '../../../src/characters';

const KOREAN = { priority: 11 };
const JAPANESE = { priority: 10 };
const roundTrip = (text: string, options: MorseOptions) => morse.decode(morse.encode(text, options), options);

// 8.0.x: decode() gave the parts that encode() had split the text into:
// 한국어 came back as ㅎㅏㄴㄱㅜㄱㅇㅓ and がっこう as カ゛ツコウ.
describe('regression: decode() joins Hangul jamo into syllables', () => {
  it.each([
    '한국어', '안녕하세요', '학교', '대한민국', '모스 부호', '감사합니다',
    // Final consonants: single, double and clusters.
    '닭', '값', '삶', '앉다', '많다', '읽기', '밟다', '있습니다', '없습니다', '했다', '떡볶이', '밖',
    // Compound vowels.
    '과자', '왜', '의사', '원', '웨이터', '위', '외국', '얘기', '예',
    // A double consonant that cannot be a final starts the syllable.
    '또', '때', '쓰다', '까지', '함께', '빵', '찌개', '옆쪽', '김씨',
    // Other text stays where it is.
    '서울 2024, 한국!', '한 (글)',
  ])('%s', (text) => {
    // Observed for 한국어: 'ㅎㅏㄴㄱㅜㄱㅇㅓ'.
    expect(roundTrip(text, KOREAN)).toBe(text);
  });

  it('reads a consonant before a vowel as the start of a new syllable', () => {
    expect(morse.decode('.--- . ..-. .-.. .... .-.. -.- -', KOREAN)).toBe('한국어');
    expect(morse.decode('.-.. . .-.. .', KOREAN)).toBe('가가');
    expect(morse.decode('-.- . ..-. .', KOREAN)).toBe('아나');
    expect(morse.decode('-.- . ..-. -.- .', KOREAN)).toBe('안아');
    expect(morse.decode('-.- . ..-. .--. . -.- .', KOREAN)).toBe('안자아'); // ㄴㅈ before a vowel is not ㄵ
  });

  it('joins only the vowels that encode() splits (ㅐ and ㅔ have codes of their own)', () => {
    expect(morse.decode('.-.. .- .', KOREAN)).toBe('과');
    expect(morse.decode('.-.. --.-', KOREAN)).toBe('개');
    // ㄱ ㅏ ㅣ is not 개: encode('개') gives other codes.
    expect(morse.decode('.-.. . ..-', KOREAN)).toBe('가ㅣ');
  });

  it('cannot restore a double consonant between two vowels: it stays final + initial', () => {
    // ㄲ ㄸ ㅃ ㅆ ㅉ are sent as two basic jamo, like a final and an initial.
    expect(roundTrip('아까', KOREAN)).toBe('악가');
    expect(roundTrip('오빠', KOREAN)).toBe('옵바');
    expect(roundTrip('아저씨', KOREAN)).toBe('아젓시');
    expect(roundTrip('할까', KOREAN)).toBe('핡가');
    // The Morse code is the same, so the next round trip changes nothing.
    for (const text of ['아까', '오빠', '아저씨', '할까', '어떻게', '진짜']) {
      expect(morse.encode(roundTrip(text, KOREAN), KOREAN), text).toBe(morse.encode(text, KOREAN));
    }
  });

  it('leaves jamo that make no syllable as they are', () => {
    expect(roundTrip('ㅋㅋㅋ', KOREAN)).toBe('ㅋㅋㅋ');
    expect(roundTrip('ㅠㅠ', KOREAN)).toBe('ㅠㅠ');
    expect(roundTrip('ㄱㄱ', KOREAN)).toBe('ㄱㄱ');
    expect(roundTrip('ㅏ', KOREAN)).toBe('ㅏ');
    expect(roundTrip('ㅗㅏ', KOREAN)).toBe('ㅗㅏ');
    expect(roundTrip('가ㅏ', KOREAN)).toBe('가ㅏ');
    expect(roundTrip('ㄱㄱㄱ가', KOREAN)).toBe('ㄱㄱ까');
    expect(morse.decode('.-.. / .', KOREAN)).toBe('ㄱ ㅏ'); // a word gap ends a syllable
    expect(morse.decode('.-.. ........ .', KOREAN)).toBe('ㄱ#ㅏ');
  });

  it('gives the same Morse code again for any jamo text', () => {
    const jamo = Object.keys(baseCharacters['11']);
    let seed = 7;
    const next = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) | 0;
      return (seed >>> 0) / 2 ** 32;
    };
    for (let n = 0; n < 3000; n++) {
      const text = Array.from({ length: 1 + Math.floor(next() * 9) }, () => jamo[Math.floor(next() * jamo.length)]).join('');
      const code = morse.encode(text, KOREAN);
      expect(morse.encode(morse.decode(code, KOREAN), KOREAN), text).toBe(code);
      expect(morse.decode(code, { ...KOREAN, compose: false }), text).toBe(text);
    }
  });
});

describe('regression: decode() joins a kana and its voiced mark', () => {
  it('gives the voiced and the semi-voiced kana', () => {
    // Observed: 'カ゛ツコウ'. The small っ cannot be restored.
    expect(roundTrip('がっこう', JAPANESE)).toBe('ガツコウ');
    expect(roundTrip('パン', JAPANESE)).toBe('パン');
    expect(roundTrip('ヴァイオリン', JAPANESE)).toBe('ヴアイオリン');
    expect(roundTrip('ざじずぜぞ だぢづでど ばびぶべぼ ぱぴぷぺぽ', JAPANESE)).toBe('ザジズゼゾ ダヂヅデド バビブベボ パピプペポ');
    expect(morse.decode('.-.. .. .. / -... ..--.', JAPANESE)).toBe('ガ゛ パ');
  });

  it('keeps a mark that makes no kana, and all other text', () => {
    expect(roundTrip('ン゛', JAPANESE)).toBe('ン゛');
    expect(roundTrip('カ゜', JAPANESE)).toBe('カ゜');
    expect(roundTrip('゛カ', JAPANESE)).toBe('゛カ');
    expect(roundTrip('ー゛', JAPANESE)).toBe('ー゛');
    expect(roundTrip('トウキヨウ、2024。', JAPANESE)).toBe('トウキヨウ、2024。');
  });

  it('cannot restore small kana and hiragana', () => {
    expect(roundTrip('きゃっしゅ', JAPANESE)).toBe('キヤツシユ');
    expect(roundTrip('ひらがな', JAPANESE)).toBe('ヒラガナ');
  });

  it('gives the same Morse code again for any kana text', () => {
    const kana = Object.keys(baseCharacters['10']);
    let seed = 11;
    const next = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) | 0;
      return (seed >>> 0) / 2 ** 32;
    };
    for (let n = 0; n < 2000; n++) {
      const text = Array.from({ length: 1 + Math.floor(next() * 8) }, () => kana[Math.floor(next() * kana.length)]).join('');
      const code = morse.encode(text, JAPANESE);
      expect(morse.encode(morse.decode(code, JAPANESE), JAPANESE), text).toBe(code);
    }
  });
});

describe('regression: compose option', () => {
  it('compose: false gives one character for each code, as 8.0 did', () => {
    expect(morse.decode(morse.encode('한국어', KOREAN), { ...KOREAN, compose: false })).toBe('ㅎㅏㄴㄱㅜㄱㅇㅓ');
    expect(morse.decode(morse.encode('がっこう', JAPANESE), { ...JAPANESE, compose: false })).toBe('カ゛ツコウ');
  });

  it('is on by default and for every value but false', () => {
    expectTypeOf<{ compose: boolean }>().toMatchTypeOf<MorseOptions>();
    expect(getOptions({}).compose).toBe(true);
    expect(getOptions({ compose: undefined }).compose).toBe(true);
    expect(getOptions({ compose: null as unknown as boolean }).compose).toBe(true);
    expect(getOptions({ compose: 0 as unknown as boolean }).compose).toBe(true);
    expect(getOptions({ compose: false }).compose).toBe(false);
  });

  it('never joins the invalid marker, and an unknown code ends a syllable', () => {
    expect(morse.decode('x', { invalid: 'ㄱㅏ' })).toBe('ㄱㅏ');
    expect(morse.decode('.-.. x', { ...KOREAN, invalid: 'ㅏ' })).toBe('ㄱㅏ');
    expect(morse.decode('.-.. x', { ...JAPANESE, invalid: '゛' })).toBe('カ゛');
    expect(morse.decode('.-.. x .', { ...KOREAN, invalid: '' })).toBe('ㄱㅏ');
    expect(morse.decode('.-.. . x .-.. .', { ...KOREAN, invalid: '?' })).toBe('가?가');
  });

  it('changes nothing for the other alphabets', () => {
    expect(morse.decode('... --- ...')).toBe('SOS');
    expect(morse.decode('... --- ...', { compose: false })).toBe('SOS');
    // Jamo and the kana marks only come out with their own priority.
    expect(morse.decode(morse.encode('한국', KOREAN))).toBe('JEFLHL');
    expect(morse.decode('.-.. ..')).toBe('LI');
    // Thai marks are not joined or moved.
    expect(roundTrip('น้ำ', { priority: 12 })).toBe('น้ำ');
  });
});
