import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const calls = [];
let ip = '192.168.1.10';
const responses = new Map();
const native = {
    wifiAddress: async () => ({ address: ip }),
    request: async options => {
        calls.push(['request', options]);
        const body = responses.get(options.url);
        if (!body) throw new Error('Unreachable');
        return { status: 200, body: JSON.stringify(body) };
    },
    discover: async () => { calls.push(['discover']); return { cards: ['http://192.168.1.22'] }; },
    udpSend: async options => { calls.push(['udp', options]); },
};
const exports = {}, fareExports = {};
vm.runInNewContext(compile('../lib/fareDuzeni.ts'), { exports: fareExports });
vm.runInNewContext(compile('../lib/remoteTools.ts'), {
    exports, Error, URL, setTimeout, clearTimeout,
    require: name => name === './fareDuzeni' ? fareExports : name === '@capacitor/core'
        ? { Capacitor: { isNativePlatform: () => true }, registerPlugin: () => native } : {},
});
const prefs = { connection: 'wifi', cardUrl: 'http://192.168.1.20', cardUrlEv: 'http://192.168.1.21' };
const card = { ok: true, fw: '2.53.23', sd: {}, udp: 0 };
responses.set(prefs.cardUrlEv + '/api/status', card);
assert.deepEqual(Array.from((await exports.kartiWifidaBul(prefs)).urls), [prefs.cardUrlEv]);
assert.equal(calls.some(c => c[0] === 'discover'), false, 'Saved card should avoid subnet scan');
assert.equal(calls[0][1].cardLocal, true, 'Common LAN card HTTP must use card network routing');

calls.length = 0;
responses.clear();
responses.set(prefs.cardUrlEv + '/api/status', { ok: true, mode: 'unrelated server' });
responses.set(prefs.cardUrl + '/api/status', card);
assert.deepEqual(Array.from((await exports.kartiWifidaBul(prefs)).urls), [prefs.cardUrl]);
assert.equal(calls.filter(c => c[0] === 'request').length, 2, 'Invalid status must not win discovery');

calls.length = 0;
responses.clear();
assert.deepEqual(Array.from((await exports.kartiWifidaBul(prefs)).urls), ['http://192.168.1.22']);
assert.equal(calls.at(-1)[0], 'discover', 'Stale saved addresses must fall back to scan');

calls.length = 0;
ip = '192.168.4.2';
responses.set('http://192.168.4.1/api/status', card);
const ap = await exports.kartiWifidaBul(prefs);
assert.equal(ap.kartAgi, true);
assert.deepEqual(Array.from(ap.urls), ['http://192.168.4.1']);
assert.equal(calls.length, 1, 'AP must be verified rather than assumed present');

calls.length = 0;
responses.clear();
await exports.kartiWifidaBul(prefs);
assert.equal(calls.at(-1)[0], 'discover', 'Missing AP must not be reported as a found card');

calls.length = 0;
responses.set('http://100.100.1.2:8765/health', { app: 'cep-kopru-pc' });
responses.set('http://100.100.1.2:8765/input', { ok: true });
await exports.testHelper({ connection: 'pc-wifi', agTuru: 'tailscale', helperUrl: 'http://100.100.1.2:8765', helperToken: 'test' });
assert.equal(calls[0][1].cardLocal, false, 'Tailscale/PC requests must keep normal routing');
assert.ok(calls.every(c => c[1].cardLocal === false));
console.log('PASS: saved IP priority, card validation, stale IP fallback, AP verification, card-local routing, Tailscale isolation (mock transport)');
