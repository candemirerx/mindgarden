// P1-04/P1-05/P1-08 regresyon probu: üç yönlü birleştirme, eşitleme kuyruğu ve
// tombstone sadeleştirmesi. Sağlayıcıya/Drive'a gerçek istek gönderilmez.
// Çalıştırma: node docs/reviews/probes-b.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');

function load(file, extra = '', context = {}, dependencies = {}) {
    const source = fs.readFileSync(file, 'utf8') + '\n' + extra;
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(
        compiled,
        {
            exports,
            console,
            URL,
            URLSearchParams,
            Blob,
            AbortController,
            setTimeout,
            clearTimeout,
            Promise,
            JSON,
            Date,
            Math,
            require: (name) => {
                if (name in dependencies) return dependencies[name];
                throw new Error('Unmocked dependency: ' + name);
            },
            ...context,
        },
        { filename: file, timeout: 5000 }
    );
    return exports;
}

const sonuc = (name, observed) => console.log(JSON.stringify({ name, observed }));

const storage = new Map();
const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
};

const drive = load(
    'lib/driveSync.ts',
    'export { chooseWinner, ucYonluBirlestir, reconcile, tombstoneSadelestir, senkronKuyrugu };',
    { localStorage },
    {
        '@capacitor/core': { Capacitor: { isNativePlatform: () => false } },
        './supabaseClient': { supabase: {}, isLocalBackend: true },
    }
);

(async () => {
    // 1) Görünüm değişikliği, diğer cihazın daha yeni metnini ezmemeli.
    const temel = { id: 'n', content: 'v1', is_expanded: false, updated_at: '2026-09-28T10:00:00Z' };
    const yerel = { id: 'n', content: 'v2 yeni metin', is_expanded: false, updated_at: '2026-09-28T10:00:30Z' };
    const uzak = { id: 'n', content: 'v1', is_expanded: true, updated_at: '2026-09-28T10:01:00Z' };
    const birlesti = drive.ucYonluBirlestir(temel, yerel, uzak);
    assert.equal(birlesti.row.content, 'v2 yeni metin');
    assert.equal(birlesti.row.is_expanded, true);
    assert.equal(birlesti.catisma, false);
    sonuc('gorunum_metni_ezmiyor', { content: birlesti.row.content, is_expanded: birlesti.row.is_expanded });

    // 2) İki cihaz da metni değiştirdiyse: yeni olan kazanır, kaybeden kopyalanır.
    const yerelA = { id: 'n2', content: 'A metni', updated_at: '2026-09-28T11:00:00Z' };
    const uzakB = { id: 'n2', content: 'B metni', updated_at: '2026-09-28T11:05:00Z' };
    const sonuc2 = drive.reconcile([yerelA], [uzakB], [temel]);
    assert.equal(sonuc2.rows[0].content, 'B metni');
    assert.equal(sonuc2.catismalar.length, 1);
    assert.equal(sonuc2.catismalar[0].content, 'A metni');
    assert.notEqual(sonuc2.catismalar[0].id, 'n2');
    sonuc('cakisma_kopyasi', {
        kazanan: sonuc2.rows[0].content,
        kaybedenKopya: sonuc2.catismalar[0].content,
        kopyaId: sonuc2.catismalar[0].id,
    });

    // 3) Silinen kaydın içeriği eşitleme verisinde taşınmamalı.
    const silinmis = { id: 'n3', content: 'gizli içerik', title: 'başlık', deleted_at: '2026-09-28T12:00:00Z' };
    const temiz = drive.tombstoneSadelestir(silinmis);
    assert.equal(temiz.content, null);
    assert.equal(temiz.title, null);
    assert.equal(temiz.deleted_at, silinmis.deleted_at);
    sonuc('tombstone_icerik_temiz', { content: temiz.content, deleted_at: temiz.deleted_at });

    // 4) Kuyruk: iş sürerken gelen çağrı kaybolmaz, ikinci kez koşulur.
    let kosu = 0;
    const ilk = drive.senkronKuyrugu(async () => {
        kosu += 1;
        if (kosu === 1) await new Promise((r) => setTimeout(r, 30));
        return kosu;
    });
    await new Promise((r) => setTimeout(r, 5));
    const ikinci = drive.senkronKuyrugu(async () => {
        kosu += 1;
        return kosu;
    });
    const [ilkSonuc, ikinciSonuc] = await Promise.all([ilk, ikinci]);
    assert.ok(kosu >= 2);
    assert.ok(ilkSonuc >= 2);
    sonuc('kuyruk_yeniden_kosu', { kosu, ilkSonuc, ikinciSonuc });

    // 5) Kaybeden sürüm silinmişse çatışma kopyası üretilmemeli.
    const silinenYeni = { id: 'n4', content: null, deleted_at: '2026-09-28T13:00:00Z' };
    const canliEski = { id: 'n4', content: 'eski metin', updated_at: '2026-09-28T12:00:00Z' };
    const sonuc5 = drive.reconcile([canliEski], [silinenYeni], []);
    assert.equal(sonuc5.catismalar.length, 0);
    assert.ok(sonuc5.rows[0].deleted_at);
    sonuc('silme_tombstone_kazaniyor', { rows: sonuc5.rows.length, catisma: sonuc5.catismalar.length });

    console.log('Tüm P1-04/P1-05/P1-08 kontrolleri geçti; ağ isteği yapılmadı.');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
