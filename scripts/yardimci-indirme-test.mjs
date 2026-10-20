/** Gerçek indirme bileşeninin olay işleyicileri; cihaz yerine kayıt tutan taşıma taklitleri. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../components/ui/PcYardimcisiIndir.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const url = 'https://mindgarden-neon.vercel.app/pc';
function ortam(native = true, prefs = { connection: 'pc-wifi', helperBluetoothAddress: 'PC', cardUrl: 'http://kart' }) {
    let index = 0;
    const state = [], calls = [];
    const jsx = (type, props) => ({ type, props });
    const modules = {
        react: { useState(init) { const i = index++; if (!(i in state)) state[i] = init; return [state[i], v => { state[i] = typeof v === 'function' ? v(state[i]) : v; }]; } },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
        'lucide-react': {},
        '@/lib/config': { PC_YARDIMCISI_SAYFASI: url, PC_YARDIMCISI_ZIP: url + '.zip' },
        '@capacitor/share': { Share: { share: async v => { calls.push(['share', v]); } } },
        '@capacitor/browser': { Browser: { open: async v => { calls.push(['browser', v]); } } },
        '@/lib/remoteTools': {
            remotePrefs: () => prefs,
            baglantiTuru: p => p.connection,
            baglantiTuruSec: (p, t) => ({ ...p, connection: t === 'kart-ap' ? 'wifi' : t }),
            bluetoothKlavyeBagla: async a => { calls.push(['hid', a]); },
            bleDurumu: async () => ({ connected: false }),
            kayitliKartAdresi: () => 'KART',
            connectCard: async a => { calls.push(['ble', a]); },
            typeOnComputer: async (t, p) => { calls.push(['type', t, p.connection]); },
        },
    };
    const exports = {};
    const navigator = { clipboard: { writeText: async text => { calls.push(['copy', text]); } }, share: async v => { calls.push(['web-share', v]); } };
    vm.runInNewContext(code, { exports, require: name => { assert.ok(name in modules, name); return modules[name]; }, navigator });
    const render = () => { index = 0; return exports.default({ prefs }); };
    const nodes = n => n == null ? [] : Array.isArray(n) ? n.flatMap(nodes) : typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
    const find = id => nodes(render()).find(n => n.props?.id === id);
    return { calls, state, navigator, find, modules };
}

const a = ortam();
await a.find('yardimci-link-kopyala').props.onClick();
await new Promise(r => setImmediate(r));
assert.deepEqual(a.calls, [['copy', url]]);
await a.find('yardimci-bilgisayara-gonder').props.onClick();
await new Promise(r => setImmediate(r));
assert.equal(a.calls.at(-1)[0], 'share');
a.find('yardimci-link-yaz-ac').props.onClick();
assert.equal(a.find('yardimci-link-yolu').props.value, 'pc-bluetooth');
await a.find('yardimci-link-yaz').props.onClick();
await new Promise(r => setImmediate(r));
assert.deepEqual(a.calls.slice(-2), [['hid', 'PC'], ['type', url, 'pc-bluetooth']]);
assert.equal(a.state[1], '');
for (const [yol, expected] of [['bluetooth', 'bluetooth'], ['wifi', 'wifi'], ['kart-ap', 'wifi']]) {
    a.find('yardimci-link-yolu').props.onChange({ target: { value: yol } });
    await a.find('yardimci-link-yaz').props.onClick();
    await new Promise(r => setImmediate(r));
    assert.deepEqual(a.calls.at(-1), ['type', url, expected]);
}
assert.ok(a.calls.some(c => c[0] === 'ble'));
const before = a.calls.length;
a.find('yardimci-link-yolu').props.onChange({ target: { value: 'pc-wifi' } });
await a.find('yardimci-link-yaz').props.onClick();
await new Promise(r => setImmediate(r));
assert.equal(a.calls.length, before, 'PC yardımcısına düşmemeli');
assert.equal(a.state[0].hata, true);
const b = ortam(false);
b.find('yardimci-link-yaz-ac').props.onClick();
assert.equal(b.find('yardimci-link-yaz').props.disabled, true);
delete b.navigator.share;
await b.find('yardimci-bilgisayara-gonder').props.onClick();
await new Promise(r => setImmediate(r));
assert.deepEqual(b.calls, [['copy', url]]);
b.navigator.clipboard.writeText = async () => { throw new Error('denied'); };
await b.find('yardimci-link-kopyala').props.onClick();
await new Promise(r => setImmediate(r));
assert.equal(b.state[0].hata, true);
assert.match(b.state[0].metin, /Panoya erişilemedi/);
console.log('İndirme bileşeni: kopyala, paylaş, HID/BLE/kart Wi-Fi/AP yazma, PC-Wi-Fi engeli, web kısıtı ve hata geri bildirimi geçti. Gerçek cihaz testi değildir.');
