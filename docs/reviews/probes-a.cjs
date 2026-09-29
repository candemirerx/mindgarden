// P1-01/P1-02/P1-09 regresyon probu: misafir -> hesap veri aktarımı ve
// depolama hatasında veri kaybının olmaması. Gerçek ağ isteği yoktur.
// Çalıştırma: node docs/reviews/probes-a.cjs
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

const depo = new Map();
let yazmaHatasi = false;
const storage = {
    getItem: (k) => (depo.has(k) ? depo.get(k) : null),
    setItem: (k, v) => {
        if (yazmaHatasi && k === 'nb-local-db-v1') throw new Error('QuotaExceededError');
        depo.set(k, v);
    },
    removeItem: (k) => depo.delete(k),
};
const context = { window: { localStorage: storage }, localStorage: storage };

const kayitlar = () => JSON.parse(depo.get('nb-local-db-v1') ?? '{"gardens":[],"nodes":[]}');

(async () => {
    const local = load('lib/localClient.ts', '', context);
    const misafirId = local.signInAsGuest().user.id;

    const bahce = (
        await local.localClient.from('gardens').insert({ name: 'Misafir bahçesi' }).select().single()
    ).data;
    await local.localClient
        .from('nodes')
        .insert({ garden_id: bahce.id, content: 'misafir notu', color: '#123456', is_pruned: true })
        .select()
        .single();

    // --- 1) Yazma hatası olursa giriş iptal edilir, veri yerinde kalır -------
    yazmaHatasi = true;
    const basarisiz = await local.localClient.auth.signInWithGoogleProfile({
        email: 'synthetic@example.test',
    });
    yazmaHatasi = false;

    assert.notEqual(basarisiz.error, null, 'aktarım başarısızken giriş yapılmamalı');
    assert.equal(local.readLocalSession().user.id, misafirId, 'oturum misafir olarak kalmalı');
    const hataSonrasiGorunen = (await local.localClient.from('gardens').select()).data;
    assert.equal(hataSonrasiGorunen.length, 1, 'notlar misafir oturumunda görünmeye devam etmeli');
    sonuc('aktarim_hatasinda_veri_korunur', {
        girisYapildi: basarisiz.error === null,
        oturumMisafir: local.readLocalSession().user.id === misafirId,
        gorunenBahce: hataSonrasiGorunen.length,
        hata: basarisiz.error && basarisiz.error.message,
    });

    // --- 2) Başarılı geçiş: misafir notları yeni hesapta görünür ------------
    const giris = await local.localClient.auth.signInWithGoogleProfile({
        email: 'synthetic@example.test',
    });
    assert.equal(giris.error, null);
    const hesapId = giris.data.session.user.id;
    assert.notEqual(hesapId, misafirId);

    const hesaptaGorunen = (await local.localClient.from('gardens').select()).data;
    const notSayisi = (await local.localClient.from('nodes').select()).data.length;
    assert.equal(hesaptaGorunen.length, 1, 'misafir bahçesi hesaba aktarılmalı');
    assert.equal(notSayisi, 1, 'misafir notu hesaba aktarılmalı');
    sonuc('misafir_notlari_hesaba_aktarildi', {
        aktarim: giris.data.aktarim,
        gorunenBahce: hesaptaGorunen.length,
        gorunenNot: notSayisi,
        kayitliSahipDegisti: kayitlar().gardens.every((g) => g.user_id === hesapId),
    });

    // --- 3) Hesap izolasyonu: başka hesap bu notları görmemeli --------------
    await local.localClient.auth.signOut();
    const digerHesap = await local.localClient.auth.signInWithGoogleProfile({
        email: 'other@example.test',
    });
    assert.equal(digerHesap.error, null);
    assert.equal(digerHesap.data.aktarim.bahce, 0, 'hesaptan hesaba geçişte bahçe taşınmamalı');
    assert.equal(digerHesap.data.aktarim.not, 0, 'hesaptan hesaba geçişte not taşınmamalı');
    const digerGorunen = (await local.localClient.from('gardens').select()).data;
    assert.equal(digerGorunen.length, 0, 'ikinci hesap ilk hesabın bahçesini görmemeli');
    const sahipler = new Set(kayitlar().gardens.map((g) => g.user_id));
    assert.equal(sahipler.size, 1, 'bahçe yalnızca ilk hesaba ait olmalı');
    sonuc('hesap_izolasyonu', {
        digerHesabinGorduguBahce: digerGorunen.length,
        kayitliSahipler: Array.from(sahipler),
    });

    // --- 4) Silinen kayıtta içerik kalmaz (P1-08) ---------------------------
    const a = await local.localClient.auth.signInWithGoogleProfile({ email: 'synthetic@example.test' });
    const hedef = (await local.localClient.from('gardens').select()).data[0];
    const dugum = (await local.localClient.from('nodes').select()).data[0];
    const silmeAni = new Date().toISOString();
    await local.localClient
        .from('nodes')
        .update({ deleted_at: silmeAni, updated_at: silmeAni, content: '' })
        .eq('id', dugum.id);
    await local.localClient
        .from('nodes')
        .update({ deleted_at: silmeAni, updated_at: silmeAni })
        .eq('id', dugum.id);
    const ham = kayitlar();
    const silinenDugum = ham.nodes.find((n) => n.id === dugum.id);
    const silinenBahce = ham.nodes.filter((n) => String(n.garden_id) === String(hedef.id));
    assert.equal(silinenDugum.content, null, 'silinen kayıtta not metni tutulmamalı');
    sonuc('silinen_kayitta_icerik_yok', {
        oturumSahibiAktarildi: a.data.aktarim,
        silinenDugumIcerigi: silinenDugum.content,
        silinenBahceninDugumSayisi: silinenBahce.length,
    });

    console.log('\nprobes-a: tüm kontroller geçti');
})().catch((hata) => {
    console.error('\nprobes-a BAŞARISIZ:', hata && hata.message);
    process.exit(1);
});
