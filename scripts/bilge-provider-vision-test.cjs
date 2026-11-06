/** Contract tests: fake transport, no keys/paid calls. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const { NextRequest, NextResponse } = require('next/server');
function load(file, mocks = {}, globals = {}) {
    const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(js, { module, exports: module.exports, require: n => n in mocks ? mocks[n] : /\/(bilgeMedia|bilgeVision|aiSafety|openAiGovde)$/.test(n) ? load('lib/' + n.split('/').pop() + '.ts') : require(n), URL, Buffer, AbortController, AbortSignal, setTimeout, clearTimeout, console: { ...console, error() {} }, ...globals });
    return module.exports;
}
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const text = 'Bu fotoğrafta ne var?';
let calls = [], status = 200;
const fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return Response.json({ choices: [{ message: { content: 'Görsel yanıtı' } }], candidates: [{ content: { parts: [{ text: 'Görsel yanıtı' }] } }], content: [{ text: 'Görsel yanıtı' }] }, { status });
};
const route = load('app/api/spellcheck/route.ts', { 'next/server': { NextRequest, NextResponse }, '@/lib/aiMacro': { DEFAULT_INSTRUCTION: 'Yanıtla' }, 'node:dns/promises': { lookup: async () => [{ address: '203.0.113.5' }] } }, { fetch, process: { env: { NODE_ENV: 'production' } } });
const request = body => new NextRequest('https://mindgarden-neon.vercel.app/api/spellcheck', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://localhost' }, body: JSON.stringify(body) });
(async () => {
    for (const provider of ['gemini', 'openai', 'anthropic', 'custom']) {
        calls = []; status = 200;
        const response = await route.POST(request({ text, image, macro: 'Fotoğrafı incele.', provider, clientApiKey: 'test-only', customUrl: 'https://public.example/v1', customModel: 'vision-test' }));
        assert.equal(response.status, 200, provider); assert.equal(calls.length, 1, 'One image -> one request');
        assert.equal((await response.json()).correctedText, 'Görsel yanıtı');
        const body = calls[0].body;
        if (provider === 'gemini') assert.equal(body.contents[0].parts[1].inlineData.data, image.split(',')[1]);
        else if (provider === 'anthropic') { assert.equal(body.messages[0].content[0].source.data, image.split(',')[1]); assert.equal(body.messages[0].content[0].source.media_type, 'image/png'); }
        else assert.equal(body.messages[0].content[1].image_url.url, image);
        status = 400; calls = [];
        assert.equal((await route.POST(request({ text, image, provider, clientApiKey: 'test', customUrl: 'https://public.example/v1', customModel: 'vision-test' }))).status, 400);
        // OpenAI uyumlu yollarda 400, gerekçedeki alan çıkarılarak bir kez daha
        // denenir; gerekçe alan adı vermezse en sade gövdeyle. Gemini ve
        // Anthropic farklı bir şema kullandığı için tek istekte kalır.
        assert.equal(calls.length, provider === 'custom' || provider === 'openai' ? 2 : 1, 'Rejected image is retried at most once');
        for (const call of calls) {
            const govde = call.body;
            const gonderilen = provider === 'gemini' ? govde.contents[0].parts[1].inlineData.data
                : provider === 'anthropic' ? govde.messages[0].content[0].source.data
                : govde.messages[0].content[1].image_url.url;
            assert.ok(gonderilen === image || gonderilen === image.split(',')[1], 'Retry never drops the photo');
            if (provider === 'custom') assert.equal(govde.model, 'vision-test', 'Retry never switches model');
        }
        if (provider === 'custom' || provider === 'openai') {
            const son = calls.at(-1).body;
            assert.equal(son.messages[0].content[1].image_url.detail, undefined, 'Last attempt drops the OpenAI-only detail field');
            assert.equal(son.temperature, undefined, 'Last attempt drops tuning parameters');
        }
        console.log('OK: ' + provider + ' image payload, success, rejection without silent text fallback');
    }
    for (const bad of ['https://example.com/photo.png', 'data:image/svg+xml;base64,AAAA', '', 'data:image/png;base64,' + 'A'.repeat(700000)]) {
        calls = []; assert.equal((await route.POST(request({ text, image: bad, provider: 'openai', clientApiKey: 'test' }))).status, 400); assert.equal(calls.length, 0);
    }
    assert.equal((await route.POST(request({ text: 'x'.repeat(70000), provider: 'openai', clientApiKey: 'test' }))).status, 413);
    assert.equal((await route.POST(request({ text, image, provider: 'custom', customUrl: 'https://127.0.0.1/v1', customModel: 'x' }))).status, 400);
    assert.equal((await route.POST(request({ text, image, provider: 'openai' }))).status, 401);
    console.log('OK: Invalid/oversized photos, text limit, SSRF and missing key fail closed');
    let nativeCalls = 0, nativeBody;
    const native = load('lib/customProvider.ts', { '@capacitor/core': { CapacitorHttp: { request: async req => { nativeCalls++; nativeBody = req.data; return { status: 200, data: { choices: [{ message: { content: 'Native yanıt' } }] } }; } } } });
    assert.equal(await native.runCustomProviderDirect({ baseUrl: 'https://custom.example/v1', apiKey: 'test', model: 'vision', instruction: 'İncele', text, image }), 'Native yanıt');
    assert.equal(nativeCalls, 1); assert.equal(nativeBody.messages[0].content[1].image_url.url, image);
    // Gerçek dünya: ağ geçidi `temperature` kabul etmiyor. Gerekçede geçen
    // alan çıkarılıp aynı model ve aynı fotoğrafla tekrar denenir.
    let isiCalls = [], isiStatus = 400;
    const isi = load('lib/customProvider.ts', { '@capacitor/core': { CapacitorHttp: { request: async req => { isiCalls.push(req.data); if (isiStatus === 400 && !('temperature' in req.data)) isiStatus = 200; return isiStatus === 200 ? { status: 200, data: { choices: [{ message: { content: 'Isısız yanıt' } }] } } : { status: 400, data: { error: { message: "Unsupported parameter: 'temperature' is not supported with this model." } } }; } } } });
    assert.equal(await isi.runCustomProviderDirect({ baseUrl: 'https://custom.example/v1', apiKey: 'test', model: 'gpt-5', instruction: 'İncele', text, image }), 'Isısız yanıt');
    assert.equal(isiCalls.length, 2, 'One targeted retry is enough');
    assert.equal(isiCalls[0].temperature, 0.1);
    assert.equal(isiCalls[1].temperature, undefined, 'The named parameter is dropped');
    assert.equal(isiCalls[1].max_tokens, isiCalls[0].max_tokens, 'Unrelated fields stay');
    assert.equal(isiCalls[1].messages[0].content[1].image_url.url, image, 'Photo survives the retry');
    assert.equal(isiCalls[1].model, 'gpt-5');

    // `max_tokens` istemeyen model: alan adı değiştirilir, atılmaz.
    let tokenCalls = [];
    const token = load('lib/customProvider.ts', { '@capacitor/core': { CapacitorHttp: { request: async req => { tokenCalls.push(req.data); return 'max_completion_tokens' in req.data ? { status: 200, data: { choices: [{ message: { content: 'Tamam' } }] } } : { status: 400, data: { error: { message: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead." } } }; } } } });
    assert.equal(await token.runCustomProviderDirect({ baseUrl: 'https://custom.example/v1', apiKey: '', model: 'o3', instruction: 'İncele', text }), 'Tamam');
    assert.ok(tokenCalls.length >= 2 && tokenCalls.at(-1).max_completion_tokens === tokenCalls[0].max_tokens, 'max_tokens is renamed, not discarded');

    // Gerekçe alan adı vermeyen sunucu: son çare en sade gövde, sonra durulur.
    let korCalls = [];
    const kor = load('lib/customProvider.ts', { '@capacitor/core': { CapacitorHttp: { request: async req => { korCalls.push(req.data); return { status: 400, data: 'Bad Request' }; } } } });
    await assert.rejects(() => kor.runCustomProviderDirect({ baseUrl: 'https://custom.example/v1', apiKey: 'gizli-anahtar', model: 'vision', instruction: 'İncele', text, image }), error => {
        assert.match(error.message, /HTTP 400/); assert.match(error.message, /Bad Request/);
        assert.ok(!error.message.includes('gizli-anahtar'), 'Hata metni anahtarı sızdırmaz');
        return true;
    });
    assert.ok(korCalls.length <= 1 + 3, 'Retries are capped');
    for (const govde of korCalls) { assert.equal(govde.messages[0].content[1].image_url.url, image, 'Retry never drops the photo'); assert.equal(govde.model, 'vision', 'Retry never switches model'); }
    assert.deepEqual(Object.keys(korCalls.at(-1)).sort(), ['messages', 'model'], 'Last resort is the minimal body');

    console.log('OK: Android direct custom provider sends the photo; 400 retried with the named field removed, capped, key never leaked');
    let personalCalls = 0, chunks = 0, localCalls = 0, provider = 'openai';
    const client = load('lib/kartAiCalistir.ts', {
        '@capacitor/core': { Capacitor: { isNativePlatform: () => false } },
        './aiProvider': { readActiveProvider: () => provider, readCustomUrl: () => '', readProviderKey: () => 'test', readProviderModel: () => 'vision', providerHazir: () => true },
        './customProvider': native, './localLlm': { runLocalInference: async () => { localCalls++; } },
        './aiChunks': { splitIntoChunks: () => { chunks++; return []; } }, './aiMode': { readAiMode: () => 'personal', aiPaylasimOnayi: () => true },
        './hostedAiClient': {}, './config': { getApiUrl: p => p }
    }, { fetch: async (url, init) => { personalCalls++; assert.equal(JSON.parse(init.body).image, image); return Response.json({ correctedText: 'Yanıt' }); } });
    assert.equal(await client.kartAiCalistir(text, 'Yanıtla', false, undefined, image), 'Yanıt');
    assert.equal(personalCalls, 1); assert.equal(chunks, 0);
    provider = 'local'; await assert.rejects(() => client.kartAiCalistir(text, 'Yanıtla', false, undefined, image), /fotoğraf okuyamıyor/); assert.equal(localCalls, 0);
    console.log('OK: Client preserves image; no chunked repeats or silent local drop');
})().catch(e => { console.error(e); process.exitCode = 1; });
