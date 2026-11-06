/* İzole testler: dış servise veya gerçek kullanıcı verisine erişmez. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
function load(file, mocks, globals = {}) {
    const module = { exports: {} };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
        { module, exports: module.exports, require: n => n in mocks ? mocks[n] : require(n), Buffer, AbortSignal, console, ...globals });
    return module.exports;
}
class AiError extends Error { constructor(status, message, retryAfter) { super(message); Object.assign(this, { status, retryAfter }); } }
let configured = true, result = 1, fail = false, calls = [];
const server = load('lib/server/aiReports.ts', {
    'server-only': {}, '../aiReports': load('lib/aiReports.ts', {}),
    './hostedAi': { AiError, identity: async () => 'hashed-network', hostedConfig: () => ({ redisUrl: configured ? 'https://redis.invalid' : '', redisToken: 'private-token', salt: 'x'.repeat(40) }) }
}, { fetch: async (url, init) => { calls.push(JSON.parse(init.body)); if (fail) throw new Error('private failure'); return Response.json({ result }); } });
const route = load('app/api/ai-report/route.ts', { 'next/server': { NextRequest, NextResponse }, '@/lib/server/hostedAi': { AiError }, '@/lib/server/aiReports': server }, { process: { env: { NODE_ENV: 'production' } } });
const valid = { response: 'Test yanıtı', reason: 'unsafe', details: 'test', source: 'chat', consent: true };
const req = (body, origin = 'https://mindgarden-neon.vercel.app', type = 'application/json') => new NextRequest('https://mindgarden-neon.vercel.app/api/ai-report', { method: 'POST', headers: { origin, 'content-type': type }, body: typeof body === 'string' ? body : JSON.stringify(body) });
(async () => {
    for (const bad of [{ consent: false }, { response: '' }, { response: 'x'.repeat(4001) }, { reason: 'fake' }, { details: 'x'.repeat(501) }, { source: 'fake' }, { source: ['chat'] }]) {
        assert.equal((await route.POST(req({ ...valid, ...bad }))).status, 400);
    }
    assert.equal(calls.length, 0);
    assert.equal((await route.POST(req(valid, 'https://evil.invalid'))).status, 403);
    assert.equal((await route.POST(req(valid, undefined, 'text/plain'))).status, 415);
    assert.equal((await route.POST(req('{'))).status, 400);
    assert.equal((await route.POST(req('[]'))).status, 400);
    assert.equal((await route.POST(req('x'.repeat(20001)))).status, 413);
    const res = await route.POST(req({ ...valid, clientApiKey: 'must-not-store', notes: 'private' }, 'https://localhost'));
    assert.equal(res.status, 201); assert.equal(res.headers.get('access-control-allow-origin'), 'https://localhost');
    const { id } = await res.json(); assert.match(id, /^[a-f0-9-]{36}$/);
    const command = calls.at(-1), record = JSON.parse(command[7]);
    assert.equal(record.id, id); assert.equal(record.response, valid.response);
    assert.equal(command[8], String(30 * 86400));
    assert.ok(!JSON.stringify(record).includes('must-not-store'));
    assert.ok(!JSON.stringify(record).includes('hashed-network'));
    result = 0; assert.equal((await route.POST(req(valid))).status, 429);
    fail = true; const failure = await route.POST(req(valid)); assert.equal(failure.status, 503); assert.ok(!(await failure.text()).includes('private'));
    configured = false; assert.equal((await route.POST(req(valid))).status, 503);
    let provider = 'gemini', accepted = false, prompts = 0;
    const store = new Map([['nb-ai-mode', 'hosted']]);
    const mode = load('lib/aiMode.ts', { './degisim': { bildir() {} }, './aiProvider': { readActiveProvider: () => provider, providerHazir: () => true } }, {
        localStorage: { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) }, window: { confirm: () => { prompts++; return accepted; } }
    });
    assert.equal(mode.aiChatPaylasimOnayi(), false); assert.equal(store.has('nb-ai-chat-consent-v1'), false);
    accepted = true; assert.equal(mode.aiChatPaylasimOnayi(), true); assert.equal(mode.aiChatPaylasimOnayi(), true); assert.equal(prompts, 2);
    store.set('nb-ai-mode', 'personal'); assert.equal(mode.aiChatPaylasimOnayi(), true); assert.equal(prompts, 3);
    provider = 'local'; assert.equal(mode.aiChatPaylasimOnayi(), true); assert.equal(prompts, 3);
    console.log('OK: bildirim doğrulama, CORS, boyut, kayıt/TTL, kota, hata gizleme ve sohbet paylaşım onayı');
})().catch(e => { console.error(e); process.exitCode = 1; });
