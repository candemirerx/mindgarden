import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
let requests = [], scanCount = 0, fail = false;
const native = {
  request: async o => {
    requests.push(o);
    if (fail) throw new Error('USB disconnected');
    const data = o.url.endsWith('/pair-request') ? { ok: true, requestId: 'test-id' }
      : o.url.endsWith('/pair-status') ? { ok: true, state: 'approved', token: 'fixture-usb', name: 'Fixture PC' }
      : o.url.endsWith('/health') ? { app: 'cep-kopru-pc' } : { ok: true };
    return { status: 200, body: JSON.stringify(data) };
  },
  scanComputers: async () => { scanCount++; return { devices: [] }; }
};
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/remoteTools.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, {
  exports, Error, URL, setTimeout: cb => setTimeout(cb, 0), clearTimeout,
  require: name => name === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => true }, registerPlugin: () => native } : {},
});
const lan = { connection: 'pc-wifi', helperUrl: 'http://192.168.1.3:8765', helperToken: 'fixture-lan', helperUrlTs: 'http://100.1.2.3:8765' };
let usb = exports.baglantiTuruSec(lan, 'usb');
assert.equal(exports.baglantiTuru(usb), 'usb');
assert.equal(usb.helperUrl, 'http://127.0.0.1:18775');
assert.equal(usb.helperToken, '', 'USB must not silently reuse network pairing');
usb = { ...usb, ...await exports.bilgisayarlaEslestirUsb() };
await exports.testHelper(usb);
const back = exports.baglantiTuruSec(usb, 'pc-wifi');
assert.equal(back.helperUrl, lan.helperUrl);
assert.equal(back.helperToken, lan.helperToken);
assert.equal(exports.baglantiTuruSec(back, 'usb').helperToken, 'fixture-usb');
const tsPrefs = exports.baglantiTuruSec(usb, 'tailscale');
assert.equal(tsPrefs.helperUrl, lan.helperUrlTs);
assert.equal(tsPrefs.helperToken, lan.helperToken);
for (const ara of ['bluetooth', 'wifi', 'kart-ap', 'pc-bluetooth']) {
  const kart = exports.baglantiTuruSec(usb, ara);
  assert.notEqual(kart.helperUrl, 'http://127.0.0.1:18775', `USB address must not leak into ${ara}`);
  const geri = exports.baglantiTuruSec(kart, 'pc-wifi');
  assert.equal(geri.helperUrl, lan.helperUrl, `pc-wifi after usb -> ${ara} restores LAN address`);
  assert.equal(geri.helperToken, lan.helperToken, `pc-wifi after usb -> ${ara} restores LAN token`);
  assert.equal(exports.baglantiTuruSec(geri, 'usb').helperToken, 'fixture-usb', `usb token survives usb -> ${ara} -> pc-wifi`);
}
requests = []; fail = true;
await assert.rejects(exports.sendToComputerClipboard('fixture', usb), /USB disconnected/);
assert.ok(requests.every(r => r.url.startsWith('http://127.0.0.1:18775/')));
assert.equal(scanCount, 0, 'Disconnected USB must never scan Wi-Fi');
console.log('PASS: USB approval, helper compatibility, separate pairing, route restoration, no wireless fallback');
