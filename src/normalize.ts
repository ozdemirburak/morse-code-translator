// Folds text into the forms the character tables are keyed by. Every rule here
// maps a character to the one Morse operators actually send for it, so encode()
// output for characters that already had a table key never changes.

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
const KANA_THEN_MARK = /(?<=[\u3041-\u3096\u30A1-\u30FA\u30FC])[\u3099\u309A]/g;
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
      .replace(KANA_THEN_MARK, toStandaloneMark)
      .replace(HEBREW_MARKS, '')
      .replace(ARABIC_MARKS, '')
      .replace(EASTERN_DIGITS, toDigit)
      .replace(THAI_SARA_AM, '\u0E33')
      // The tonos is not transmitted in Morse; the receiver infers it.
      .replace(GREEK_WITH_MARKS, (letter) => letter.normalize('NFD').replace(COMBINING_MARKS, ''))
  ]
    .map(foldCharacter)
    .join('');
