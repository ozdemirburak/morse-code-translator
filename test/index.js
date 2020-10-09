const t = require('assert');
const morse = require('../src/index');

describe('morse', function () {
  'use strict';

  it('encodes english alphabet', function () {
    t.equal(morse.encode('the quick brown fox jumps over the lazy dog'), '- .... . / --.- ..- .. -.-. -.- / -... .-. --- .-- -. / ..-. --- -..- / .--- ..- -- .--. ... / --- ...- . .-. / - .... . / .-.. .- --.. -.-- / -.. --- --.')
    t.equal(morse.encode('the quick brown fox jumps over the lazy dog', { dash: '–', dot: '•', space: '\\' }), '– •••• • \\ ––•– ••– •• –•–• –•– \\ –••• •–• ––– •–– –• \\ ••–• ––– –••– \\ •––– ••– –– •––• ••• \\ ––– •••– • •–• \\ – •••• • \\ •–•• •– ––•• –•–– \\ –•• ––– ––•')
  });
  it('decodes english alphabet', function () {
    t.equal(morse.decode('- .... . / --.- ..- .. -.-. -.- / -... .-. --- .-- -. / ..-. --- -..- / .--- ..- -- .--. ... / --- ...- . .-. / - .... . / .-.. .- --.. -.-- / -.. --- --.'), 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG')
    t.equal(morse.decode('– •••• • \\ ––•– ••– •• –•–• –•– \\ –••• •–• ––– •–– –• \\ ••–• ––– –••– \\ •––– ••– –– •––• ••• \\ ––– •••– • •–• \\ – •••• • \\ •–•• •– ––•• –•–– \\ –•• ––– ––•', {dash: '–', dot: '•', space: '\\'}), 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG');
  });
  it('encodes numbers', function () {
    t.equal(morse.encode('0123456789'), '----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----.');
  });
  it('decodes numbers', function () {
    t.equal(morse.decode('----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----.'), '0123456789');
  });
  it('encodes punctuation', function () {
    t.equal(morse.encode('.,?\'!/('), '.-.-.- --..-- ..--.. .----. -.-.-- -..-. -.--.');
    t.equal(morse.encode(')&:;=¿¡'), '-.--.- .-... ---... -.-.-. -...- ..-.- --...-');
  });
  it('decodes punctuation', function () {
    t.equal(morse.decode('.-.-.- --..-- ..--.. .----. -.-.-- -..-. -.--.'), '.,?\'!/(');
    t.equal(morse.decode('-.--.- .-... ---... -.-.-. -...- ..-.- --...-'), ')&:;=¿¡');
  });
  it('encodes non-english alphabet', function () {
    t.equal(morse.encode('ÃÁÅÀÂÄ'), '.--.- .--.- .--.- .--.- .--.- .-.-');
    t.equal(morse.encode('ĄÆÇĆĈČ'), '.-.- .-.- -.-.. -.-.. -.-.. --.');
    t.equal(morse.encode('ĘÐÈËĘÉ'), '..-.. ..--. .-..- ..-.. ..-.. ..-..');
    t.equal(morse.encode('ÊĞĜĤİÏ'), '-..-. --.-. --.-. ---- .-..- -..--');
    t.equal(morse.encode('ÌĴŁŃÑÓ'), '.---. .---. .-..- --.-- --.-- ---.');
    t.equal(morse.encode('ÒÖÔØŚŞ'), '---. ---. ---. ---. ...-... .--..');
    t.equal(morse.encode('ȘŠŜßÞÜ'), '---- ---- ...-. ... ... .--.. ..--');
    t.equal(morse.encode('ÙŬŽŹŻ'), '..-- ..-- --..- --..-. --..-');
  });
  it('decodes non-english alphabet', function () {
    const options = { priority: 4 };
    t.equal(morse.decode('.--.- .--.- .--.- .--.- .--.- .-.-', options), 'ÃÃÃÃÃÄ');
    t.equal(morse.decode('.-.- .-.- -.-.. -.-.. -.-.. --.', options), 'ÄÄÇÇÇČ');
    t.equal(morse.decode('..-.. ..--. .-..- ..-.. ..-.. ..-..', options), 'ĘÐÈĘĘĘ');
    t.equal(morse.decode('-..-. --.-. --.-. ---- .-..- -..--', options), 'ÊĞĞĤÈÏ');
    t.equal(morse.decode('.---. .---. .-..- --.-- --.-- ---.', options), 'ÌÌÈŃŃÓ');
    t.equal(morse.decode('---- ---- ...-. ... ... .--.. ..--', options), 'ĤĤŜSSŞÜ');
    t.equal(morse.decode('..-- ..-- --..- --..-. --..-', options), 'ÜÜŽŹŽ');
  });
  it('encodes cyrilic alphabet', function () {
    t.equal(morse.encode('АБВГДЕ'), '.- -... .-- --. -.. .');
    t.equal(morse.encode('ЖЗИЙКЛ'), '...- --.. .. .--- -.- .-..');
    t.equal(morse.encode('МНОПРС'), '-- -. --- .--. .-. ...');
    t.equal(morse.encode('ТУФХЦЧ'), '- ..- ..-. .... -.-. ---.');
    t.equal(morse.encode('ШЩЪЫЬЭ'), '---- --.- --.-- -.-- -..- ..-..');
    t.equal(morse.encode('ЮЯЄІЇҐ'), '..-- .-.- ..-.. .. .---. --.');
  });
  it('decodes cyrilic alphabet', function () {
    const options = { priority: 5 };
    t.equal(morse.decode('.- -... .-- --. -.. .', options), 'АБВГДЕ');
    t.equal(morse.decode('...- --.. .. .--- -.- .-..', options), 'ЖЗИЙКЛ');
    t.equal(morse.decode('-- -. --- .--. .-. ...', options), 'МНОПРС');
    t.equal(morse.decode('- ..- ..-. .... -.-. ---.', options), 'ТУФХЦЧ');
    t.equal(morse.decode('---- --.- --.-- -.-- -..- ..-..', options), 'ШЩЪЫЬЭ');
    t.equal(morse.decode('..-- .-.- ..-.. .. .---.', options), 'ЮЯЭИЇ');
  });
  it('encodes greek alphabet', function () {
    const options = { priority: 6 };
    t.equal(morse.encode('ΑΒΓΔΕΖ', options), '.- -... --. -.. . --..');
    t.equal(morse.encode('ΗΘΙΚΛΜ', options), '.... -.-. .. -.- .-.. --');
    t.equal(morse.encode('ΝΞΟΠΡΣ', options), '-. -..- --- .--. .-. ...');
    t.equal(morse.encode('ΤΥΦΧΨΩ', options), '- -.-- ..-. ---- --.- .--');
  });
  it('decodes greek alphabet', function () {
    const options = { priority: 6 };
    t.equal(morse.decode('.- -... --. -.. . --..', options), 'ΑΒΓΔΕΖ');
    t.equal(morse.decode('.... -.-. .. -.- .-.. --', options), 'ΗΘΙΚΛΜ');
    t.equal(morse.decode('-. -..- --- .--. .-. ...', options), 'ΝΞΟΠΡΣ');
    t.equal(morse.decode('- -.-- ..-. ---- --.- .--', options), 'ΤΥΦΧΨΩ');
  });
  it('encodes hebrew alphabet', function () {
    t.equal(morse.encode('אבגדהו'), '.- -... --. -.. --- .');
    t.equal(morse.encode('זחטיכל'), '--.. .... ..- .. -.- .-..');
    t.equal(morse.encode('מנסעפצ'), '-- -. -.-. .--- .--. .--');
    t.equal(morse.encode('קרשת'), '--.- .-. ... -');
  });
  it('decodes hebrew alphabet', function () {
    const options = { priority: 7 };
    t.equal(morse.decode('.- -... --. -.. --- .', options), 'אבגדהו');
    t.equal(morse.decode('--.. .... ..- .. -.- .-..', options), 'זחטיכל');
    t.equal(morse.decode('-- -. -.-. .--- .--. .--', options), 'מנסעפצ');
    t.equal(morse.decode('--.- .-. ... -', options), 'קרשת');
  });
  it('encodes arabic alphabet', function () {
    t.equal(morse.encode('ابتثجح'), '.- -... - -.-. .--- ....');
    t.equal(morse.encode('خدذرزس'), '--- -.. --.. .-. ---. ...');
    t.equal(morse.encode('شصضطظع'), '---- -..- ...- ..- -.-- .-.-');
    t.equal(morse.encode('غفقكلم'), '--. ..-. --.- -.- .-.. --');
    t.equal(morse.encode('نهويﺀ'), '-. ..-.. .-- .. .');
  });
  it('decodes arabic alphabet', function () {
    const options = { priority: 8 };
    t.equal(morse.decode('.- -... - -.-. .--- ....', options), 'ابتثجح');
    t.equal(morse.decode('--- -.. --.. .-. ---. ...', options), 'خدذرزس');
    t.equal(morse.decode('---- -..- ...- ..- -.-- .-.-', options), 'شصضطظع');
    t.equal(morse.decode('--. ..-. --.- -.- .-.. --', options), 'غفقكلم');
    t.equal(morse.decode('-. ..-.. .-- .. .', options), 'نهويﺀ');
  });
  it('encodes persian alphabet', function () {
    const options = { priority: 9 };
    t.equal(morse.encode('ابپتثج', options), '.- -... .--. - -.-. .---');
    t.equal(morse.encode('چحخدذر', options), '---. .... -..- -.. ...- .-.');
    t.equal(morse.encode('زژسشصض', options), '--.. --. ... ---- .-.- ..-..');
    t.equal(morse.encode('طظعغفق', options), '..- -.-- --- ..-- ..-. ---...');
    t.equal(morse.encode('کگلمنو', options), '-.- --.- .-.. -- -. .--');
    t.equal(morse.encode('هی', options), '. ..');
  });
  it('decodes persian alphabet', function () {
    const options = { priority: 9 };
    t.equal(morse.decode('.- -... .--. - -.-. .---', options), 'ابپتثج');
    t.equal(morse.decode('---. .... -..- -.. ...- .-.', options), 'چحخدذر');
    t.equal(morse.decode('--.. --. ... ---- .-.- ..-..', options), 'زژسشصض');
    t.equal(morse.decode('..- -.-- --- ..-- ..-. ---...', options), 'طظعغفق');
    t.equal(morse.decode('. ..', options), 'هی');
  });
  it('encodes japanese alphabet', function () {
    const options = { priority: 10, dash: '－', dot: '・', separator: '　' };
    t.equal(morse.encode('アカサタナハ', options), '－－・－－　・－・・　－・－・－　－・　・－・　－・・・');
    t.equal(morse.encode('マヤラワイキ', options), '－・・－　・－－　・・・　－・－　・－　－・－・・');
    t.equal(morse.encode('シチニヒミリ', options), '－－・－・　・・－・　－・－・　－－・・－　・・－・－　－－・');
    t.equal(morse.encode('ヰウクスツヌ', options),  '・－・・－　・・－　・・・－　－－－・－　・－－・　・・・・');
    t.equal(morse.encode('フムユルンエ', options), '－－・・　－　－・・－－　－・－－・　・－・－・　－・－－－');
    t.equal(morse.encode('ケセテネヘメ', options), '－・－－　・－－－・　・－・－－　－－・－　・　－・・・－');
    t.equal(morse.encode('レヱ、オコソ', options), '－－－　・－－・・　・－・－・－　・－・・・　－－－－　－－－・');
    t.equal(morse.encode('トノホモヨロ', options), '・・－・・　・・－－　－・・　－・・－・　－－　・－・－');
    t.equal(morse.encode('ヲ゛゜。ー', options), '・－－－　・・　・・－－・　・－・－・・　・－－・－');
    t.equal(morse.encode('（）', options), '－・－－・－　・－・・－・');
  });
  it('decodes japanese alphabet', function () {
    const options = { priority: 10, dash: '－', dot: '・', separator: '　' };
    t.equal(morse.decode('－－・－－　・－・・　－・－・－　－・　・－・　－・・・', options), 'アカサタナハ');
    t.equal(morse.decode('－・・－　・－－　・・・　－・－　・－　－・－・・', options), 'マヤラワイキ');
    t.equal(morse.decode('－－・－・　・・－・　－・－・　－－・・－　・・－・－　－－・', options), 'シチニヒミリ');
    t.equal(morse.decode('・－・・－　・・－　・・・－　－－－・－　・－－・　・・・・', options), 'ヰウクスツヌ');
    t.equal(morse.decode('－－・・　－　－・・－－　－・－－・　・－・－・　－・－－－', options), 'フムユルンエ');
    t.equal(morse.decode('－・－－　・－－－・　・－・－－　－－・－　・　－・・・－', options), 'ケセテネヘメ');
    t.equal(morse.decode('－－－　・－－・・　・－・－・－　・－・・・　－－－－　－－－・', options), 'レヱ、オコソ');
    t.equal(morse.decode('・・－・・　・・－－　－・・　－・・－・　－－　・－・－', options), 'トノホモヨロ');
    t.equal(morse.decode('・－－－　・・　・・－－・　・－・－・・　・－－・－', options), 'ヲ゛゜。ー');
    t.equal(morse.decode('－・－－・－　・－・・－・', options), '（）');
  });
  it('encodes korean alphabet', function () {
    const options = { priority: 11 };
    t.equal(morse.encode('ㄱㄴㄷㄹㅁㅂ', options), '.-.. ..-. -... ...- -- .--');
    t.equal(morse.encode('ㅅㅇㅈㅊㅋㅌ', options), '--. -.- .--. -.-. -..- --..');
    t.equal(morse.encode('ㅍㅎㅏㅑㅓㅕ', options), '--- .--- . .. - ...');
    t.equal(morse.encode('ㅗㅛㅜㅠㅡㅣ', options), '.- -. .... .-. -.. ..-');
  });
  it('decodes korean alphabet', function () {
    const options = { priority: 11 };
    t.equal(morse.decode('.-.. ..-. -... ...- -- .--', options), 'ㄱㄴㄷㄹㅁㅂ');
    t.equal(morse.decode('--. -.- .--. -.-. -..- --..', options), 'ㅅㅇㅈㅊㅋㅌ');
    t.equal(morse.decode('--- .--- . .. - ...', options), 'ㅍㅎㅏㅑㅓㅕ');
    t.equal(morse.decode('.- -. .... .-. -.. ..-', options), 'ㅗㅛㅜㅠㅡㅣ');
  });
  it('encodes thai alphabet', function () {
    const options = { priority: 12 };
    t.equal(morse.encode('กขคง', options), '--. -.-. -.- -.--.');
    t.equal(morse.encode('จฉชซญด', options), '-..-. ---- -..- --.. .--- -..');
    t.equal(morse.encode('ตถทนบ', options), '- -.-.. -..-- -. -...');
    t.equal(morse.encode('ปผฝพฟ', options), '.--. --.- -.-.- .--.. ..-.');
    t.equal(morse.encode('มยรลว', options), '-- -.-- .-. .-.. .--');
    t.equal(morse.encode('สหอฮฤ', options), '... .... -...- --.-- .-.--');
    t.equal(morse.encode('ะาิีึืุูเแไโำ', options), '.-... .- ..-.. .. ..--. ..-- ..-.- ---. . .-.- .-..- --- ...-.');
    t.equal(morse.encode('่้๊๋', options), '..- ...- --... .-.-.');
    t.equal(morse.encode('ั็์ๆฯ', options), '.--.- ---.. --..- -.--- --.-.');
  });
  it('decodes thai alphabet', function () {
    const options = { priority: 12 };
    t.equal(morse.decode('--. -.-. -.- -.--.', options), 'กขคง');
    t.equal(morse.decode('-..-. ---- -..- --.. .--- -..', options), 'จฉชซญด');
    t.equal(morse.decode('- -.-.. -..-- -. -...', options), 'ตถทนบ');
    t.equal(morse.decode('.--. --.- -.-.- .--.. ..-.', options), 'ปผฝพฟ');
    t.equal(morse.decode('-- -.-- .-. .-.. .--', options), 'มยรลว');
    t.equal(morse.decode('... .... -...- --.-- .-.--', options), 'สหอฮฤ');
    t.equal(morse.decode('.-... .- ..-.. .. ..--. ..-- ..-.- ---. . .-.- .-..- --- ...-.', options), 'ะาิีึืุูเแไโำ');
    t.equal(morse.decode('..- ...- --... .-.-.', options), '่้๊๋');
    t.equal(morse.decode('.--.- ---.. --..- -.--- --.-.', options), 'ั็์ๆฯ');
  });
  it('returns mapped characters', function () {
    let characters = morse.characters();
    t.equal(characters[1]['A'], '.-');
    t.equal(characters[2]['0'], '-----');
    t.equal(characters[3]['.'], '.-.-.-');
    t.equal(characters[4]['Ç'], '-.-..');
    t.equal(characters[5]['Я'], '.-.-');
    t.equal(characters[6]['Ω'], '.--');
    t.equal(characters[7]['א'], '.-');
    t.equal(characters[8]['ا'], '.-');
    t.equal(characters[9]['ا'], '.-');
    t.equal(characters[10]['ア'], '--.--');
    t.equal(characters[11]['ㄱ'], '.-..');
    t.equal(characters[12]['ก'], '--.');
    characters = morse.characters({ dash: '–', dot: '•', space: ' ' });
    t.equal(characters[1]['A'], '•–');
    t.equal(characters[2]['0'], '–––––');
    t.equal(characters[3]['.'], '•–•–•–');
    t.equal(characters[4]['Ç'], '–•–••');
    t.equal(characters[5]['Я'], '•–•–');
    t.equal(characters[6]['Ω'], '•––');
    t.equal(characters[7]['א'], '•–');
    t.equal(characters[8]['ا'], '•–');
    t.equal(characters[9]['ا'], '•–');
    t.equal(characters[10]['ア'], '––•––');
    t.equal(characters[11]['ㄱ'], '•–••');
    t.equal(characters[12]['ก'], '––•');
  });
  it('trims and removes multiple spaces', function () {
    t.equal(morse.encode(' hello   there '), '.... . .-.. .-.. --- / - .... . .-. .');
    t.equal(morse.decode(' --. .   -. . .-. .- .-.. / -.- . -. --- -... .. '), 'GENERAL KENOBI');
  });
});
