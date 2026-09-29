// Salt okunur güvenlik doğrulaması: gerçek app/api/spellcheck/route.ts kaynağı
// yalıtılmış VM'de çalıştırılır; ağ isteği yapılmaz, sahte fetch kullanılır.
// Çalıştır: node docs/reviews/2026-09-28-guvenlik-dogrulama.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const net = require('node:net');

function loadRoute(env) {
  const source = fs.readFileSync('app/api/spellcheck/route.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;

  const cagrilar = [];
  const exports = {};
  const context = {
    exports,
    // Rota hata durumunda console.error ile logluyor; doğrulama çıktısı temiz kalsın.
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async (url, init) => {
      cagrilar.push(String(url));
      return {
        ok: true,
        status: 200,
        type: 'basic',
        json: async () => ({ choices: [{ message: { content: 'sahte yanıt' } }] }),
        text: async () => '',
      };
    },
    process: { env },
    require: (name) => {
      if (name === 'next/server') {
        return {
          NextRequest: class {},
          NextResponse: {
            json: (body, init) => ({ status: init && init.status ? init.status : 200, body }),
          },
        };
      }
      if (name === 'node:dns/promises') {
        return { lookup: async () => [{ address: '93.184.216.34' }] };
      }
      if (name === 'node:net') return { isIP: net.isIP };
      if (name === '@/lib/aiMacro') return { DEFAULT_INSTRUCTION: 'Sahte görev' };
      throw new Error('Beklenmeyen bağımlılık: ' + name);
    },
  };
  vm.runInNewContext(compiled, context, { filename: 'route.ts', timeout: 5000 });
  return { api: exports, cagrilar };
}

const istek = (govde, ip = '203.0.113.7') => ({
  json: async () => govde,
  text: async () => JSON.stringify(govde),
  headers: { get: (ad) => (ad.toLowerCase() === 'x-forwarded-for' ? ip : ad.toLowerCase() === 'content-length' ? String(JSON.stringify(govde).length) : null) },
});

const sonuc = (ad, gozlem) => console.log(JSON.stringify({ name: ad, observed: gozlem }));

(async () => {
  // 1) Kimliksiz istek, istemci anahtarı yok, sunucu anahtarı tanımlı: anahtar tüketilmemeli.
  const sunucuAnahtari = loadRoute({ NODE_ENV: 'production', GEMINI_API_KEY: 'sahte-sunucu-anahtari' });
  const yanit1 = await sunucuAnahtari.api.POST(
    istek({ text: 'sentetik metin', provider: 'gemini', clientApiKey: '' })
  );
  sonuc('anonim_sunucu_anahtari', {
    status: yanit1.status,
    saglayiciCagrisi: sunucuAnahtari.cagrilar.length,
  });

  // 2) Özel sağlayıcı adresi özel ağa çözümleniyorsa reddedilmeli.
  const ozel = loadRoute({ NODE_ENV: 'production' });
  const yanit2 = await ozel.api.POST(
    istek({ text: 'sentetik', provider: 'custom', clientApiKey: 'k', customUrl: 'https://127.0.0.1/v1', customModel: 'm' })
  );
  sonuc('ozel_adres_loopback', { status: yanit2.status, saglayiciCagrisi: ozel.cagrilar.length });

  // 3) IPv4-eşlemeli IPv6 gösterimi SSRF filtresini atlatmamalı.
  const eslemeli = loadRoute({ NODE_ENV: 'production' });
  const yanit3 = await eslemeli.api.POST(
    istek({ text: 'sentetik', provider: 'custom', clientApiKey: 'k', customUrl: 'https://[::ffff:127.0.0.1]/v1', customModel: 'm' })
  );
  sonuc('ozel_adres_eslemeli_ipv6', { status: yanit3.status, saglayiciCagrisi: eslemeli.cagrilar.length });

  // 4) HTTPS dışı özel adres kabul edilmemeli.
  const http = loadRoute({ NODE_ENV: 'production' });
  const yanit4 = await http.api.POST(
    istek({ text: 'sentetik', provider: 'custom', clientApiKey: 'k', customUrl: 'http://example.test/v1', customModel: 'm' })
  );
  sonuc('ozel_adres_http', { status: yanit4.status, saglayiciCagrisi: http.cagrilar.length });

  // 5) Hız sınırı: aynı istemciden 130 istek sonrası 429 dönmeli.
  const sinir = loadRoute({ NODE_ENV: 'production' });
  let sonDurum = 0;
  for (let i = 0; i < 130; i += 1) {
    const y = await sinir.api.POST(
      istek({ text: 'sentetik', provider: 'custom', clientApiKey: 'k', customUrl: 'https://example.test/v1', customModel: 'm' }, '198.51.100.9')
    );
    sonDurum = y.status;
  }
  sonuc('hiz_siniri', { sonStatus: sonDurum, toplamSaglayiciCagrisi: sinir.cagrilar.length });
})();
