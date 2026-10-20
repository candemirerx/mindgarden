/**
 * Mini galerinin Google Drive eşitlemesi (lib/galeriDrive.ts) için test.
 *
 * İki "cihaz" (ayrı yerel galeri ve ayrı localStorage) aynı sahte Drive'ı
 * paylaşır. Sahte Drive, Drive v3'ün kullanılan uçlarını taklit eder: about,
 * files.list (appProperties sorgusu, sayfalama), multipart ve resumable
 * yükleme, indirme, silme.
 *
 * Çalıştırmak için: node scripts/galeri-drive-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// ---- Sahte Drive (hesap başına ayrı alan) ----
const hesaplar = new Map(); // token → { kimlik, dosyalar: Map }
const hesapAc = (token, kimlik) => hesaplar.set(token, { kimlik, dosyalar: new Map() });
let sayac = 0;
const istekler = [];
let cevrimdisi = false;
const json = (veri, status = 200, basliklar = {}) => new Response(JSON.stringify(veri), { status, headers: { 'Content-Type': 'application/json', ...basliklar } });
const bekleyenYuklemeler = new Map();

async function sahteFetch(adres, init = {}) {
    if (cevrimdisi) throw new TypeError('Failed to fetch');
    const url = new URL(adres);
    const yontem = init.method || 'GET';
    istekler.push(yontem + ' ' + url.pathname + (url.searchParams.get('uploadType') ? '?' + url.searchParams.get('uploadType') : ''));
    // Resumable yüklemenin ikinci adımı anahtarsız oturum adresine gider.
    if (url.pathname.startsWith('/oturum/')) {
        const oturum = bekleyenYuklemeler.get(url.pathname);
        const icerik = Buffer.from(await new Response(init.body).arrayBuffer());
        assert.equal(icerik.length, oturum.boyut, 'resumable boyutu');
        const id = 'f' + (++sayac);
        oturum.alan.dosyalar.set(id, { id, ...oturum.ust, icerik });
        return json({ id });
    }
    const token = (init.headers?.Authorization || '').replace('Bearer ', '');
    const alan = hesaplar.get(token);
    if (!alan) return json({ error: 'auth' }, 401);
    if (url.pathname === '/drive/v3/about') return json({ user: { permissionId: alan.kimlik } });
    if (url.pathname === '/drive/v3/files' && yontem === 'GET') {
        assert.equal(url.searchParams.get('spaces'), 'appDataFolder');
        const not = /value='((?:[^'\\]|\\.)*)'/.exec(url.searchParams.get('q'))[1].replace(/\\'/g, "'");
        const hepsi = [...alan.dosyalar.values()].filter((d) => d.appProperties?.nbNot === not);
        // Sayfalamayı sınamak için sayfa başına 2 dosya.
        const bas = Number(url.searchParams.get('pageToken') || 0);
        const sayfa = hepsi.slice(bas, bas + 2).map(({ icerik, ...d }) => d);
        return json({ files: sayfa, ...(bas + 2 < hepsi.length ? { nextPageToken: String(bas + 2) } : {}) });
    }
    if (url.pathname === '/upload/drive/v3/files' && url.searchParams.get('uploadType') === 'multipart') {
        const sinir = /boundary=(.+)$/.exec(init.headers['Content-Type'])[1];
        const govde = Buffer.from(await new Response(init.body).arrayBuffer());
        const parcalar = [];
        let i = govde.indexOf('--' + sinir);
        while (i >= 0) {
            const sonraki = govde.indexOf('\r\n--' + sinir, i + 2);
            if (sonraki < 0) break;
            const parca = govde.subarray(i + sinir.length + 4, sonraki);
            const baslikSonu = parca.indexOf('\r\n\r\n');
            parcalar.push(parca.subarray(baslikSonu + 4));
            i = sonraki + 2;
        }
        assert.equal(parcalar.length, 2, 'multipart iki parça olmalı');
        const ust = JSON.parse(parcalar[0].toString('utf8'));
        assert.deepEqual(ust.parents, ['appDataFolder']);
        const id = 'f' + (++sayac);
        alan.dosyalar.set(id, { id, name: ust.name, mimeType: ust.mimeType, appProperties: ust.appProperties, icerik: Buffer.from(parcalar[1]) });
        return json({ id });
    }
    if (url.pathname === '/upload/drive/v3/files' && url.searchParams.get('uploadType') === 'resumable') {
        const ust = JSON.parse(init.body);
        const yol = '/oturum/' + (++sayac);
        bekleyenYuklemeler.set(yol, { alan, ust: { name: ust.name, mimeType: ust.mimeType, appProperties: ust.appProperties }, boyut: Number(init.headers['X-Upload-Content-Length']) });
        return json({}, 200, { Location: 'https://www.googleapis.com' + yol });
    }
    const m = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (m) {
        const dosya = alan.dosyalar.get(decodeURIComponent(m[1]));
        if (!dosya) return json({ error: 'notFound' }, 404);
        if (yontem === 'DELETE') { alan.dosyalar.delete(dosya.id); return new Response(null, { status: 204 }); }
        return new Response(dosya.icerik, { status: 200, headers: { 'Content-Type': dosya.mimeType } });
    }
    return json({ error: 'beklenmeyen ' + yontem + ' ' + url.pathname }, 400);
}

// ---- Cihaz: galeriDrive'ı kendi yerel galerisi ve depolamasıyla çalıştırır ----
const kaynak = ts.transpileModule(readFileSync(new URL('../lib/galeriDrive.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function cihaz(ad) {
    const depo = new Map(); // id → öğe
    const yerel = new Map();
    const c = { ad, token: null, depo, exports: {} };
    const miniGaleri = {
        async galeriListele(notId) { return [...depo.values()].filter((o) => o.notId === notId).map((o) => ({ ...o })); },
        async galeriEsitlemeYaz(notId, yaz, sil) { yaz.forEach((o) => depo.set(o.id, { ...o })); sil.forEach((id) => depo.delete(id)); },
    };
    vm.runInNewContext(kaynak, {
        exports: c.exports, Error, TypeError, URL, Blob, Response, Promise, JSON, Map, Set, Math, Date, Number, String, Array, encodeURIComponent, console,
        fetch: sahteFetch,
        setTimeout: (f) => { f(); return 0; }, clearTimeout() { },
        window: {}, navigator: { onLine: true },
        localStorage: { getItem: (k) => yerel.get(k) ?? null, setItem: (k, v) => yerel.set(k, String(v)), removeItem: (k) => yerel.delete(k) },
        require: (n) => n === 'react' ? { useState() { }, useEffect() { }, useCallback: (f) => f }
            : n === './driveSync' ? { sessizDriveToken: async () => c.token, getDriveToken: async () => { if (!c.token) throw new Error('izin yok'); return c.token; } }
                : n === './miniGaleri' ? miniGaleri : {},
    });
    // Yerel ekleme/silme: uygulamadaki galeriyeEkle / galeridenSil gibi.
    c.ekle = (notId, oge) => { const id = ad + '-' + (++sayac); depo.set(id, { id, notId, olusturma: Date.now() + sayac, ...oge }); return id; };
    c.sil = (id) => { const o = depo.get(id); if (o?.driveId) c.exports.driveSilinecekEkle([{ driveId: o.driveId, hesap: o.driveHesap ?? '' }]); depo.delete(id); };
    c.esitle = async (notId) => { await c.exports.galeriyiSimdiEsitle(notId); };
    c.ogeler = (notId) => [...depo.values()].filter((o) => o.notId === notId);
    return c;
}

const NOT = 'not-1';
hesapAc('tok-A', 'hesap-A');
hesapAc('tok-B', 'hesap-B');
const telefon = cihaz('telefon');
const bilgisayar = cihaz('bilgisayar');
telefon.token = 'tok-A';
bilgisayar.token = 'tok-A';
const drive = () => [...hesaplar.get('tok-A').dosyalar.values()];
const metin = async (o) => o.metin ?? Buffer.from(await o.veri.arrayBuffer()).toString('utf8');

// 1) Telefonda eklenenler Drive'a yüklenir; bilgisayarda not açılınca iner (içerik ve tür korunur).
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const g1 = telefon.ekle(NOT, { tur: 'gorsel', ad: 'foto.png', veri: new Blob([PNG], { type: 'image/png' }) });
telefon.ekle(NOT, { tur: 'metin', ad: 'not.txt', metin: 'Galeri metni ğüşıöç 😀' });
telefon.ekle(NOT, { tur: 'dosya', ad: 'rapor.pdf', veri: new Blob(['%PDF-1.7 ğ'], { type: 'application/pdf' }) });
telefon.ekle('baska-not', { tur: 'metin', ad: 'b.txt', metin: 'başka not' });
await telefon.esitle(NOT);
assert.equal(drive().length, 3, 'yalnız bu notun 3 öğesi yüklenmeli');
assert.ok(telefon.ogeler(NOT).every((o) => o.driveId && o.driveHesap === 'hesap-A'), 'yüklenenler Drive kimliğini taşımalı');
await bilgisayar.esitle(NOT);
const inen = bilgisayar.ogeler(NOT).sort((a, b) => a.olusturma - b.olusturma);
assert.equal(inen.length, 3, 'bilgisayara 3 öğe inmeli');
assert.equal(inen[0].id, g1, 'öğe kimliği cihazlar arasında aynı kalmalı');
assert.deepEqual(new Uint8Array(await inen[0].veri.arrayBuffer()), PNG);
assert.equal(inen[0].veri.type, 'image/png');
assert.equal(await metin(inen[1]), 'Galeri metni ğüşıöç 😀');
assert.equal(inen[2].tur, 'dosya');
assert.equal(await metin(inen[2]), '%PDF-1.7 ğ');
assert.equal(bilgisayar.ogeler('baska-not').length, 0);
console.log('  ✓ telefonda eklenen görsel, metin ve dosya bilgisayara iner (sayfalı liste)');

// 2) İkinci eşitleme hiçbir şeyi yeniden yüklemez ya da indirmez.
istekler.length = 0;
await telefon.esitle(NOT); await bilgisayar.esitle(NOT);
assert.ok(!istekler.some((i) => i.startsWith('POST') || i.includes('alt=media')), 'boşta eşitleme yükleme/indirme yapmamalı: ' + istekler.join(', '));
assert.equal(drive().length, 3);
console.log('  ✓ değişiklik yokken yeniden yükleme ya da indirme olmaz');

// 3) Bilgisayarda silinen öğe Drive'dan ve telefondan da silinir.
bilgisayar.sil(g1);
await bilgisayar.esitle(NOT);
assert.equal(drive().length, 2);
await telefon.esitle(NOT);
assert.ok(!telefon.ogeler(NOT).some((o) => o.id === g1), 'telefondan da silinmeli');
assert.equal(telefon.ogeler(NOT).length, 2);
console.log('  ✓ bir cihazda silinen öğe diğerinden de silinir');

// 4) Çevrimdışı silme sıraya alınır; bağlantı gelince Drive'dan silinir ve geri inmez.
const silinecek = telefon.ogeler(NOT)[0].id;
telefon.sil(silinecek);
cevrimdisi = true;
await telefon.esitle(NOT);
cevrimdisi = false;
assert.equal(drive().length, 2, 'çevrimdışıyken Drive değişmez');
await telefon.esitle(NOT);
assert.equal(drive().length, 1, 'bağlantı gelince silinmeli');
assert.ok(!telefon.ogeler(NOT).some((o) => o.id === silinecek), 'silinen öğe geri inmemeli');
await bilgisayar.esitle(NOT);
assert.equal(bilgisayar.ogeler(NOT).length, 1);
console.log('  ✓ çevrimdışı silme sıraya alınır, sonra uygulanır');

// 5) Yüklendi ama kimlik kaydedilemedi: yeniden yüklenmez, var olan kopyaya bağlanır.
const k = telefon.ekle(NOT, { tur: 'metin', ad: 'k.txt', metin: 'kimliksiz' });
await telefon.esitle(NOT);
const kayit = telefon.depo.get(k);
delete kayit.driveId; delete kayit.driveHesap;
const once = drive().length;
await telefon.esitle(NOT);
assert.equal(drive().length, once, 'çift yükleme olmamalı');
assert.ok(telefon.depo.get(k).driveId);
console.log('  ✓ kimliği kaybolan öğe ikinci kez yüklenmez');

// 6) Büyük dosya (5 MB üstü) parça yüklemeyle (resumable) gider ve bozulmadan iner.
const buyuk = new Uint8Array(6 * 1024 * 1024).map((_, i) => i % 251);
const bid = telefon.ekle(NOT, { tur: 'dosya', ad: 'video.mp4', veri: new Blob([buyuk], { type: 'video/mp4' }) });
istekler.length = 0;
await telefon.esitle(NOT);
assert.ok(istekler.includes('POST /upload/drive/v3/files?resumable'), 'büyük dosya resumable gitmeli');
await bilgisayar.esitle(NOT);
const bInen = bilgisayar.depo.get(bid);
assert.deepEqual(new Uint8Array(await bInen.veri.arrayBuffer()), buyuk);
console.log('  ✓ 6 MB dosya parça yüklemeyle gider, bozulmadan iner');

// 7) Başka Google hesabına geçince yerel öğeler silinmez; yeni hesaba yüklenir.
const sayi = bilgisayar.ogeler(NOT).length;
bilgisayar.token = 'tok-B';
await bilgisayar.esitle(NOT);
assert.equal(bilgisayar.ogeler(NOT).length, sayi, 'hesap değişince yerel galeri korunmalı');
assert.equal(hesaplar.get('tok-B').dosyalar.size, sayi, 'öğeler yeni hesaba yüklenmeli');
assert.equal(drive().length, sayi, 'eski hesaptaki kopyalar dokunulmadan kalmalı');
console.log('  ✓ hesap değişiminde yanlış silme olmaz');

// 8) İzin yokken (tarayıcı, Google penceresi açılmadı) durum "izin" olur, hiçbir şey silinmez.
const webCihaz = cihaz('web');
webCihaz.ekle(NOT, { tur: 'metin', ad: 'w.txt', metin: 'web' });
webCihaz.exports.galeriEsitlemeIste(NOT, 0);
await new Promise((r) => setImmediate(r));
await webCihaz.esitle(NOT).catch(() => { });
assert.equal(webCihaz.ogeler(NOT).length, 1);
console.log('  ✓ izin yokken yerel galeri korunur');

// 9) Eşitleme kapalıyken Drive'a hiç istek gitmez.
istekler.length = 0;
telefon.exports.galeriEsitlemeAyarla(false);
telefon.ekle(NOT, { tur: 'metin', ad: 'kapali.txt', metin: 'kapalı' });
telefon.exports.galeriEsitlemeIste(NOT, 0);
await new Promise((r) => setImmediate(r));
assert.equal(istekler.length, 0, 'kapalıyken istek gitmemeli');
console.log('  ✓ eşitleme kapalıyken Drive\'a istek gitmez');

console.log('PASS: mini galeri Drive eşitlemesi (yükleme, indirme, silme, çevrimdışı, büyük dosya, hesap değişimi, kapalı)');
