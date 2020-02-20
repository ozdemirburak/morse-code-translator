const t = require('assert');
const morsify = require('../src/morsify');

describe('morsify', function () {
  'use strict';

  it('encodes english alphabet', function () {
    t.equal(morsify.encode('the quick brown fox jumps over the lazy dog'), '- .... . / --.- ..- .. -.-. -.- / -... .-. --- .-- -. / ..-. --- -..- / .--- ..- -- .--. ... / --- ...- . .-. / - .... . / .-.. .- --.. -.-- / -.. --- --.')
    t.equal(morsify.encode('the quick brown fox jumps over the lazy dog', { dash: '–', dot: '•', space: '\\' }), '– •••• • \\ ––•– ••– •• –•–• –•– \\ –••• •–• ––– •–– –• \\ ••–• ––– –••– \\ •––– ••– –– •––• ••• \\ ––– •••– • •–• \\ – •••• • \\ •–•• •– ––•• –•–– \\ –•• ––– ––•')
  });
  it('decodes english alphabet', function () {
    t.equal(morsify.decode('- .... . / --.- ..- .. -.-. -.- / -... .-. --- .-- -. / ..-. --- -..- / .--- ..- -- .--. ... / --- ...- . .-. / - .... . / .-.. .- --.. -.-- / -.. --- --.'), 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG')
    t.equal(morsify.decode('– •••• • \\ ––•– ••– •• –•–• –•– \\ –••• •–• ––– •–– –• \\ ••–• ––– –••– \\ •––– ••– –– •––• ••• \\ ––– •••– • •–• \\ – •••• • \\ •–•• •– ––•• –•–– \\ –•• ––– ––•', {dash: '–', dot: '•', space: '\\'}), 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG');
  });
  it('encodes numbers', function () {
    t.equal(morsify.encode('0123456789'), '----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----.');
  });
  it('decodes numbers', function () {
    t.equal(morsify.decode('----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----.'), '0123456789');
  });
  it('encodes punctuation', function () {
    t.equal(morsify.encode('.,?\'!/('), '.-.-.- --..-- ..--.. .----. -.-.-- -..-. -.--.');
    t.equal(morsify.encode(')&:;=¿¡'), '-.--.- .-... ---... -.-.-. -...- ..-.- --...-');
  });
  it('decodes punctuation', function () {
    t.equal(morsify.decode('.-.-.- --..-- ..--.. .----. -.-.-- -..-. -.--.'), '.,?\'!/(');
    t.equal(morsify.decode('-.--.- .-... ---... -.-.-. -...- ..-.- --...-'), ')&:;=¿¡');
  });
  it('encodes non-english alphabet', function () {
    t.equal(morsify.encode('ÃÁÅÀÂÄ'), '.--.- .--.- .--.- .--.- .--.- .-.-');
    t.equal(morsify.encode('ĄÆÇĆĈČ'), '.-.- .-.- -.-.. -.-.. -.-.. --.');
    t.equal(morsify.encode('ĘÐÈËĘÉ'), '..-.. ..--. .-..- ..-.. ..-.. ..-..');
    t.equal(morsify.encode('ÊĞĜĤİÏ'), '-..-. --.-. --.-. ---- .-..- -..--');
    t.equal(morsify.encode('ÌĴŁŃÑÓ'), '.---. .---. .-..- --.-- --.-- ---.');
    t.equal(morsify.encode('ÒÖÔØŚŞ'), '---. ---. ---. ---. ...-... .--..');
    t.equal(morsify.encode('ȘŠŜßÞÜ'), '---- ---- ...-. ... ... .--.. ..--');
    t.equal(morsify.encode('ÙŬŽŹŻ'), '..-- ..-- --..- --..-. --..-');
  });
  it('decodes non-english alphabet', function () {
    const options = { priority: 4 };
    t.equal(morsify.decode('.--.- .--.- .--.- .--.- .--.- .-.-', options), 'ÃÃÃÃÃÄ');
    t.equal(morsify.decode('.-.- .-.- -.-.. -.-.. -.-.. --.', options), 'ÄÄÇÇÇČ');
    t.equal(morsify.decode('..-.. ..--. .-..- ..-.. ..-.. ..-..', options), 'ĘÐÈĘĘĘ');
    t.equal(morsify.decode('-..-. --.-. --.-. ---- .-..- -..--', options), 'ÊĞĞĤÈÏ');
    t.equal(morsify.decode('.---. .---. .-..- --.-- --.-- ---.', options), 'ÌÌÈŃŃÓ');
    t.equal(morsify.decode('---- ---- ...-. ... ... .--.. ..--', options), 'ĤĤŜSSŞÜ');
    t.equal(morsify.decode('..-- ..-- --..- --..-. --..-', options), 'ÜÜŽŹŽ');
  });
  it('encodes cyrilic alphabet', function () {
    t.equal(morsify.encode('АБВГДЕ'), '.- -... .-- --. -.. .');
    t.equal(morsify.encode('ЖЗИЙКЛ'), '...- --.. .. .--- -.- .-..');
    t.equal(morsify.encode('МНОПРС'), '-- -. --- .--. .-. ...');
    t.equal(morsify.encode('ТУФХЦЧ'), '- ..- ..-. .... -.-. ---.');
    t.equal(morsify.encode('ШЩЪЫЬЭ'), '---- --.- --.-- -.-- -..- ..-..');
    t.equal(morsify.encode('ЮЯЄІЇҐ'), '..-- .-.- ..-.. .. .---. --.');
  });
  it('decodes cyrilic alphabet', function () {
    const options = { priority: 5 };
    t.equal(morsify.decode('.- -... .-- --. -.. .', options), 'АБВГДЕ');
    t.equal(morsify.decode('...- --.. .. .--- -.- .-..', options), 'ЖЗИЙКЛ');
    t.equal(morsify.decode('-- -. --- .--. .-. ...', options), 'МНОПРС');
    t.equal(morsify.decode('- ..- ..-. .... -.-. ---.', options), 'ТУФХЦЧ');
    t.equal(morsify.decode('---- --.- --.-- -.-- -..- ..-..', options), 'ШЩЪЫЬЭ');
    t.equal(morsify.decode('..-- .-.- ..-.. .. .---.', options), 'ЮЯЭИЇ');
  });
  it('encodes greek alphabet', function () {
    const options = { priority: 6 };
    t.equal(morsify.encode('ΑΒΓΔΕΖ', options), '.- -... --. -.. . --..');
    t.equal(morsify.encode('ΗΘΙΚΛΜ', options), '.... -.-. .. -.- .-.. --');
    t.equal(morsify.encode('ΝΞΟΠΡΣ', options), '-. -..- --- .--. .-. ...');
    t.equal(morsify.encode('ΤΥΦΧΨΩ', options), '- -.-- ..-. ---- --.- .--');
  });
  it('decodes greek alphabet', function () {
    const options = { priority: 6 };
    t.equal(morsify.decode('.- -... --. -.. . --..', options), 'ΑΒΓΔΕΖ');
    t.equal(morsify.decode('.... -.-. .. -.- .-.. --', options), 'ΗΘΙΚΛΜ');
    t.equal(morsify.decode('-. -..- --- .--. .-. ...', options), 'ΝΞΟΠΡΣ');
    t.equal(morsify.decode('- -.-- ..-. ---- --.- .--', options), 'ΤΥΦΧΨΩ');
  });
  it('encodes hebrew alphabet', function () {
    t.equal(morsify.encode('אבגדהו'), '.- -... --. -.. --- .');
    t.equal(morsify.encode('זחטיכל'), '--.. .... ..- .. -.- .-..');
    t.equal(morsify.encode('מנסעפצ'), '-- -. -.-. .--- .--. .--');
    t.equal(morsify.encode('קרשת'), '--.- .-. ... -');
  });
  it('decodes hebrew alphabet', function () {
    const options = { priority: 7 };
    t.equal(morsify.decode('.- -... --. -.. --- .', options), 'אבגדהו');
    t.equal(morsify.decode('--.. .... ..- .. -.- .-..', options), 'זחטיכל');
    t.equal(morsify.decode('-- -. -.-. .--- .--. .--', options), 'מנסעפצ');
    t.equal(morsify.decode('--.- .-. ... -', options), 'קרשת');
  });
  it('encodes arabic alphabet', function () {
    t.equal(morsify.encode('ابتثجح'), '.- -... - -.-. .--- ....');
    t.equal(morsify.encode('خدذرزس'), '--- -.. --.. .-. ---. ...');
    t.equal(morsify.encode('شصضطظع'), '---- -..- ...- ..- -.-- .-.-');
    t.equal(morsify.encode('غفقكلم'), '--. ..-. --.- -.- .-.. --');
    t.equal(morsify.encode('نهويﺀ'), '-. ..-.. .-- .. .');
  });
  it('decodes arabic alphabet', function () {
    const options = { priority: 8 };
    t.equal(morsify.decode('.- -... - -.-. .--- ....', options), 'ابتثجح');
    t.equal(morsify.decode('--- -.. --.. .-. ---. ...', options), 'خدذرزس');
    t.equal(morsify.decode('---- -..- ...- ..- -.-- .-.-', options), 'شصضطظع');
    t.equal(morsify.decode('--. ..-. --.- -.- .-.. --', options), 'غفقكلم');
    t.equal(morsify.decode('-. ..-.. .-- .. .', options), 'نهويﺀ');
  });
  it('encodes persian alphabet', function () {
    const options = { priority: 9 };
    t.equal(morsify.encode('ابپتثج', options), '.- -... .--. - -.-. .---');
    t.equal(morsify.encode('چحخدذر', options), '---. .... -..- -.. ...- .-.');
    t.equal(morsify.encode('زژسشصض', options), '--.. --. ... ---- .-.- ..-..');
    t.equal(morsify.encode('طظعغفق', options), '..- -.-- --- ..-- ..-. ---...');
    t.equal(morsify.encode('کگلمنو', options), '-.- --.- .-.. -- -. .--');
    t.equal(morsify.encode('هی', options), '. ..');
  });
  it('decodes persian alphabet', function () {
    const options = { priority: 9 };
    t.equal(morsify.decode('.- -... .--. - -.-. .---', options), 'ابپتثج');
    t.equal(morsify.decode('---. .... -..- -.. ...- .-.', options), 'چحخدذر');
    t.equal(morsify.decode('--.. --. ... ---- .-.- ..-..', options), 'زژسشصض');
    t.equal(morsify.decode('..- -.-- --- ..-- ..-. ---...', options), 'طظعغفق');
    t.equal(morsify.decode('. ..', options), 'هی');
  });
  it('encodes japanese alphabet', function () {
    const options = { priority: 10, dash: '－', dot: '・', separator: '　' };
    t.equal(morsify.encode('アカサタナハ', options), '－－・－－　・－・・　－・－・－　－・　・－・　－・・・');
    t.equal(morsify.encode('マヤラワイキ', options), '－・・－　・－－　・・・　－・－　・－　－・－・・');
    t.equal(morsify.encode('シチニヒミリ', options), '－－・－・　・・－・　－・－・　－－・・－　・・－・－　－－・');
    t.equal(morsify.encode('ヰウクスツヌ', options),  '・－・・－　・・－　・・・－　－－－・－　・－－・　・・・・');
    t.equal(morsify.encode('フムユルンエ', options), '－－・・　－　－・・－－　－・－－・　・－・－・　・－・・・');
    t.equal(morsify.encode('ケセテネヘメ', options), '－・－－　・－－－・　・－・－－　－－・－　・　－・・・－');
    t.equal(morsify.encode('レヱ、オコソ', options), '－－－　・－－・・　・－・－・－　－・－－－　－－－－　－－－・');
    t.equal(morsify.encode('トノホモヨロ', options), '・・－・・　・・－－　－・・　－・・－・　－－　・－・－');
    t.equal(morsify.encode('ヲ゛゜。ー', options), '・－－－　・・　・・－－・　・－・－・・　・－－・－');
    t.equal(morsify.encode('（）', options), '－・－－・－　・－・・－・');
  });
  it('decodes japanese alphabet', function () {
    const options = { priority: 10, dash: '－', dot: '・', separator: '　' };
    t.equal(morsify.decode('－－・－－　・－・・　－・－・－　－・　・－・　－・・・', options), 'アカサタナハ');
    t.equal(morsify.decode('－・・－　・－－　・・・　－・－　・－　－・－・・', options), 'マヤラワイキ');
    t.equal(morsify.decode('－－・－・　・・－・　－・－・　－－・・－　・・－・－　－－・', options), 'シチニヒミリ');
    t.equal(morsify.decode('・－・・－　・・－　・・・－　－－－・－　・－－・　・・・・', options), 'ヰウクスツヌ');
    t.equal(morsify.decode('－－・・　－　－・・－－　－・－－・　・－・－・　・－・・・', options), 'フムユルンエ');
    t.equal(morsify.decode('－・－－　・－－－・　・－・－－　－－・－　・　－・・・－', options), 'ケセテネヘメ');
    t.equal(morsify.decode('－－－　・－－・・　・－・－・－　－・－－－　－－－－　－－－・', options), 'レヱ、オコソ');
    t.equal(morsify.decode('・・－・・　・・－－　－・・　－・・－・　－－　・－・－', options), 'トノホモヨロ');
    t.equal(morsify.decode('・－－－　・・　・・－－・　・－・－・・　・－－・－', options), 'ヲ゛゜。ー');
    t.equal(morsify.decode('－・－－・－　・－・・－・', options), '（）');
  });
  it('encodes korean alphabet', function () {
    const options = { priority: 11 };
    t.equal(morsify.encode('ㄱㄴㄷㄹㅁㅂ', options), '.-.. ..-. -... ...- -- .--');
    t.equal(morsify.encode('ㅅㅇㅈㅊㅋㅌ', options), '--. -.- .--. -.-. -..- --..');
    t.equal(morsify.encode('ㅍㅎㅏㅑㅓㅕ', options), '--- .--- . .. - ...');
    t.equal(morsify.encode('ㅗㅛㅜㅠㅡㅣ', options), '.- -. .... .-. -.. ..-');
  });
  it('decodes korean alphabet', function () {
    const options = { priority: 11 };
    t.equal(morsify.decode('.-.. ..-. -... ...- -- .--', options), 'ㄱㄴㄷㄹㅁㅂ');
    t.equal(morsify.decode('--. -.- .--. -.-. -..- --..', options), 'ㅅㅇㅈㅊㅋㅌ');
    t.equal(morsify.decode('--- .--- . .. - ...', options), 'ㅍㅎㅏㅑㅓㅕ');
    t.equal(morsify.decode('.- -. .... .-. -.. ..-', options), 'ㅗㅛㅜㅠㅡㅣ');
  });
  it('encodes thai alphabet', function () {
    const options = { priority: 12 };
    t.equal(morsify.encode('กขคง', options), '--. -.-. -.- -.--.');
    t.equal(morsify.encode('จฉชซญด', options), '-..-. ---- -..- --.. .--- -..');
    t.equal(morsify.encode('ตถทนบ', options), '- -.-.. -..-- -. -...');
    t.equal(morsify.encode('ปผฝพฟ', options), '.--. --.- -.-.- .--.. ..-.');
    t.equal(morsify.encode('มยรลว', options), '-- -.-- .-. .-.. .--');
    t.equal(morsify.encode('สหอฮฤ', options), '... .... -...- --.-- .-.--');
    t.equal(morsify.encode('ะาิีึืุูเแไโำ', options), '.-... .- ..-.. .. ..--. ..-- ..-.- ---. . .-.- .-..- --- ...-.');
    t.equal(morsify.encode('่้๊๋', options), '..- ...- --... .-.-.');
    t.equal(morsify.encode('ั็์ๆฯ', options), '.--.- ---.. --..- -.--- --.-.');
  });
  it('decodes thai alphabet', function () {
    const options = { priority: 12 };
    t.equal(morsify.decode('--. -.-. -.- -.--.', options), 'กขคง');
    t.equal(morsify.decode('-..-. ---- -..- --.. .--- -..', options), 'จฉชซญด');
    t.equal(morsify.decode('- -.-.. -..-- -. -...', options), 'ตถทนบ');
    t.equal(morsify.decode('.--. --.- -.-.- .--.. ..-.', options), 'ปผฝพฟ');
    t.equal(morsify.decode('-- -.-- .-. .-.. .--', options), 'มยรลว');
    t.equal(morsify.decode('... .... -...- --.-- .-.--', options), 'สหอฮฤ');
    t.equal(morsify.decode('.-... .- ..-.. .. ..--. ..-- ..-.- ---. . .-.- .-..- --- ...-.', options), 'ะาิีึืุูเแไโำ');
    t.equal(morsify.decode('..- ...- --... .-.-.', options), '่้๊๋');
    t.equal(morsify.decode('.--.- ---.. --..- -.--- --.-.', options), 'ั็์ๆฯ');
  });
  it('encodes unicode', function () {
    const options = { priority: 13 };
    t.equal(morsify.encode('你好', options), '-..----.--..... -.--..-.-----.-');
    t.equal(morsify.encode('吃得苦中苦,方为人上人', options), '-.-.-........-- -.------..-.--- -.....-.---..--. -..---...-.--.- -.....-.---..--. --..-- --..-.--.---..- -..---...---.-. -..---.-.---.-. -..---.....-.-. -..---.-.---.-.');
  });
  it('decodes unicode', function () {
    const options = { priority: 13 };
    t.equal(morsify.decode('-..----.--..... -.--..-.-----.-', options), '你好');
    t.equal(morsify.decode('-.-.-........-- -.------..-.--- -.....-.---..--. -..---...-.--.- -.....-.---..--. --..-- --..-.--.---..- -..---...---.-. -..---.-.---.-. -..---.....-.-. -..---.-.---.-.', options), '吃得苦中苦,方为人上人');
  });
  it('returns mapped characters', function () {
    let characters = morsify.characters();
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
    characters = morsify.characters({ dash: '–', dot: '•', space: ' ' });
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
    t.equal(morsify.encode(' hello   there '), '.... . .-.. .-.. --- / - .... . .-. .');
    t.equal(morsify.decode(' --. .   -. . .-. .- .-.. / -.- . -. --- -... .. '), 'GENERAL KENOBI');
  });
});
