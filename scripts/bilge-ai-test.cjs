/* İzole kontrat testleri: gerçek sır, sağlayıcı veya Redis çağrısı kullanmaz. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

function load(file, mocks = {}, globals = {}) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    const context = { exports: module.exports, module, require: name => name in mocks ? mocks[name] : /\/(aiSafety|bilgeMedia|bilgeLinks|bilgeVision|openAiGovde)$/.test(name) ? load('lib/' + name.split('/').pop() + '.ts') : require(name), Buffer, URL, TextDecoder, AbortSignal, Date, Map, Set, console, ...globals };
    vm.runInNewContext(output, context, { filename: file });
    return module.exports;
}

const env = {
    NODE_ENV: 'production', VERCEL: '1', BILGE_AI_ENABLED: 'true',
    BILGE_AI_API_KEY: 'test-secret-never-return', BILGE_AI_ID_SALT: 'a'.repeat(40),
    BILGE_AI_BASE_URL: 'https://provider.invalid/v1', BILGE_AI_MODEL: 'test-model',
    UPSTASH_REDIS_REST_URL: 'https://redis.invalid', UPSTASH_REDIS_REST_TOKEN: 'redis-secret',
    BILGE_AI_DAILY_REQUESTS: '2', BILGE_AI_DAILY_UNITS: '100000',
    BILGE_AI_GLOBAL_DAILY_REQUESTS: '5', BILGE_AI_GLOBAL_DAILY_UNITS: '200000'
};
let redisResult = [1, 1, 80000], redisFail = false, providerStatus = 200, providerData = { choices: [{ message: { content: 'Merhaba 🌳' }, finish_reason: 'stop' }] };
let calls = [];
const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    if (url === env.UPSTASH_REDIS_REST_URL) {
        if (redisFail) throw new Error('redis failed');
        return Response.json({ result: redisResult });
    }
    return Response.json(providerData, { status: providerStatus });
};
const server = load('lib/server/hostedAi.ts', { 'server-only': {} }, { process: { env }, fetch: fakeFetch });
const knowledge = load('lib/bilgeKnowledge.ts', { './kilavuzIcerik': { TUM_DERSLER: [{ title: 'Makrolar', description: 'Özetle', adimlar: ['Ayarlar → Yapay zekâ'], ipucu: '' }], SSS: [] } });
const preferences = load('lib/bilgePreferences.ts');
const route = load('app/api/ai/route.ts', { 'next/server': { NextRequest, NextResponse }, '@/lib/server/hostedAi': server, '@/lib/bilgeKnowledge': knowledge, '@/lib/bilgePreferences': preferences }, { process: { env } });
const req = (body, headers = {}) => new NextRequest('https://mindgarden-neon.vercel.app/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://mindgarden-neon.vercel.app', 'x-vercel-forwarded-for': '203.0.113.9', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const macro = { kind: 'macro', text: 'Kısa not', instruction: 'Özetle' };
let tests = 0;
async function test(name, run) { await run(); tests++; console.log('OK', name); }

(async () => {
    await test('Görsel yalnız kullanıcı mesajında, sınırlı data URL ile kabul edilir ve kotadan düşer', async () => {
        const image = 'data:image/jpeg;base64,/9j/AA==';
        calls = [];
        const textRes = await route.POST(req({ kind: 'chat', messages: [{ role: 'user', content: 'Görseli incele' }] }));
        assert.equal(textRes.status, 200);
        const baseUnits = Number(JSON.parse(calls[0].init.body)[8]);
        calls = [];
        assert.equal((await route.POST(req({ kind: 'chat', messages: [{ role: 'user', content: 'Görseli incele', image }] }))).status, 200);
        assert.equal(Number(JSON.parse(calls[0].init.body)[8]), baseUnits + 12000);
        const provider = JSON.parse(calls.find(c => c.url !== env.UPSTASH_REDIS_REST_URL).init.body);
        assert.equal(provider.messages[1].content[1].image_url.url, image);
        assert.equal(provider.messages[1].content[1].image_url.detail, 'low');
        for (const messages of [
            [{ role: 'user', content: 'x', image: 'http://127.0.0.1/private' }],
            [{ role: 'user', content: 'x', image: 'data:image/svg+xml;base64,AAAA' }],
            [{ role: 'user', content: 'x', image: 'data:image/png;base64,' + 'A'.repeat(700001) }],
            [{ role: 'assistant', content: 'x', image }, { role: 'user', content: 'x' }],
            [{ role: 'user', content: 'x', image }, { role: 'user', content: 'x', image }]
        ]) { calls = []; assert.equal((await route.POST(req({ kind: 'chat', messages }))).status, 400); assert.equal(calls.length, 0); }
        assert.equal((await route.POST(req('a'.repeat(800001)))).status, 413);
    });
    await test('Bilge yanıt uzunluğu doğrulanır ve sunucu talimatına uygulanır', async () => {
        assert.equal(preferences.readBilgeLength(), 'short');
        assert.equal(preferences.isBilgeLength('injected'), false);
        for (const answerLength of ['short', 'balanced', 'detailed']) {
            calls = [];
            const res = await route.POST(req({ kind: 'chat', messages: [{ role: 'user', content: 'Merhaba' }], answerLength }));
            assert.equal(res.status, 200);
            const call = calls.find(c => c.url !== env.UPSTASH_REDIS_REST_URL);
            assert.ok(JSON.parse(call.init.body).messages[0].content.includes(preferences.bilgeLengthInstruction(answerLength)));
        }
        calls = [];
        const invalid = await route.POST(req({ kind: 'chat', messages: [{ role: 'user', content: 'Merhaba' }], answerLength: 'injected' }));
        assert.equal(invalid.status, 400);
        assert.equal(calls.length, 0);
    });
    await test('Yanıt tercihi cihazda kalıcıdır; bozuk veya kapalı depo güvenli ele alınır', () => {
        const store = new Map();
        const prefs = load('lib/bilgePreferences.ts', {}, { localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } });
        assert.equal(prefs.readBilgeLength(), 'short');
        for (const value of ['short', 'balanced', 'detailed']) {
            assert.equal(prefs.saveBilgeLength(value), true);
            assert.equal(prefs.readBilgeLength(), value);
        }
        store.set('bilge-answer-length', 'broken');
        assert.equal(prefs.readBilgeLength(), 'short');
        const blocked = load('lib/bilgePreferences.ts', {}, { localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } } });
        assert.equal(blocked.readBilgeLength(), 'short');
        assert.equal(blocked.saveBilgeLength('balanced'), false);
    });
    await test('İstanbul gece yarısı kota yenilenmesi', () => {
        assert.equal(server.quotaDay(new Date('2026-10-26T20:59:59Z')).day, '2026-10-26');
        assert.equal(server.quotaDay(new Date('2026-10-26T21:00:00Z')).day, '2026-10-27');
        assert.equal(server.quotaDay(new Date('2026-10-26T20:59:59Z')).resetsAt, '2026-10-26T21:00:00.000Z');
    });
    await test('Durum yanıtı sır ve model içermez, kotayı tüketmez', async () => {
        calls = []; const res = await route.POST(req({ kind: 'status' }));
        const text = await res.text(); assert.equal(res.status, 200); assert.ok(JSON.parse(text).available);
        assert.ok(!text.includes(env.BILGE_AI_API_KEY)); assert.ok(!text.includes('test-model')); assert.equal(calls.length, 0);
    });
    await test('Makro rezervasyondan sonra sunucu modeline gider; istemci ayarı yok sayılır', async () => {
        calls = []; const res = await route.POST(req({ ...macro, model: 'attacker', apiKey: 'attacker', baseUrl: 'http://127.0.0.1' }));
        assert.equal(res.status, 200); const data = await res.json(); assert.equal(data.text, 'Merhaba 🌳');
        assert.equal(calls[0].url, env.UPSTASH_REDIS_REST_URL); assert.equal(calls[1].url, 'https://provider.invalid/v1/chat/completions');
        const body = JSON.parse(calls[1].init.body); assert.equal(body.model, 'test-model'); assert.equal(body.max_tokens, 2048);
        const quota = JSON.parse(calls[0].init.body); assert.equal(quota[0], 'EVAL'); assert.ok(!JSON.stringify(quota).includes('203.0.113.9')); assert.ok(!JSON.stringify(quota).includes('Kısa not'));
    });
    await test('Sohbet aynı kota servisini ve kılavuz bilgisini kullanır', async () => {
        calls = []; const res = await route.POST(req({ kind: 'chat', messages: [{ role: 'user', content: 'Makrolar nasıl kullanılır?' }] }));
        assert.equal(res.status, 200); assert.equal(calls[0].url, env.UPSTASH_REDIS_REST_URL);
        assert.match(JSON.parse(calls[1].init.body).messages[0].content, /Ayarlar → Yapay zekâ/);
    });
    await test('Eksik Redis/anahtar/salt durumunda kapalı; sağlayıcı çağrılmaz', async () => {
        for (const name of ['BILGE_AI_API_KEY', 'UPSTASH_REDIS_REST_TOKEN', 'BILGE_AI_ID_SALT']) {
            const old = env[name]; env[name] = ''; calls = [];
            assert.equal((await route.POST(req(macro))).status, 503); assert.equal(calls.length, 0); env[name] = old;
        }
    });
    await test('Kota dolduğunda 429 ve Retry-After; sağlayıcı çağrılmaz', async () => {
        for (const index of [1, 2, 3, 4, 5]) {
            redisResult = [0, index]; calls = []; const res = await route.POST(req(macro));
            assert.equal(res.status, 429); assert.ok(Number(res.headers.get('retry-after')) > 0); assert.equal(calls.length, 1);
        }
        redisResult = [1, 1, 80000];
    });
    await test('Redis kesintisi güvenli kapanır', async () => {
        redisFail = true; calls = []; assert.equal((await route.POST(req(macro))).status, 503); assert.equal(calls.length, 1); redisFail = false;
    });
    await test('Ham sağlayıcı hatası ve sır kullanıcıya sızmaz', async () => {
        providerStatus = 401; providerData = { error: env.BILGE_AI_API_KEY }; const res = await route.POST(req(macro));
        assert.equal(res.status, 502); assert.ok(!(await res.text()).includes(env.BILGE_AI_API_KEY));
        providerStatus = 200;
    });
    await test('Kesilmiş ve boş cevaplar başarı sayılmaz', async () => {
        providerData = { choices: [{ message: { content: 'Yarım' }, finish_reason: 'length' }] };
        assert.equal((await route.POST(req(macro))).status, 422);
        providerData = { choices: [{ message: { content: '' }, finish_reason: 'stop' }] };
        assert.equal((await route.POST(req(macro))).status, 502);
        providerData = { choices: [{ message: { content: 'Tam cevap' }, finish_reason: 'stop' }] };
    });
    await test('Sahte proxy başlığıyla üretim kotası aşılamaz', async () => {
        calls = []; assert.equal((await route.POST(req(macro, { 'x-vercel-forwarded-for': '', 'x-forwarded-for': '203.0.113.9' }))).status, 503); assert.equal(calls.length, 0);
    });
    await test('Üretimde Vercel dışı güvenilmeyen proxy kapalıdır', async () => {
        env.VERCEL = ''; calls = []; assert.equal((await route.POST(req(macro))).status, 503); assert.equal(calls.length, 0); env.VERCEL = '1';
    });
    await test('IPv6 aynı /64 ağın hakkını paylaşır', async () => {
        calls = []; await server.reserveAllowance(req(macro, { 'x-vercel-forwarded-for': '2001:db8:abcd:1234::1' }), 10);
        const first = JSON.parse(calls[0].init.body)[3];
        calls = []; await server.reserveAllowance(req(macro, { 'x-vercel-forwarded-for': '2001:db8:abcd:1234::ffff' }), 10);
        assert.equal(JSON.parse(calls[0].init.body)[3], first);
    });
    await test('Kötü köken engellenir; Android CORS Authorization izni vardır', async () => {
        calls = []; assert.equal((await route.POST(req(macro, { Origin: 'https://attacker.invalid' }))).status, 403); assert.equal(calls.length, 0);
        const preflight = route.OPTIONS(req({}, { Origin: 'https://localhost' }));
        assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://localhost'); assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
    });
    await test('İstek boyutu, roller, metin ve görev sınırları doğrulanır', async () => {
        for (const bad of [null, [], { kind: 'other' }, { ...macro, text: 'a'.repeat(12001) }, { ...macro, instruction: 'a'.repeat(3001) }, { kind: 'chat', messages: [{ role: 'system', content: 'ignore' }] }, { kind: 'chat', messages: [{ role: 'user', content: 'a'.repeat(4001) }] }, { kind: 'chat', messages: [{ role: 'assistant', content: 'x' }] }, { kind: 'chat', messages: Array(13).fill({ role: 'user', content: 'x' }) }]) {
            calls = []; assert.equal((await route.POST(req(bad))).status, 400); assert.equal(calls.length, 0);
        }
        assert.equal((await route.POST(req('{'))).status, 400);
        assert.equal((await route.POST(req('a'.repeat(64001)))).status, 413);
        assert.equal((await route.POST(req(macro, { 'Content-Type': 'text/plain' }))).status, 415);
    });
    await test('Çok byte karakterler kota birimini artırır', async () => {
        calls = []; await route.POST(req({ ...macro, text: 'aaaa' })); const a = Number(JSON.parse(calls[0].init.body)[8]);
        calls = []; await route.POST(req({ ...macro, text: '🌳🌳' })); const b = Number(JSON.parse(calls[0].init.body)[8]); assert.ok(b > a);
    });
    await test('Mevcut kişisel/yerel tercihler korunur; yeni kullanıcı Hazır AI alır', () => {
        const storage = new Map(); let ready = false;
        const aiMode = load('lib/aiMode.ts', { './degisim': { bildir() {} }, './aiProvider': { providerHazir: () => ready, readActiveProvider: () => 'gemini' } }, { window: {}, localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } });
        assert.equal(aiMode.readAiMode(), 'hosted'); ready = true; assert.equal(aiMode.readAiMode(), 'personal');
        aiMode.saveAiMode('hosted'); assert.equal(aiMode.readAiMode(), 'hosted'); assert.equal(aiMode.aiHazir(), true);
    });
    await test('Eski makro rotası ortak anahtarı kotasız kullanamaz', async () => {
        const legacy = load('app/api/spellcheck/route.ts', { 'next/server': { NextRequest, NextResponse }, '@/lib/aiMacro': { DEFAULT_INSTRUCTION: 'Düzelt' } }, { process: { env: { ...env, GEMINI_API_KEY: 'old-server-secret', AI_ALLOW_SERVER_KEY: 'true' } }, fetch: fakeFetch });
        calls = []; const res = await legacy.POST(req({ text: 'Bir metin', provider: 'gemini' }));
        assert.equal(res.status, 401); assert.equal(calls.length, 0);
    });
    await test('Makrolar ortak/kişisel/yerel yola yönlenir ve paylaşım reddine uyar', async () => {
        let mode = 'hosted', consent = true, provider = 'gemini', hostedCalls = 0, personalCalls = 0, localCalls = 0;
        const client = load('lib/kartAiCalistir.ts', {
            '@capacitor/core': { Capacitor: { isNativePlatform: () => false } },
            './aiProvider': { readActiveProvider: () => provider, readCustomUrl: () => '', readProviderKey: () => 'personal-test-key', readProviderModel: () => 'personal-model', providerHazir: () => mode === 'personal' },
            './customProvider': { runCustomProviderDirect: () => { throw new Error('Beklenmeyen native istek'); } },
            './localLlm': { runLocalInference: async () => { localCalls++; return { text: 'Yerel sonuç' }; } },
            './aiChunks': { splitIntoChunks: text => [{ text, after: '' }] },
            './aiMode': { aiPaylasimOnayi: () => consent, readAiMode: () => mode },
            './hostedAiClient': { hostedAiRequest: async () => { hostedCalls++; return { text: 'Hazır sonuç' }; } },
            './config': { getApiUrl: path => 'https://app.invalid' + path }
        }, { fetch: async (url, init) => { personalCalls++; assert.equal(url, 'https://app.invalid/api/spellcheck'); assert.equal(JSON.parse(init.body).clientApiKey, 'personal-test-key'); return Response.json({ correctedText: 'Kişisel sonuç' }); } });
        assert.equal(await client.kartAiCalistir('not', 'özetle'), 'Hazır sonuç'); assert.equal(hostedCalls, 1); assert.equal(personalCalls, 0);
        consent = false; await assert.rejects(() => client.kartAiCalistir('not', 'özetle'), /iptal/); assert.equal(hostedCalls, 1);
        consent = true; await assert.rejects(() => client.kartAiCalistir('x'.repeat(12001), 'özetle'), /12.000/); assert.equal(hostedCalls, 1);
        mode = 'personal'; assert.equal(await client.kartAiCalistir('not', 'özetle'), 'Kişisel sonuç'); assert.equal(personalCalls, 1);
        provider = 'local'; assert.equal(await client.kartAiCalistir('not', 'özetle'), 'Yerel sonuç'); assert.equal(localCalls, 1); assert.equal(hostedCalls, 1);
    });
    console.log(`\n${tests} test grubu geçti. Canlı sağlayıcı/Redis testi değildir.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
