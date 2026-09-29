// P1-06/P1-07 regresyon probu: AI proxy SSRF koruması, kimlik doğrulama,
// gövde boyutu ve hız sınırı. Sağlayıcıya gerçek istek gönderilmez.
// Çalıştırma: node docs/reviews/probes-d.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const net = require('node:net');

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
            process: { env: { NODE_ENV: 'production' } },
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
const govde = (veri) => ({ text: async () => JSON.stringify(veri), headers: { get: () => null } });

(async () => {
    const cagrilar = [];
    const sahteYanit = () =>
        new Response(JSON.stringify({ choices: [{ message: { content: 'sahte yanıt' } }] }), { status: 200 });

    // Özel sağlayıcı adı özel/loopback adrese çözümleniyorsa reddedilmeli.
    let dnsCevabi = [{ address: '10.0.0.5' }];

    const api = load(
        'app/api/spellcheck/route.ts',
        'export { isPrivateHost, isPrivateAddress };',
        {
            fetch: async (url, options) => {
                cagrilar.push({ url: String(url), redirect: options?.redirect ?? 'follow (varsayılan)' });
                return sahteYanit();
            },
        },
        {
            'next/server': require('next/server'),
            '@/lib/aiMacro': { DEFAULT_INSTRUCTION: 'sahte görev' },
            'node:net': net,
            'node:dns/promises': { lookup: async () => dnsCevabi },
        }
    );

    // 1) Adres filtresi: IPv4-eşlemeli IPv6 ve IPv6 aralıkları
    const eslenmis = new URL('http://[::ffff:127.0.0.1]').hostname;
    assert.equal(api.isPrivateHost(eslenmis), true);
    assert.equal(api.isPrivateHost('127.0.0.1'), true);
    assert.equal(api.isPrivateHost('169.254.169.254'), true);
    assert.equal(api.isPrivateHost('100.64.0.1'), true);
    assert.equal(api.isPrivateHost('example.com'), false);
    sonuc('adres_filtresi', {
        eslenmisLoopback: api.isPrivateHost(eslenmis),
        loopback: api.isPrivateHost('127.0.0.1'),
        bulutMetadata: api.isPrivateHost('169.254.169.254'),
        genelAlan: api.isPrivateHost('example.com'),
    });

    // 2) HTTP adresi üretimde reddedilmeli (HTTPS zorunlu)
    let yanit = await api.POST(
        govde({ text: 'merhaba', provider: 'custom', clientApiKey: 'k', customUrl: 'http://example.com/v1', customModel: 'm' })
    );
    assert.equal(yanit.status, 400);
    sonuc('http_adresi_reddedildi', { status: yanit.status });

    // 3) Alan adı özel bir IP'ye çözümleniyorsa sağlayıcıya gidilmemeli
    cagrilar.length = 0;
    yanit = await api.POST(
        govde({ text: 'merhaba', provider: 'custom', clientApiKey: 'k', customUrl: 'https://internal.example/v1', customModel: 'm' })
    );
    assert.equal(yanit.status, 400);
    assert.equal(cagrilar.length, 0);
    sonuc('ozel_ip_cozumlemesi_engellendi', { status: yanit.status, saglayiciCagrisi: cagrilar.length });

    // 4) Genel adres kabul edilmeli ve yönlendirme izlenmemeli
    dnsCevabi = [{ address: '93.184.216.34' }];
    cagrilar.length = 0;
    yanit = await api.POST(
        govde({ text: 'merhaba', provider: 'custom', clientApiKey: 'k', customUrl: 'https://api.example.com/v1', customModel: 'm' })
    );
    assert.equal(yanit.status, 200);
    assert.equal(cagrilar[0].redirect, 'manual');
    sonuc('genel_adres_kabul', { status: yanit.status, yonlendirme: cagrilar[0].redirect });

    // 5) Kimliksiz istek sunucu anahtarına düşmemeli
    cagrilar.length = 0;
    yanit = await api.POST(govde({ text: 'merhaba', provider: 'gemini' }));
    assert.equal(yanit.status, 401);
    assert.equal(cagrilar.length, 0);
    sonuc('kimliksiz_istek_reddedildi', { status: yanit.status, saglayiciCagrisi: cagrilar.length });

    // 6) Kullanıcının kendi anahtarı varsa oturum aranmaz
    cagrilar.length = 0;
    yanit = await api.POST(govde({ text: 'merhaba', provider: 'openai', clientApiKey: 'kendi-anahtar' }));
    assert.equal(yanit.status, 200);
    sonuc('kendi_anahtari_kabul', { status: yanit.status });

    // 7) Gövde boyutu sınırı
    const buyuk = 'x'.repeat(65 * 1024);
    yanit = await api.POST({ text: async () => JSON.stringify({ text: buyuk }), headers: { get: () => null } });
    assert.equal(yanit.status, 413);
    sonuc('buyuk_govde_reddedildi', { status: yanit.status });

    // 8) Bilinmeyen sağlayıcı
    yanit = await api.POST(govde({ text: 'merhaba', provider: 'bilinmeyen', clientApiKey: 'k' }));
    assert.equal(yanit.status, 400);
    sonuc('bilinmeyen_saglayici', { status: yanit.status });

    // 9) Hız sınırı: pencere içindeki fazla istek 429 dönmeli
    let sonDurum = 200;
    for (let i = 0; i < 140; i += 1) {
        const cevap = await api.POST(govde({ text: 'merhaba', provider: 'openai', clientApiKey: 'kendi-anahtar' }));
        sonDurum = cevap.status;
        if (sonDurum === 429) break;
    }
    assert.equal(sonDurum, 429);
    sonuc('hiz_siniri', { durum: sonDurum });

    console.log('Tüm P1-06/P1-07 kontrolleri geçti; sağlayıcıya gerçek istek gönderilmedi.');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
