// Folds text into the forms the character tables are keyed by. Every rule here
// maps a character to the one Morse operators actually send for it, so encode()
// output for characters that already had a table key never changes.
// composeText() at the end is the way back for decode().

// Hangul syllable decomposition (Unicode 3.12) into compatibility jamo.
const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNGSEONG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONGSEONG = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];

// Korean Morse sends double consonants, consonant clusters and compound vowels
// as their basic jamo.
const COMPOUND_JAMO: Record<string, string> = {
  'ㄲ': 'ㄱㄱ', 'ㄸ': 'ㄷㄷ', 'ㅃ': 'ㅂㅂ', 'ㅆ': 'ㅅㅅ', 'ㅉ': 'ㅈㅈ',
  'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ',
  'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
  'ㅒ': 'ㅑㅣ', 'ㅖ': 'ㅕㅣ', 'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ',
  'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ'
};

const splitJamo = (jamo: string): string => COMPOUND_JAMO[jamo] ?? jamo;

const decomposeHangul = (code: number): string => {
  const index = code - HANGUL_BASE;
  return (
    splitJamo(CHOSEONG[Math.floor(index / 588)]) +
    splitJamo(JUNGSEONG[Math.floor((index % 588) / 28)]) +
    splitJamo(JONGSEONG[index % 28])
  );
};

// Wabun sends small kana as their full-size forms.
const SMALL_KANA: Record<string, string> = {
  'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ', 'ッ': 'ツ',
  'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ヮ': 'ワ', 'ヵ': 'カ', 'ヶ': 'ケ'
};

const HIRAGANA = /[ぁ-ゖ]/; // U+3041-3096, maps to katakana at +0x60
const KATAKANA = /[゠-ヿ]/;
const KATAKANA_ITERATION = /[ヽヾ]/; // U+30FD/U+30FE: decompose to a non-letter base, leave them alone
// Full-width ASCII (U+FF01-FF5E) and half-width kana (U+FF61-FF9F) fold to
// their usual forms (NFKC <wide>/<narrow> decompositions). The full-width
// parentheses U+FF08/FF09 are Japanese table keys, so they stay as they are.
const WIDTH_VARIANTS = /[\uFF01-\uFF07\uFF0A-\uFF5E\uFF61-\uFF9F]+/g;
// A combining voiced/semi-voiced mark that did not compose (after NFKC of
// half-width kana, or after kana that has no voiced form) is sent as the
// standalone mark. After other letters it stays unknown.
const COMBINING_KANA_MARK = /[\u3099\u309A]/g;
// The kana is captured and written back: a lookbehind does not compile in
// Safari before 16.4, and then the whole module fails to load.
const KANA_THEN_MARK = /([\u3041-\u3096\u30A1-\u30FA\u30FC])([\u3099\u309A])/g;
const toStandaloneMark = (mark: string): string => (mark === '\u3099' ? '\u309B' : '\u309C');
// Hebrew points and cantillation, Arabic harakat, leftover hamza/madda marks
// (NFC already joined them into the letters that have a precomposed form, such
// as أ; what is left is e.g. the Persian ezafe on ه) and the tatweel are not
// transmitted in Morse.
const HEBREW_MARKS = /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;
const ARABIC_MARKS = /[\u0640\u064B-\u065F\u0670]/g;
// Arabic-Indic, Persian and Thai digits are sent with the standard digit codes.
const EASTERN_DIGITS = /[\u0660-\u0669\u06F0-\u06F9\u0E50-\u0E59]/g;
const toDigit = (digit: string): string => String((digit.codePointAt(0) as number) & 0xf);
// Thai NIKHAHIT + SARA AA is SARA AM (its compatibility decomposition).
const THAI_SARA_AM = /\u0E4D\u0E32/g;
// Script variants of punctuation are sent as the standard punctuation:
// Arabic question mark, comma and semicolon, Hebrew maqaf.
const PUNCTUATION: Record<string, string> = { '\u061F': '?', '\u060C': ',', '\u061B': ';', '\u05BE': '-' };
// A Greek letter plus any combining marks after it (uppercasing can emit the
// marks as separate code points, e.g. ΐ -> Ϊ́).
const GREEK_WITH_MARKS = /[Ͱ-Ͽἀ-῿][̀-ͯ]*/g;
const COMBINING_MARKS = /[̀-ͯ]/g;

// What a character that has no code is sent as. encode() asks only after the
// table lookup failed, so the output for a table key never changes.
const SUBSTITUTES: Record<string, string> = {
  // Ligatures that Unicode cannot split into a base letter and a mark.
  'Œ': 'OE', 'Ĳ': 'IJ',
  // Teh marbuta and the Persian forms of heh are sent as heh, alef maksura as
  // yeh, like the usual Arabic text normalization does (a hamza on a seat falls
  // to the seat letter in baseLetter() below):
  // https://lucene.apache.org/core/9_0_0/analysis/common/org/apache/lucene/analysis/ar/ArabicNormalizer.html
  'ة': 'ه', 'ۀ': 'ه', 'ھ': 'ه', 'ى': 'ي',
  // ITU-R M.1677-1 has one signal for the "hyphen or dash or subtraction sign",
  // one for the apostrophe and one for inverted commas (1.1.3). So the signs
  // that phones and word processors write are sent as ' " and -:
  // ‘ ’ ‚ ‛ ‹ › ´ ` and the modifier letter apostrophe ʼ
  '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'", '\u2039': "'", '\u203A': "'", '\u00B4': "'", '`': "'", '\u02BC': "'",
  // “ ” „ ‟ « »
  '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"', '\u00AB': '"', '\u00BB': '"',
  // Hebrew geresh and gershayim (script variants, like the maqaf above)
  '\u05F3': "'", '\u05F4': '"',
  // hyphen, non-breaking hyphen, figure dash, en dash, em dash, horizontal bar, minus sign
  '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2013': '-', '\u2014': '-', '\u2015': '-', '\u2212': '-',
  // The minute and second signs are one and two apostrophes (3.5.1), the
  // multiplication sign is X (3.2.1), the ellipsis is three full stops.
  '\u2032': "'", '\u2033': "''", '\u00D7': 'X', '\u2026': '...'
};
// % and ‰ are sent as 0/0 and 0/00, joined to a number before them with a
// hyphen: "For 2%, transmit 2-0/0, and not 20/0" (ITU-R M.1677-1, 3.3).
// U+066A is the Arabic percent sign.
const PER_SIGNS: Record<string, string> = { '%': '0/0', '\u066A': '0/0', '\u2030': '0/00' };
const DIGIT = /^\d$/;
const LETTER = /^\p{L}$/u;
const MARKS = /\p{M}+/gu;

// A letter that has no code is sent as its base letter (ř -> R, ạ -> A, أ -> ا):
// operators omit a diacritic that has no code. Only for letters: the base of ≠
// is =, which is another sign.
const baseLetter = (character: string): string =>
  LETTER.test(character) ? character.normalize('NFD').replace(MARKS, '') : character;

// The characters to send for a character that has no code (itself if there is
// no rule). `previous` is the character that was sent before it.
export const substitute = (character: string, previous: string): string => {
  if (PER_SIGNS[character]) {
    return (DIGIT.test(previous) ? '-' : '') + PER_SIGNS[character];
  }
  return SUBSTITUTES[character] ?? baseLetter(character);
};

// Decompose precomposed (NFC) katakana such as ガ (U+30AC) into base kana + a
// standalone voiced/semi-voiced mark (カ + ゛) so they match the Japanese map.
const foldKatakana = (character: string): string => {
  if (KATAKANA_ITERATION.test(character)) {
    return character;
  }
  return [...character.normalize('NFD').replace(/゙/g, '゛').replace(/゚/g, '゜')]
    .map((part) => SMALL_KANA[part] ?? part)
    .join('');
};

const foldCharacter = (character: string): string => {
  const code = character.codePointAt(0) as number;
  if (code >= HANGUL_BASE && code <= HANGUL_END) {
    return decomposeHangul(code);
  }
  if (HIRAGANA.test(character)) {
    return foldKatakana(String.fromCodePoint(code + 0x60));
  }
  if (KATAKANA.test(character)) {
    return foldKatakana(character);
  }
  if (character === 'ẞ') {
    return 'SS';
  }
  if (PUNCTUATION[character]) {
    return PUNCTUATION[character];
  }
  return splitJamo(character);
};

export const normalizeText = (text: string): string =>
  // toUpperCase (not toLocaleUpperCase) keeps casing deterministic regardless of
  // the host locale (e.g. avoids the Turkish i -> İ mapping). NFC so
  // canonically-equivalent decomposed input (e.g. NFD 'A'+◌́) recomposes to its
  // precomposed key ('Á') before lookup.
  [
    ...text
      .toUpperCase()
      .replace(WIDTH_VARIANTS, (run) => run.normalize('NFKC').replace(COMBINING_KANA_MARK, toStandaloneMark))
      .normalize('NFC')
      .replace(KANA_THEN_MARK, (_, kana: string, mark: string) => kana + toStandaloneMark(mark))
      .replace(HEBREW_MARKS, '')
      .replace(ARABIC_MARKS, '')
      .replace(EASTERN_DIGITS, toDigit)
      .replace(THAI_SARA_AM, '\u0E33')
      // The tonos is not transmitted in Morse; the receiver infers it.
      .replace(GREEK_WITH_MARKS, (letter) => letter.normalize('NFD').replace(COMBINING_MARKS, ''))
  ]
    .map(foldCharacter)
    .join('');

// The way back for decode(): the parts that the folding above split are joined
// again where that has one reading.

// Basic jamo, as sent, to the double or compound jamo ('ㄱㄱ' -> 'ㄲ', 'ㅗㅏ' -> 'ㅘ').
const JOINED_JAMO: Record<string, string> = Object.fromEntries(
  Object.entries(COMPOUND_JAMO).map(([jamo, parts]) => [parts, jamo])
);
const joinJamo = (parts: string): string => JOINED_JAMO[parts] ?? parts;
// The jamo that have a code.
const CONSONANTS = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ';
const VOWELS = 'ㅏㅐㅑㅓㅔㅕㅗㅛㅜㅠㅡㅣ';
const ANY_JAMO = /[ㄱ-ㅣ]/;
const INITIALS = [...CHOSEONG];
const isInitial = (parts: string): boolean => INITIALS.includes(joinJamo(parts));
const isFinal = (parts: string): boolean => JONGSEONG.includes(joinJamo(parts));

// Joins jamo into syllables like an input method does: a consonant after a
// vowel is the final consonant of that syllable (two of them make a double or a
// cluster final, 닭), and the consonant directly before a vowel starts the next
// syllable. Double consonants were sent as two basic jamo, so ㄱㄱ between two
// vowels is read as final + initial (학교); the same code is also 하꾜, and 아까
// comes back as 악가. Two equal consonants that cannot be a final start a
// syllable as its double consonant (까, 함께). The result always encodes to the
// same Morse code.
const composeHangul = (text: string): string => {
  let composed = '';
  // The syllable in work, each part as the basic jamo that were sent.
  let initial = '';
  let vowel = '';
  let final = '';
  const flush = () => {
    if (vowel === '') {
      composed += initial; // consonants with no vowel stay jamo
    } else {
      const leadAndVowel = CHOSEONG.indexOf(joinJamo(initial)) * 21 + JUNGSEONG.indexOf(joinJamo(vowel));
      composed += String.fromCharCode(HANGUL_BASE + leadAndVowel * 28 + JONGSEONG.indexOf(joinJamo(final)));
    }
    initial = vowel = final = '';
  };
  for (const character of text) {
    if (CONSONANTS.includes(character)) {
      if (vowel !== '' && isFinal(final + character)) {
        final += character;
      } else if (vowel === '' && initial !== '' && isInitial(initial + character)) {
        initial += character;
      } else {
        flush();
        initial = character;
      }
    } else if (VOWELS.includes(character)) {
      if (initial !== '' && vowel === '') {
        vowel = character;
      } else if (vowel !== '' && final === '' && JOINED_JAMO[vowel + character]) {
        vowel += character;
      } else if (final !== '') {
        const next = final.slice(-1);
        final = final.slice(0, -1);
        flush();
        initial = next;
        vowel = character;
      } else {
        flush();
        composed += character; // a vowel with no consonant before it stays a jamo
      }
    } else {
      flush();
      composed += character;
    }
  }
  flush();
  return composed;
};

// A full-size katakana and the standalone mark after it are the voiced kana
// when Unicode has one (カ゛ -> ガ, ハ゜ -> パ, ウ゛ -> ヴ). Small kana and
// hiragana were sent as full-size katakana and cannot be restored.
const KANA_THEN_STANDALONE_MARK = /([\u30A1-\u30FA])([\u309B\u309C])/g;
const composeKana = (text: string): string =>
  text.replace(KANA_THEN_STANDALONE_MARK, (pair: string, kana: string, mark: string) => {
    const voiced = (kana + (mark === '\u309B' ? '\u3099' : '\u309A')).normalize('NFC');
    return voiced.length === 1 ? voiced : pair;
  });

export const composeText = (text: string): string => {
  const joined = composeKana(text);
  return ANY_JAMO.test(joined) ? composeHangul(joined) : joined;
};
