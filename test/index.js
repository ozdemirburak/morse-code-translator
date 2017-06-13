var t = require('assert');
var morsify = require('../index');

describe('morsify', function () {
  it('encodes english alphabet', function () {
    t.equal(morsify.encode('the quick brown fox jumps over the lazy dog'), '-/...././--.-/..-/../-.-./-.-/-.../.-./---/.--/-./..-./---/-..-/.---/..-/--/.--./.../---/...-/./.-./-/...././.-../.-/--../-.--/-../---/--.')
    t.equal(morsify.encode('the quick brown fox jumps over the lazy dog', { dash: '–', dot: '•', space: ' ' }), '– •••• • ––•– ••– •• –•–• –•– –••• •–• ––– •–– –• ••–• ––– –••– •––– ••– –– •––• ••• ––– •••– • •–• – •••• • •–•• •– ––•• –•–– –•• ––– ––•')
  });
  it('decodes english alphabet', function () {
    t.equal(morsify.decode('-/...././--.-/..-/../-.-./-.-/-.../.-./---/.--/-./..-./---/-..-/.---/..-/--/.--./.../---/...-/./.-./-/...././.-../.-/--../-.--/-../---/--.'), 'T H E Q U I C K B R O W N F O X J U M P S O V E R T H E L A Z Y D O G')
    t.equal(morsify.decode('– •••• • ––•– ••– •• –•–• –•– –••• •–• ––– •–– –• ••–• ––– –••– •––– ••– –– •––• ••• ––– •••– • •–• – •••• • •–•• •– ––•• –•–– –•• ––– ––•', {dash: '–', dot: '•', space: ' '}), 'T H E Q U I C K B R O W N F O X J U M P S O V E R T H E L A Z Y D O G')
  });
  it('encodes numbers', function () {
    t.equal(morsify.encode('0123456789'), '-----/.----/..---/...--/....-/...../-..../--.../---../----.');
  });
  it('decodes numbers', function () {
    t.equal(morsify.decode('-----/.----/..---/...--/....-/...../-..../--.../---../----.'), '0 1 2 3 4 5 6 7 8 9');
  });
  it('encodes punctuation', function () {
    t.equal(morsify.encode('.,?\'!/('), '.-.-.-/--..--/..--../.----./-.-.--/-..-./-.--.');
    t.equal(morsify.encode(')&:;=¿¡'), '-.--.-/.-.../---.../-.-.-./-...-/..-.-/--...-');
  });
  it('decodes punctuation', function () {
    t.equal(morsify.decode('.-.-.-/--..--/..--../.----./-.-.--/-..-./-.--.'), '. , ? \' ! / (');
    t.equal(morsify.decode('-.--.-/.-.../---.../-.-.-./-...-/..-.-/--...-'), ') & : ; = ¿ ¡');
  });
  it('encodes non-english alphabet', function () {
    t.equal(morsify.encode('ÃÁÅÀÂÄ'), '.--.-/.--.-/.--.-/.--.-/.--.-/.-.-');
    t.equal(morsify.encode('ĄÆÇĆĈČ'), '.-.-/.-.-/-.-../-.-../-.-../--.');
    t.equal(morsify.encode('ĐÐÈËĘÉ'), '..-../..--./.-..-/..-../..-../..-..');
    t.equal(morsify.encode('ÊĞĜĤİÏ'), '-..-./--.-./--.-./----/.-..-/-..--');
    t.equal(morsify.encode('ÌĴŁŃÑÓ'), '.---./.---./.-..-/--.--/--.--/---.');
    t.equal(morsify.encode('ÒÖÔØŚŞ'), '---./---./---./---./...-.../.--..');
    t.equal(morsify.encode('ȘŠŜßÞÜ'), '----/----/...-./.../.../.--../..--');
    t.equal(morsify.encode('ÙŬŽŹŻ'), '..--/..--/--..-/--..-./--..-');
  });
  it('decodes non-english alphabet', function () {
    var options = { priority: 4 };
    t.equal(morsify.decode('.--.-/.--.-/.--.-/.--.-/.--.-/.-.-', options), 'Ã Ã Ã Ã Ã Ä');
    t.equal(morsify.decode('.-.-/.-.-/-.-../-.-../-.-../--.', options), 'Ä Ä Ç Ç Ç Č');
    t.equal(morsify.decode('..-../..--./.-..-/..-../..-../..-..', options), 'Đ Ð È Đ Đ Đ');
    t.equal(morsify.decode('-..-./--.-./--.-./----/.-..-/-..--', options), 'Ê Ğ Ğ Ĥ È Ï');
    t.equal(morsify.decode('.---./.---./.-..-/--.--/--.--/---.', options), 'Ì Ì È Ń Ń Ó');
    t.equal(morsify.decode('----/----/...-./.../.../.--../..--', options), 'Ĥ Ĥ Ŝ S S Ş Ü');
    t.equal(morsify.decode('..--/..--/--..-/--..-./--..-', options), 'Ü Ü Ž Ź Ž');
  });
  it('encodes cyrilic alphabet', function () {
    t.equal(morsify.encode('АБВГДЕ'), '.-/-.../.--/--./-../.');
    t.equal(morsify.encode('ЖЗИЙКЛ'), '...-/--../../.---/-.-/.-..');
    t.equal(morsify.encode('МНОПРС'), '--/-./---/.--./.-./...');
    t.equal(morsify.encode('ТУФХЦЧ'), '-/..-/..-./..../-.-./---.');
    t.equal(morsify.encode('ШЩЪЫЬЭ'), '----/--.-/--.--/-.--/-..-/..-..');
    t.equal(morsify.encode('ЮЯ'), '..--/.-.-');
  });
  it('decodes cyrilic alphabet', function () {
    var options = { priority: 5 };
    t.equal(morsify.decode('.-/-.../.--/--./-../.', options), 'А Б В Г Д Е');
    t.equal(morsify.decode('...-/--../../.---/-.-/.-..', options), 'Ж З И Й К Л');
    t.equal(morsify.decode('--/-./---/.--./.-./...', options), 'М Н О П Р С');
    t.equal(morsify.decode('-/..-/..-./..../-.-./---.', options), 'Т У Ф Х Ц Ч');
    t.equal(morsify.decode('----/--.-/--.--/-.--/-..-/..-..', options), 'Ш Щ Ъ Ы Ь Э');
    t.equal(morsify.decode('..--/.-.-', options), 'Ю Я');
  });
  it('encodes greek alphabet', function () {
    var options = { priority: 6 };
    t.equal(morsify.encode('ΑΒΓΔΕΖ', options), '.-/-.../--./-.././--..');
    t.equal(morsify.encode('ΗΘΙΚΛΜ', options), '..../-.-./../-.-/.-../--');
    t.equal(morsify.encode('ΝΞΟΠΡΣ', options), '-./-..-/---/.--./.-./...');
    t.equal(morsify.encode('ΤΥΦΧΨΩ', options), '-/-.--/..-./----/--.-/.--');
  });
  it('decodes greek alphabet', function () {
    var options = { priority: 6 };
    t.equal(morsify.decode('.-/-.../--./-.././--..', options), 'Α Β Γ Δ Ε Ζ');
    t.equal(morsify.decode('..../-.-./../-.-/.-../--', options), 'Η Θ Ι Κ Λ Μ');
    t.equal(morsify.decode('-./-..-/---/.--./.-./...', options), 'Ν Ξ Ο Π Ρ Σ');
    t.equal(morsify.decode('-/-.--/..-./----/--.-/.--', options), 'Τ Υ Φ Χ Ψ Ω');
  });
  it('encodes hebrew alphabet', function () {
    t.equal(morsify.encode('אבגדהו'), '.-/-.../--./-../---/.');
    t.equal(morsify.encode('זחטיכל'), '--../..../..-/../-.-/.-..');
    t.equal(morsify.encode('מנסעפצ'), '--/-./-.-./.---/.--./.--');
    t.equal(morsify.encode('קרשת'), '--.-/.-./.../-');
  });
  it('decodes hebrew alphabet', function () {
    var options = { priority: 7 };
    t.equal(morsify.decode('.-/-.../--./-../---/.', options), 'א ב ג ד ה ו');
    t.equal(morsify.decode('--../..../..-/../-.-/.-..', options), 'ז ח ט י כ ל');
    t.equal(morsify.decode('--/-./-.-./.---/.--./.--', options), 'מ נ ס ע פ צ');
    t.equal(morsify.decode('--.-/.-./.../-', options), 'ק ר ש ת');
  });
  it('encodes arabic alphabet', function () {
    t.equal(morsify.encode('ابتثجح'), '.-/-.../-/-.-./.---/....');
    t.equal(morsify.encode('خدذرزس'), '---/-../--../.-./---./...');
    t.equal(morsify.encode('شصضطظع'), '----/-..-/...-/..-/-.--/.-.-');
    t.equal(morsify.encode('غفقكلم'), '--./..-./--.-/-.-/.-../--');
    t.equal(morsify.encode('نهويﺀ'), '-./..-../.--/../.');
  });
  it('decodes arabic alphabet', function () {
    var options = { priority: 8 };
    t.equal(morsify.decode('.-/-.../-/-.-./.---/....', options), 'ا ب ت ث ج ح');
    t.equal(morsify.decode('---/-../--../.-./---./...', options), 'خ د ذ ر ز س');
    t.equal(morsify.decode('----/-..-/...-/..-/-.--/.-.-', options), 'ش ص ض ط ظ ع');
    t.equal(morsify.decode('--./..-./--.-/-.-/.-../--', options), 'غ ف ق ك ل م');
    t.equal(morsify.decode('-./..-../.--/../.', options), 'ن ه و ي ﺀ');
  });
  it('encodes persian alphabet', function () {
    var options = { priority: 9 };
    t.equal(morsify.encode('ابپتثج', options), '.-/-.../.--./-/-.-./.---');
    t.equal(morsify.encode('چحخدذر', options), '---./..../-..-/-../...-/.-.');
    t.equal(morsify.encode('زژسشصض', options), '--../--./.../----/.-.-/..-..');
    t.equal(morsify.encode('طظعغفق', options), '..-/-.--/---/..--/..-./---...');
    t.equal(morsify.encode('کگلمنو', options), '-.-/--.-/.-../--/-./.--');
    t.equal(morsify.encode('هی', options), './..');
  });
  it('decodes persian alphabet', function () {
    var options = { priority: 9 };
    t.equal(morsify.decode('.-/-.../.--./-/-.-./.---', options), 'ا ب پ ت ث ج');
    t.equal(morsify.decode('---./..../-..-/-../...-/.-.', options), 'چ ح خ د ذ ر');
    t.equal(morsify.decode('--../--./.../----/.-.-/..-..', options), 'ز ژ س ش ص ض');
    t.equal(morsify.decode('..-/-.--/---/..--/..-./---...', options), 'ط ظ ع غ ف ق');
    t.equal(morsify.decode('./..', options), 'ه ی');
  });
  it('encodes japanese alphabet', function () {
    var options = { priority: 10 };
    t.equal(morsify.encode('アカサタナハ', options), '--.--/.-../-.-.-/-./.-./-...');
    t.equal(morsify.encode('マヤラワイキ', options), '-..-/.--/.../-.-/.-/-.-..');
    t.equal(morsify.encode('シチニヒミリ', options), '--.-./..-./-.-./--..-/..-.-/--.');
    t.equal(morsify.encode('ヰウクスツヌ', options),  '.-..-/..-/...-/---.-/.--./....');
    t.equal(morsify.encode('フムユルンエ', options), '--../-/-..--/-.--./.-.-./.-...');
    t.equal(morsify.encode('ケセテネヘメ', options), '-.--/.---./.-.--/--.-/./-...-');
    t.equal(morsify.encode('レヱ、オコソ', options), '---/.--../.-.-.-/-.---/----/---.');
    t.equal(morsify.encode('トノホモヨロ', options), '..-../..--/-../-..-./--/.-.-');
    t.equal(morsify.encode('ヲ。', options), '.---/.-.-..');
  });
  it('decodes japanese alphabet', function () {
    var options = { priority: 10 };
    t.equal(morsify.decode('--.--/.-../-.-.-/-./.-./-...', options), 'ア カ サ タ ナ ハ');
    t.equal(morsify.decode('-..-/.--/.../-.-/.-/-.-..', options), 'マ ヤ ラ ワ イ キ');
    t.equal(morsify.decode('--.-./..-./-.-./--..-/..-.-/--.', options), 'シ チ ニ ヒ ミ リ');
    t.equal(morsify.decode('.-..-/..-/...-/---.-/.--./....', options), 'ヰ ウ ク ス ツ ヌ');
    t.equal(morsify.decode('--../-/-..--/-.--./.-.-./.-...', options), 'フ ム ユ ル ン エ');
    t.equal(morsify.decode('-.--/.---./.-.--/--.-/./-...-', options), 'ケ セ テ ネ ヘ メ');
    t.equal(morsify.decode('---/.--../.-.-.-/-.---/----/---.', options), 'レ ヱ 、 オ コ ソ');
    t.equal(morsify.decode('..-../..--/-../-..-./--/.-.-', options), 'ト ノ ホ モ ヨ ロ');
    t.equal(morsify.decode('.---/.-.-..', options), 'ヲ 。');
  });
  it('encodes korean alphabet', function () {
    var options = { priority: 11 };
    t.equal(morsify.encode('ㄱㄴㄷㄹㅁㅂ', options), '.-../..-./-.../...-/--/.--');
    t.equal(morsify.encode('ㅅㅇㅈㅊㅋㅌ', options), '--./-.-/.--./-.-./-..-/--..');
    t.equal(morsify.encode('ㅍㅎㅏㅑㅓㅕ', options), '---/.---/./../-/...');
    t.equal(morsify.encode('ㅗㅛㅜㅠㅡㅣ', options), '.-/-./..../.-./-../..-');
  });
  it('decodes korean alphabet', function () {
    var options = { priority: 11 };
    t.equal(morsify.decode('.-../..-./-.../...-/--/.--', options), 'ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ');
    t.equal(morsify.decode('--./-.-/.--./-.-./-..-/--..', options), 'ㅅ ㅇ ㅈ ㅊ ㅋ ㅌ');
    t.equal(morsify.decode('---/.---/./../-/...', options), 'ㅍ ㅎ ㅏ ㅑ ㅓ ㅕ');
    t.equal(morsify.decode('.-/-./..../.-./-../..-', options), 'ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ');
  });
  it('creates audio', function () {
    t.equal('data:audio/wav;base64', morsify.audio('SOS').substr(0, 21));
    t.equal('UklGRsK8IAAAV0FWRWZtdCAQAAAAAQABAMO0AwAAw6gHAAACABAAZGF0YcKIIAAAAADDvjJ1wqLCm3hOwoDCpXE6wq/CiCJtEX/CvcKRaMKvwoJRfW/Cl8KBQsKTw654w53DhlBbwo7Csn9lwofCi10Cw40AAMO+MnXCosKbeE7CgMKlcTrCr8KIIm0Rf8K9wpFowq/CglF9b8KXwoFCwpPDrnjDncOGUFvCjsKyf2XCh8KLXQLDjQAAw74ydcKiwpt4TsKAwqVxOsKvwogibRF/wr3CkWjCr8KCUX1vwpfCgULCk8OueMOdw4ZQW8KOwrJ/ZcKHwotdAsONAADDvjJ1wqLCm3hOwoDCpXE6wq/CiCJtEX/CvcKRaMKvwoJRfW/Cl8KBQsKTw654w53DhlBbwo7Csn9lwofCi10Cw40AAMO+MnXCosKbeE7CgMKlcTrCr8KIIm0Rf8K', morsify.audio('SOS').substr(22, 463));
  });
});
