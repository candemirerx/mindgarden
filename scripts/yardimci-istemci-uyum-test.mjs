import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const remoteCode = compile('../lib/remoteTools.ts');
const fareExports = {};
vm.runInNewContext(compile('../lib/fareDuzeni.ts'), { exports: fareExports });

function client(isNative = true) {
    const calls = [], routes = new Map(), storage = new Map();
    const scanResults = new Map();
    const respond = options => {
        calls.push(options);
        if (!routes.has(options.url)) throw new Error('Unreachable fixture');
        const result = routes.get(options.url);
        return { status: result.status ?? 200, body: JSON.stringify(result.body ?? result) };
    };
    const native = {
        request: async options => respond(options),
        discover: async options => {
            calls.push({ scan: options });
            return scanResults.get(options.port) ?? { cards: [], bodies: [] };
        },
    };
    const exports = {};
    vm.runInNewContext(remoteCode, {
        exports, Error, URL, clearTimeout,
        setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 1)),
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
        fetch: async (url, options) => {
            const result = respond({ url, ...options });
            return { ok: result.status === 200, status: result.status, text: async () => result.body };
        },
        require: name => name === './fareDuzeni' ? fareExports : name === '@capacitor/core'
            ? { Capacitor: { isNativePlatform: () => isNative }, registerPlugin: () => native }
            : name === './degisim' ? { bildir: () => {} } : {},
    });
    return { api: exports, calls, routes, scanResults, storage };
}

for (const isNative of [true, false]) {
    for (const [app, port] of [['not-bahcesi-clipboard', 8765], ['cep-kopru-pc', 8775]]) {
        const { api, calls, routes } = client(isNative);
        const base = `http://192.168.1.20:${port}`;
        routes.set(base + '/hello', { app, name: app, pairApproval: true });
        const found = await api.bilgisayarAdresiniSina('192.168.1.20');
        assert.equal(found.url, base);
        assert.equal(found.name, app);
        assert.equal(calls.length, port === 8765 ? 1 : 2);

        routes.set(base + '/pair', { ok: true, token: 'fixture-key', name: app });
        const paired = await api.bilgisayarlaEslestirWifi('192.168.1.20', '123456');
        assert.equal(paired.helperUrl, base, 'PIN pairing must save the resolved port');
        assert.equal(paired.helperToken, 'fixture-key');
        assert.equal(calls.at(-1).url, base + '/pair');

        routes.set(base + '/pair-request', { ok: true, requestId: 'fixture-request' });
        routes.set(base + '/pair-status', { ok: true, state: 'approved', token: 'approved-fixture' });
        const approved = await api.bilgisayarlaEslestirWifi('192.168.1.20');
        assert.equal(approved.helperUrl, base, 'Approval pairing must save the resolved port');
        assert.equal(approved.helperToken, 'approved-fixture');
    }

    const { api, calls, routes } = client(isNative);
    routes.set('http://pc.local:8765/hello', { app: 'unrelated-service' });
    routes.set('http://pc.local:8775/hello', { app: 'cep-kopru-pc' });
    assert.equal((await api.bilgisayarAdresiniSina('pc.local')).url, 'http://pc.local:8775');
    calls.length = 0;
    await assert.rejects(api.bilgisayarAdresiniSina('http://pc.local:8765'), /uyumlu/);
    assert.equal(calls.length, 1, 'An explicit port must never fall through to another service');
    for (const base of ['http://pc.local:80', 'https://pc.local:443', 'http://pc.local:9999']) {
        calls.length = 0;
        await assert.rejects(api.bilgisayarAdresiniSina(base));
        assert.equal(calls.length, 1, 'Explicit standard and custom ports must be preserved');
    }
    await assert.rejects(api.bilgisayarAdresiniSina('ftp://pc.local'), /HTTP/);
    assert.equal((await api.bilgisayarAdresiniSina('http://pc.local:8775/ignored/path')).url, 'http://pc.local:8775');
    routes.set('https://[fd00::1]:8775/hello', { app: 'cep-kopru-pc' });
    assert.equal((await api.bilgisayarAdresiniSina('https://[fd00::1]')).url, 'https://[fd00::1]:8775');
    routes.set('http://pc.local:8775/pair-request', { ok: true, requestId: 'fixture-request' });
    routes.set('http://pc.local:8775/hello', { app: 'cep-kopru-pc', pairApproval: true });
    routes.set('http://pc.local:8775/pair-status', { ok: true, state: 'denied' });
    await assert.rejects(api.bilgisayarlaEslestirWifi('pc.local'), /izin verilmedi/);
}

const { api, calls, routes, scanResults, storage } = client();
const notBase = 'http://192.168.1.21:8765', cepBase = 'http://192.168.1.22:8775';
scanResults.set(8765, { cards: [notBase], bodies: [JSON.stringify({ name: 'Not PC' })] });
scanResults.set(8775, { cards: [cepBase], bodies: [JSON.stringify({ name: 'Cep PC' })] });
const found = await api.bilgisayarlariBul();
assert.deepEqual(Array.from(found, item => [item.url, item.name]), [[notBase, 'Not PC'], [cepBase, 'Cep PC']]);
assert.deepEqual(calls.map(item => item.scan.port), [8765, 8775]);

routes.set(notBase + '/health', { status: 401, body: { error: 'different computer' } });
routes.set(cepBase + '/health', { app: 'cep-kopru-pc' });
routes.set(cepBase + '/input', { ok: true });
const prefs = { connection: 'pc-wifi', helperUrl: 'http://192.168.1.99:8765', helperToken: 'fixture-key' };
await api.sendCommand('t:hello', prefs);
assert.equal(prefs.helperUrl, cepBase, 'A paired Cep Kopru helper must survive an IP change');
assert.equal(JSON.parse(storage.get('nb-remote-prefs-v1')).helperUrl, cepBase);
assert.equal(calls.at(-1).url, cepBase + '/input');
assert.equal(calls.at(-1).token, 'fixture-key', 'Discovery must authenticate before reusing a new address');
console.log('PASS: both native/browser helper identities, dual-port discovery, portless PIN/approval pairing, explicit ports, IPv6, approval denial and authenticated IP recovery (mock transport)');