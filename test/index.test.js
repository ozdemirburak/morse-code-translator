import { describe, it, expect } from 'vitest';
import * as morse from '../src/index.js';

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
    characters = morse.characters({ dash: '–', dot: '•', space: ' ' });
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
});
