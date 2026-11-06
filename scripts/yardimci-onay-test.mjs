import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
let calls = [], app = 'cep-kopru-pc', approval = true, states = [], now = 0;
let start = { ok: true, requestId: 'fixture-request' };
const native = {
    request: async options => {
        calls.push(options);
        const path = new URL(options.url).pathname;
        const response = path === '/hello' ? { app, pairApproval: approval, name: 'Fixture PC' }
            : path === '/pair-request' ? start
            : path === '/pair-status' ? (states.shift() || { ok: true, state: 'pending' })
            : path === '/pair' ? { ok: true, token: 'legacy-token' } : { ok: true };
        return { status: 200, body: JSON.stringify(response) };
    },
};
const exports = {}, fareExports = {};
vm.runInNewContext(compile('../lib/fareDuzeni.ts'), { exports: fareExports });
vm.runInNewContext(compile('../lib/remoteTools.ts'), {
    exports, Error, URL, Date: class extends Date { static now() { return now; } },
    setTimeout: (cb, ms) => { now += ms; cb(); }, clearTimeout: () => {},
    require: name => name === './fareDuzeni' ? fareExports : name === '@capacitor/core'
        ? { Capacitor: { isNativePlatform: () => true }, registerPlugin: () => native } : {},
});
for (const helperApp of ['cep-kopru-pc', 'not-bahcesi-clipboard']) {
    app = helperApp;
    for (const url of ['http://192.168.1.20:8765', 'http://100.101.102.103:8765', 'http://pc.tailnet.ts.net:8765']) {
        calls = [];
        assert.equal((await exports.bilgisayarAdresiniSina(url)).url, url);
        states = [{ ok: true, state: 'pending' }, { ok: true, state: 'approved', token: 'approved-token', name: 'Fixture PC' }];
        const result = await exports.bilgisayarlaEslestirWifi(url);
        assert.equal(result.helperToken, 'approved-token');
        assert.equal(result.helperUrl, url);
        assert.equal(calls.filter(c => c.url.endsWith('/pair-status')).length, 2);
        assert.ok(calls.every(c => c.url.startsWith(url + '/') && !c.token && !c.cardLocal));
        assert.ok(calls.every(c => !c.url.endsWith('/pair')), 'No silent PIN fallback');
        assert.equal(JSON.parse(calls.find(c => c.url.endsWith('/pair-status')).body).requestId, 'fixture-request');
    }
}
for (const [state, error] of [['denied', /izin verilmedi/], ['expired', /süresi doldu/], ['unknown', /geçersiz/], ['approved', /geçersiz/]]) {
    states = [{ ok: true, state }];
    await assert.rejects(exports.bilgisayarlaEslestirWifi('http://192.168.1.20:8765'), error);
}
states = [{ ok: false, state: 'approved', token: 'must-not-save', error: 'rejected' }];
await assert.rejects(exports.bilgisayarlaEslestirWifi('http://192.168.1.20:8765'), /rejected/);
states = [];
await assert.rejects(exports.bilgisayarlaEslestirWifi('http://192.168.1.20:8765'), /zaman aşımına/);
start = { ok: false, error: 'busy' };
await assert.rejects(exports.bilgisayarlaEslestirWifi('http://192.168.1.20:8765'), /busy/);
start = { ok: true, requestId: 'fixture-request' };
approval = false; calls = [];
await assert.rejects(exports.bilgisayarlaEslestirWifi('http://192.168.1.20:8765'), /gelişmiş bölümde kodla/);
assert.ok(calls.every(c => !c.url.endsWith('/pair-request') && !c.url.endsWith('/pair')));
const legacy = await exports.bilgisayarlaEslestirWifi('http://192.168.1.20:8765', '123 456');
assert.equal(legacy.helperToken, 'legacy-token');
assert.equal(JSON.parse(calls.at(-1).body).pin, '123456');
app = 'unrelated-server';
await assert.rejects(exports.bilgisayarAdresiniSina('192.168.1.20'), /uyumlu/);
await assert.rejects(exports.bilgisayarlaEslestirWifi('http://192.168.1.20:8765'), /uyumlu/);
console.log('PASS: both helper identities, LAN/Tailscale approval, pending/approve/deny/expire/timeout, malformed response, busy, explicit legacy PIN (mock transport)');
