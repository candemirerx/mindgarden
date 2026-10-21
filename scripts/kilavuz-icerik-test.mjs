/**
 * Kılavuz içeriğinin tutarlılık testi: ders kimlikleri tekil mi, her dersin
 * hedefi ve özeti var mı, soruların doğru yanıtı seçeneklerin içinde mi,
 * yollar var olan derslere mi işaret ediyor? Uygulamalı görevlerin her adımı
 * ilerleyebiliyor mu, vurgulanacak öğe arayüz kodunda gerçekten işaretli mi?
 *
 * Çalıştırmak için: node --experimental-strip-types scripts/kilavuz-icerik-test.mjs
 */
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { SEVIYELER, YOLLAR, SOZLUK, SSS, TUM_DERSLER } = await import(pathToFileURL(join(process.cwd(), 'lib/kilavuzIcerik.ts')).href);
const { GOREVLER } = await import(pathToFileURL(join(process.cwd(), 'lib/kilavuzGorevleri.ts')).href);
const GORSELLER = ['kavram', 'giris', 'anaEkran', 'ikiEkran', 'liste', 'kart', 'editor', 'yedek', 'yollar'];

const kimlikler = TUM_DERSLER.map((d) => d.id);
assert.equal(new Set(kimlikler).size, kimlikler.length, 'ders kimlikleri tekil olmalı');
assert.equal(SEVIYELER.length, 5, 'beş seviye');

for (const d of TUM_DERSLER) {
    assert.ok(d.hedef?.trim(), `${d.id}: hedef yok`);
    assert.ok(d.hatirla?.trim(), `${d.id}: akılda kalsın yok`);
    assert.ok(Number.isInteger(d.sure) && d.sure >= 1 && d.sure <= 10, `${d.id}: süre 1-10 dk olmalı`);
    assert.ok(d.adimlar.length >= 1, `${d.id}: adım yok`);
    if (d.gorsel) assert.ok(GORSELLER.includes(d.gorsel), `${d.id}: bilinmeyen görsel ${d.gorsel}`);
    for (const metin of [...d.adimlar, d.ipucu, d.dene, d.hatirla].filter(Boolean)) {
        assert.equal((metin.match(/\*\*/g) || []).length % 2, 0, `${d.id}: kapanmamış ** işareti: ${metin.slice(0, 40)}`);
    }
    if (d.goster) {
        assert.ok(['ana', 'liste', 'tuval'].includes(d.goster.ekran), `${d.id}: bilinmeyen ekran ${d.goster.ekran}`);
        assert.ok(d.goster.hedef.trim() && d.goster.baslik.trim() && d.goster.metin.trim(), `${d.id}: eksik Bana göster alanı`);
    }
    // Her ders bir yolla tamamlanabilmeli: uygulamada yaparak, soruyla ya da elle (bu durumda açıklama gerekmez).
    if (d.tamamlanma) assert.ok(/tamamlanır\.$/.test(d.tamamlanma), `${d.id}: tamamlanma cümlesi "tamamlanır." ile bitmeli`);
    if (d.soru) {
        assert.ok(d.soru.secenekler.length >= 2, `${d.id}: en az iki seçenek`);
        assert.ok(d.soru.dogru >= 0 && d.soru.dogru < d.soru.secenekler.length, `${d.id}: doğru yanıt seçeneklerin dışında`);
        assert.equal(new Set(d.soru.secenekler).size, d.soru.secenekler.length, `${d.id}: aynı seçenek iki kez`);
        assert.ok(d.soru.aciklama.trim(), `${d.id}: açıklama yok`);
    }
}

// Başlangıç seviyesi hiç dersi atlanmadan çalışabilmeli: her dersin bir sorusu olsun.
for (const d of SEVIYELER[0].dersler) assert.ok(d.soru, `${d.id}: Başlangıç dersinde soru olmalı`);

for (const y of YOLLAR) {
    assert.ok(y.dersler.length > 0, `${y.id}: boş yol`);
    for (const id of y.dersler) assert.ok(kimlikler.includes(id), `${y.id}: olmayan ders ${id}`);
}
assert.equal(new Set(SOZLUK.map((s) => s.terim)).size, SOZLUK.length, 'sözlük terimleri tekil');
assert.ok(SSS.length > 0);

// Kodda dersTamamla('…') ile çağrılan her kimlik gerçekten bir ders olmalı (yazım hatası ilerlemeyi sessizce kaybettirir).
const { readFileSync, readdirSync, statSync } = await import('node:fs');
const tara = (klasor) => readdirSync(klasor).flatMap((ad) => {
    const yol = join(klasor, ad);
    return statSync(yol).isDirectory() ? tara(yol) : /\.(ts|tsx)$/.test(ad) ? [yol] : [];
});
const cagrilar = new Set();
/** Derse bağlı olmayan görev eylemleri (kilavuzEylemi). */
const eylemler = new Set();
let kaynak = '';
for (const dosya of ['app', 'components', 'lib'].flatMap((k) => tara(join(process.cwd(), k)))) {
    const metin = readFileSync(dosya, 'utf8');
    // Görev ve ders verisi seçicileri kendisi içerir; işaret denetimine yalnız arayüz kodu girer.
    if (!/kilavuz(Gorevleri|Icerik)\.ts$/.test(dosya)) kaynak += metin;
    for (const m of metin.matchAll(/dersTamamla\('([a-z0-9-]+)'\)/g)) cagrilar.add(m[1]);
    for (const m of metin.matchAll(/kilavuzEylemi\('([a-z0-9-]+)'\)/g)) eylemler.add(m[1]);
}
for (const id of cagrilar) assert.ok(kimlikler.includes(id), `dersTamamla('${id}'): böyle bir ders yok`);
// "Kendiliğinden tamamlanır" diyen her dersin kodda gerçekten bir tetikleyicisi olmalı.
for (const d of TUM_DERSLER.filter((x) => x.tamamlanma?.includes('kendiliğinden'))) {
    assert.ok(cagrilar.has(d.id), `${d.id}: "kendiliğinden tamamlanır" diyor ama kodda dersTamamla('${d.id}') yok`);
}

// Uygulamalı görevler: her adım bir yolla ilerleyebilmeli, vurgulayacağı öğe de kodda gerçekten işaretli olmalı.
const gorevKimlikleri = GOREVLER.map((g) => g.id);
assert.equal(new Set(gorevKimlikleri).size, gorevKimlikleri.length, 'görev kimlikleri tekil olmalı');
/** Seçicideki işaretler (data-…, aria-label, aria-labelledby, #kimlik) arayüz kodunda geçmeli; yazım hatası adımı kilitler. */
const isaretDenetle = (secici) => {
    for (const [, ad, deger] of secici.matchAll(/\[(data-[a-z-]+)(?:="([^"]+)")?\]/g)) {
        // Değer ya düz yazılıdır ya da bir listeden üretilir (data-kart-eylem={id}, data-ayar={id}).
        const izler = deger ? [`${ad}="${deger}"`, `${ad}={`] : [ad];
        assert.ok(izler.some((iz) => kaynak.includes(iz)), `${secici}: ${izler[0]} arayüz kodunda yok`);
    }
    for (const [, etiket] of secici.matchAll(/aria-label="([^"]+)"/g)) {
        assert.ok(kaynak.includes(`"${etiket}"`) || kaynak.includes(`'${etiket}'`), `${secici}: aria-label "${etiket}" arayüz kodunda yok`);
    }
    for (const [, id] of secici.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(kaynak.includes(`id="${id}"`), `${secici}: id="${id}" arayüz kodunda yok`);
    // Üretilen kimlikler (#ayar-kutu-…) yalnız bazı görünümlerde basılır; görevler kalıcı data- işaretleri kullanır.
    assert.ok(!secici.includes('#'), `${secici}: kimlik yerine data- işareti kullanın`);
};
let adimSayisi = 0;
for (const g of GOREVLER) {
    assert.ok(g.baslik.trim() && g.aciklama.trim() && g.kazanimlar.length > 0, `${g.id}: eksik alan`);
    assert.ok(g.adimlar.length >= 2, `${g.id}: en az iki adım`);
    assert.equal(g.adimlar[0].ekran, g.baslangic, `${g.id}: ilk adım başlangıç ekranında olmalı`);
    for (const id of g.dersler) assert.ok(kimlikler.includes(id), `${g.id}: olmayan ders ${id}`);
    g.adimlar.forEach((a, i) => {
        adimSayisi++;
        assert.ok(['ana', 'liste', 'tuval', 'editor'].includes(a.ekran), `${g.id}: bilinmeyen ekran ${a.ekran}`);
        assert.ok(a.baslik.trim() && a.metin.trim(), `${g.id}: adım metni yok`);
        assert.equal((a.metin.match(/\*\*/g) || []).length % 2, 0, `${g.id}: kapanmamış ** işareti`);
        if (a.gecis === 'dokun') assert.ok(a.hedef?.length, `${g.id}/${a.baslik}: dokunma adımının hedefi olmalı`);
        else if (typeof a.gecis === 'object' && 'gorunce' in a.gecis) isaretDenetle(a.gecis.gorunce);
        else if (typeof a.gecis === 'object') assert.ok(cagrilar.has(a.gecis.eylem) || eylemler.has(a.gecis.eylem), `${g.id}/${a.baslik}: ${a.gecis.eylem} eylemi kodda hiç yayınlanmıyor`);
        else assert.equal(a.gecis, 'ileri', `${g.id}: bilinmeyen geçiş`);
        for (const s of a.hedef ?? []) isaretDenetle(s);
        // Ekran ancak bir dokunuşla değişir; önceki adım bunu beklemeli.
        const once = g.adimlar[i - 1];
        if (once && once.ekran !== a.ekran) assert.equal(once.gecis, 'dokun', `${g.id}: ekran değiştiren adım dokunma olmalı (${once.baslik})`);
    });
}

const soruSayisi = TUM_DERSLER.filter((d) => d.soru).length;
const otomatik = TUM_DERSLER.filter((d) => cagrilar.has(d.id)).length;
const gosterSayisi = TUM_DERSLER.filter((d) => d.goster || d.ayarId).length;
console.log(`PASS: ${TUM_DERSLER.length} ders (${otomatik} yaparak tamamlanır, ${gosterSayisi} Bana göster), ${soruSayisi} soru, ${YOLLAR.length} yol, ${SOZLUK.length} terim; ${GOREVLER.length} uygulamalı görev, ${adimSayisi} adım tutarlı`);
