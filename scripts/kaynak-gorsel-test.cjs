/**
 * Markdown kaynak görünümünde görsel yer tutucuları.
 *
 * Kaynak kutusu base64 verisiyle dolmamalı, ama kaydedilen not da hiçbir
 * görselini kaybetmemeli. Burada tam gidiş-dönüş ve imleç çevirisi sınanır.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function load(file) {
    const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(js, { module, exports: module.exports, require });
    return module.exports;
}
const { gorselleriKisalt, gorselleriAc, kaynaktanIcerige } = load('lib/notGorselleri.ts');

const veri = n => 'data:image/jpeg;base64,' + 'A'.repeat(n);
const bir = veri(40000), iki = veri(30000);
const icerik = `Başlık\n\n![Not görseli](${bir})\n\nArada yazı\n\n![Ekran](${iki})\n\nSon satır`;

const k = gorselleriKisalt(icerik);
assert.equal(k.gorseller.length, 2);
assert.ok(!k.metin.includes('base64'), 'Kaynak kutusunda base64 kalmaz');
assert.ok(k.metin.length < 200, 'Kaynak metni kısa kalır: ' + k.metin.length);
assert.equal(k.metin, 'Başlık\n\n![Not görseli](gorsel:1)\n\nArada yazı\n\n![Ekran](gorsel:2)\n\nSon satır');
assert.equal(gorselleriAc(k.metin, k.gorseller), icerik, 'Değişmeden dönen metin notu aynen korur');

// Yazı düzenlemek görselleri bozmaz.
assert.equal(gorselleriAc(k.metin.replace('Arada yazı', 'Yeni yazı'), k.gorseller), icerik.replace('Arada yazı', 'Yeni yazı'));
// Yer tutucuyu silmek görseli siler; başkasını bozmaz.
const silinmis = gorselleriAc(k.metin.replace('![Not görseli](gorsel:1)\n\n', ''), k.gorseller);
assert.ok(!silinmis.includes(bir) && silinmis.includes(iki));
// Sıra değişse bile numara doğru görseli getirir.
assert.ok(gorselleriAc('![a](gorsel:2) ![b](gorsel:1)', k.gorseller) === `![a](${iki}) ![b](${bir})`);
// Tanınmayan numara veri uydurmaz, olduğu gibi kalır.
assert.equal(gorselleriAc('![x](gorsel:9)', k.gorseller), '![x](gorsel:9)');
// Görseli olmayan not hiç dokunulmadan geçer.
const duz = gorselleriKisalt('Yalnızca yazı');
assert.equal(duz.metin, 'Yalnızca yazı');
assert.equal(duz.araliklar.length, 0);
assert.equal(kaynaktanIcerige(5, duz.araliklar), 5);

// İmleç çevirisi: kutudaki konum gerçek içerikteki konuma denk gelir.
const yerTutucuBas = k.metin.indexOf('![Not görseli](gorsel:1)');
assert.equal(kaynaktanIcerige(yerTutucuBas, k.araliklar), icerik.indexOf('![Not görseli](' + bir));
const sonrasi = k.metin.indexOf('Arada yazı');
assert.equal(kaynaktanIcerige(sonrasi, k.araliklar), icerik.indexOf('Arada yazı'));
assert.equal(k.metin.slice(sonrasi, sonrasi + 10), icerik.slice(kaynaktanIcerige(sonrasi, k.araliklar), kaynaktanIcerige(sonrasi, k.araliklar) + 10));
const sonSatir = k.metin.indexOf('Son satır');
assert.equal(kaynaktanIcerige(sonSatir, k.araliklar), icerik.indexOf('Son satır'));
// Yer tutucunun ortasına düşen imleç base64 verisini ortadan bölmez.
const orta = kaynaktanIcerige(yerTutucuBas + 5, k.araliklar);
assert.equal(orta, icerik.indexOf('![Not görseli](' + bir) + `![Not görseli](${bir})`.length);

// Uzak adresli görseller yer tutucuya çevrilmez: yalnız gömülü veri kısaltılır.
const uzak = gorselleriKisalt('![a](https://example.com/a.png)');
assert.equal(uzak.gorseller.length, 0);

console.log('OK: Kaynak görünümü base64 taşımaz, gidiş-dönüş notu korur, imleç konumları çevrilir');
