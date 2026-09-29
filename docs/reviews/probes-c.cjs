// P1-03/P2-18 regresyon probu: yedek doğrulaması ve alan bütünlüğü.
// Doğrulama saf fonksiyondur; bu betik hiçbir veritabanına yazmaz.
// Çalıştırma: node docs/reviews/probes-c.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');

function load(file) {
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, console, Set, Map, Number, String, JSON, RegExp }, {
        filename: file,
        timeout: 20000,
    });
    return exports;
}

const sonuc = (name, observed) => console.log(JSON.stringify({ name, observed }));

const yedek = load('lib/yedekDogrula.ts');
const { yedegiDogrula, dugumSeviyeleri, YEDEK_EN_COK_DUGUM } = yedek;

const bahce = (id, name) => ({ id, name, view_state: { x: 0, y: 0, zoom: 1 } });
const dugum = (id, garden_id, parent_id, ek = {}) => ({
    id,
    garden_id,
    parent_id,
    content: 'içerik ' + id,
    position_x: 1,
    position_y: 2,
    is_expanded: true,
    node_type: 'auto',
    ...ek,
});

const reddet = (ad, ham, beklenenParca) => {
    const sonucDegeri = yedegiDogrula(ham);
    assert.equal(sonucDegeri.ok, false, `${ad}: reddedilmeliydi`);
    if (beklenenParca) {
        assert.ok(
            sonucDegeri.hata.includes(beklenenParca),
            `${ad}: hata metni beklenen parçayı içermeli (${sonucDegeri.hata})`
        );
    }
    sonuc(ad, { ok: sonucDegeri.ok, hata: sonucDegeri.hata });
};

// --- 1) Bozuk dosyalar reddedilir ----------------------------------------
reddet('bozuk_json_koku', [1, 2, 3], 'yedek nesnesi');
reddet('eksik_listeler', { gardens: [], nodes: [] }, 'hiç bahçe yok');
reddet('liste_degil', { gardens: {}, nodes: [] }, 'listeleri bulunmalı');
reddet(
    'mukerrer_bahce_id',
    { gardens: [bahce('b1', 'A'), bahce('b1', 'B')], nodes: [] },
    'yineleniyor'
);
reddet(
    'mukerrer_not_id',
    { gardens: [bahce('b1', 'A')], nodes: [dugum('n1', 'b1', null), dugum('n1', 'b1', null)] },
    'yineleniyor'
);
reddet(
    'yetim_bahce',
    { gardens: [bahce('b1', 'A')], nodes: [dugum('n1', 'b2', null)] },
    'bulunmayan bir bahçeye bağlı'
);
reddet(
    'eksik_ust_not',
    { gardens: [bahce('b1', 'A')], nodes: [dugum('n1', 'b1', 'yok')] },
    'üst notu yedekte yok'
);
reddet(
    'kendi_kendinin_ustu',
    { gardens: [bahce('b1', 'A')], nodes: [dugum('n1', 'b1', 'n1')] },
    'kendi üst notu'
);
reddet(
    'dairesel_bag',
    {
        gardens: [bahce('b1', 'A')],
        nodes: [dugum('n1', 'b1', 'n2'), dugum('n2', 'b1', 'n1')],
    },
    'dairesel'
);
reddet(
    'farkli_bahcede_ust_not',
    {
        gardens: [bahce('b1', 'A'), bahce('b2', 'B')],
        nodes: [dugum('n1', 'b1', null), dugum('n2', 'b2', 'n1')],
    },
    'farklı bahçelerde'
);

// --- 2) Çok derin zincir yığını taşırmaz (eski RangeError senaryosu) -----
const derinDugumler = [];
for (let i = 0; i < 3000; i += 1) {
    derinDugumler.push(dugum('n' + i, 'b1', i === 0 ? null : 'n' + (i - 1)));
}
reddet('cok_derin_zincir', { gardens: [bahce('b1', 'A')], nodes: derinDugumler }, 'çok derin');

// --- 3) Boyut sınırı ------------------------------------------------------
reddet(
    'cok_fazla_not',
    { gardens: [bahce('b1', 'A')], nodes: new Array(YEDEK_EN_COK_DUGUM + 1).fill(dugum('x', 'b1', null)) },
    'en fazla'
);

// --- 4) Geçerli yedek: alanlar korunur, seviyeler doğru ------------------
const gecerli = yedegiDogrula({
    gardens: [bahce('b1', 'Bahçem')],
    nodes: [
        dugum('k1', 'b1', null, { color: '#1F4E3D', is_pruned: true }),
        dugum('c1', 'b1', 'k1', { color: null, is_pruned: false }),
        dugum('g1', 'b1', 'c1', { content: 42, node_type: 'bilinmeyen' }),
    ],
});
assert.equal(gecerli.ok, true, 'geçerli yedek kabul edilmeli');

const seviyeler = dugumSeviyeleri(gecerli.dugumler);
const korunan = gecerli.dugumler.find((d) => d.id === 'k1');
assert.equal(korunan.color, '#1F4E3D', 'renk alanı korunmalı');
assert.equal(korunan.is_pruned, true, 'budama durumu korunmalı');
assert.equal(seviyeler.get('k1'), 0);
assert.equal(seviyeler.get('c1'), 1);
assert.equal(seviyeler.get('g1'), 2);
assert.equal(gecerli.dugumler.find((d) => d.id === 'g1').content, '42');
assert.equal(gecerli.dugumler.find((d) => d.id === 'g1').node_type, 'auto');

sonuc('gecerli_yedek', {
    bahce: gecerli.bahceler.length,
    not: gecerli.dugumler.length,
    korunanRenk: korunan.color,
    korunanBudama: korunan.is_pruned,
    seviyeler: [seviyeler.get('k1'), seviyeler.get('c1'), seviyeler.get('g1')],
    uyariSayisi: gecerli.uyarilar.length,
});

// --- 5) Boş içerikli ama geçerli yedek -----------------------------------
const tekBahce = yedegiDogrula({ gardens: [bahce('b1', 'Sadece bahçe')], nodes: [] });
assert.equal(tekBahce.ok, true);
sonuc('notsuz_yedek', { ok: tekBahce.ok, not: tekBahce.dugumler.length });

console.log('\nprobes-c: tüm doğrulama kontrolleri geçti');
