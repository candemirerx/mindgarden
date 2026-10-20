import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const calls = [], storage = new Map();
let connected = false, failure = 'chunk', failed = false;
const native = {
  bleStatus: async () => ({ connected, address: 'CARD' }),
  connect: async options => { calls.push(['connect', options.address]); await new Promise(r => setTimeout(r, 10)); connected = true; },
  request: async options => {
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push(['http', body]);
    if (failure === 'chunk' && body?.action === 'parca2' && !failed) { failed = true; throw new Error('unexpected end of stream'); }
    if (failure === 'final' && body?.action === 'dosyalar') throw new Error('lost final ACK');
    return { status: 200, body: '{"ok":true}' };
  },
  sendClassic: async options => { calls.push(['classic', JSON.parse(options.body)]); return { ok: true }; },
};
class Reader {
  readAsDataURL(blob) { blob.arrayBuffer().then(b => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(b).toString('base64'); this.onload(); }); }
}
const exports = {};
vm.runInNewContext(compile('../lib/remoteTools.ts'), {
  exports, Error, Blob, FileReader: Reader, setTimeout, clearTimeout, URL,
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) },
  require: name => name === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => true }, registerPlugin: () => native } : {},
});
await Promise.all([exports.connectCard('CARD'), exports.connectCard('CARD'), exports.connectCard('CARD')]);
await exports.connectCard('CARD');
assert.equal(calls.filter(c => c[0] === 'connect').length, 1, 'Parallel probes must not reset GATT');
assert.equal(exports.kartAdiEslesir('Kablolu Klavye 2-2010'), true);
assert.equal(exports.kartAdiEslesir('headphones'), false);
const prefs = { connection: 'wifi', cardUrl: 'http://192.168.4.1' };
await exports.dosyalariBilgisayaraGonder([{ ad: 'fixture.bin', veri: new Blob([new Uint8Array(24000)]), tur: 'dosya' }], 'dosya', prefs);
const chunks = calls.filter(c => c[1]?.action === 'parca2').map(c => c[1]);
assert.deepEqual(chunks[0], chunks[1], 'Lost chunk ACK must retry exactly the same chunk');
assert.ok(chunks.every(c => c.veri.length <= 20000));
assert.equal(calls.filter(c => c[1]?.action === 'dosyalar').length, 1);
calls.length = 0; failure = 'final';
await assert.rejects(exports.dosyalariBilgisayaraGonder([{ ad: 'empty.txt', veri: new Blob([]), tur: 'dosya' }], 'dosya', { ...prefs, helperToken: 'fixture', helperBluetoothAddress: 'PC' }), /lost final ACK/);
assert.equal(calls.filter(c => c[1]?.action === 'dosyalar').length, 1);
assert.equal(calls.filter(c => c[0] === 'classic').length, 0, 'Unknown final outcome must not replay on Bluetooth');
const pending = new Map(), notifications = [];
const statusExports = {};
const remote = {
  kayitliKartAdresi: () => 'CARD',
  testCard: p => new Promise(resolve => pending.set(p.cardUrl, resolve)),
};
vm.runInNewContext(compile('../lib/baglantiDurumu.ts'), {
  exports: statusExports, setTimeout, clearTimeout,
  require: name => name === './remoteTools' ? remote : name === './degisim' ? { bildir: v => notifications.push(v) } : {},
});
const first = statusExports.durumuTazele({ connection: 'wifi', cardUrl: 'http://old' });
const second = statusExports.durumuTazele({ connection: 'wifi', cardUrl: 'http://new' });
assert.notEqual(first, second, 'Different endpoints must not share a pending probe');
pending.get('http://new')({}); await second;
pending.get('http://old')({}); await first;
assert.ok(statusExports.sonBaglantiDurumu().mesaj.includes('new'));
assert.equal(notifications.length, 1, 'Old endpoint result must not overwrite current status');
console.log('PASS: single-flight BLE, card name, USB chunk retry, final ACK safety, endpoint race (mock transport)');
