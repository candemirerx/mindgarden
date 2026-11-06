/** İzole Chrome profiliyle ana sayfa kısayolunun gerçek dokunma duman testi.
 * Önce npm run build:android; ardından node scripts/deneme-kisayolu-test.mjs.
 * Kullanıcının tarayıcısına, telefon verilerine veya gerçek notlarına dokunmaz.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, extname, join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import assert from 'node:assert/strict';

const root = resolve('out');
const server = createServer((req, res) => {
    try {
        const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
        if (!path.startsWith(root + '\\') && path !== root) { res.writeHead(403).end(); return; }
        const file = path === root ? join(root, 'index.html') : existsSync(path + '.html') ? path + '.html' : path;
        const types = { '.html': 'text/html', '.txt': 'text/plain', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
        res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
        res.end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'nb-deneme-test-'));
const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert(chromePath, 'Chrome/Edge gerekli');
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=9446', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws;
let cdp;
const errors = [];
try {
    let targets;
    for (let i = 0; i < 100; i++) {
        try { targets = await (await fetch('http://127.0.0.1:9446/json')).json(); if (targets.some(x => x.type === 'page')) break; } catch {}
        await wait(200);
    }
    ws = new WebSocket(targets.find(x => x.type === 'page').webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
    let seq = 0;
    const pending = new Map();
    ws.addEventListener('message', e => {
        const m = JSON.parse(e.data);
        if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p?.reject(new Error(JSON.stringify(m.error))) : p?.resolve(m.result); }
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ': ' + (m.params.exceptionDetails.exception?.description || ''));
    });
    cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => {
        const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };
    const until = async expression => {
        for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await wait(200); }
        throw new Error('Bekleme süresi aşıldı: ' + expression);
    };
    const rect = selector => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`);
    const touch = (type, point) => cdp('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
    const tap = async selector => { const p = await rect(selector); await touch('touchStart', p); await touch('touchEnd'); };
    const home = async () => { await cdp('Page.navigate', { url: base }); await until(`!!document.querySelector('[aria-label="Deneme ağacını metin editöründe aç"]')`); await until(`!!window.__nbUzak`); await wait(600); };
    const shortcut = '[aria-label="Deneme ağacını metin editöründe aç"]';
    await cdp('Runtime.enable'); await cdp('Page.enable');
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
    await home();
    for (const width of [320, 390, 768, 1440]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
        await wait(150);
        const layout = await evaluate(`(() => { const h = document.querySelector('h1').getBoundingClientRect(); const s = document.querySelector(${JSON.stringify(shortcut)}).getBoundingClientRect(); return { overflow: document.documentElement.scrollWidth > innerWidth, overlap: h.right > s.left, right: s.right, width: innerWidth }; })()`);
        assert(!layout.overflow && !layout.overlap && layout.right <= layout.width, `${width}px yerleşim: ${JSON.stringify(layout)}`);
        console.log(`PASS ${width}px: taşma ve başlık çakışması yok`);
    }
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await tap(shortcut);
    await until(`location.search === '?deneme=hepsi' && !!document.querySelector('textarea')`);
    console.log('PASS tek dokunuş: tüm araçlarla deneme editörü');
    await home();
    await evaluate(`document.querySelector(${JSON.stringify(shortcut)}).focus()`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
    await until(`document.activeElement?.dataset.denemeEylem === 'editor'`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert(await evaluate(`!document.querySelector('#deneme-menusu') && document.activeElement === document.querySelector(${JSON.stringify(shortcut)})`));
    console.log('PASS klavye: okla menü, Escape ile kapatma ve odağı geri verme');
    let held = await rect(shortcut);
    await touch('touchStart', held); await wait(450); await touch('touchEnd');
    assert(await evaluate(`!!document.querySelector('#deneme-menusu') && location.pathname === '/'`));
    console.log('PASS yerinde uzun basma: menü açık kalır, editöre atlamaz');
    await evaluate(`document.querySelector(${JSON.stringify(shortcut)}).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    let p = await rect(shortcut);
    await touch('touchStart', p); await wait(450);
    await until(`!!document.querySelector('#deneme-menusu')`);
    const target = await rect('[data-deneme-eylem="tuval"]');
    await touch('touchMove', target); await wait(120);
    assert(await evaluate(`document.querySelector('[data-deneme-eylem="tuval"]').className.includes('bg-moss-100')`), 'Kaydırma hedefi vurgulanmalı');
    const artifact = resolve('.codex/artifacts/deneme-uc-bolme.png');
    mkdirSync(resolve('.codex/artifacts'), { recursive: true });
    if (!process.env.NB_HISTORY_ONLY) {
        const shot = await cdp('Page.captureScreenshot', { format: 'png' });
        writeFileSync(artifact, Buffer.from(shot.data, 'base64'));
    }
    await touch('touchEnd');
    await until(`!!document.querySelector('#tuval-ayarlari')`);
    assert(await evaluate(`location.pathname === '/'`), 'Uzun basma sonrası hayalet tıklama editörü açmamalı');
    console.log('PASS basılı tut → kaydır → bırak: tuval ayarları; hayalet tıklama yok');
    await evaluate(`document.querySelector('#kart-arac-ekle-ustSol').click()`);
    await until(`!!document.querySelector('[data-arac="tuvalAyarlari:"]')`);
    await evaluate(`document.querySelector('[data-arac="tuvalAyarlari:"]').click()`);
    await until(`JSON.parse(localStorage.getItem('nb-tuval-v1')).dugmeler.ustSol === 'tuvalAyarlari'`);
    console.log('PASS tuval ayarlarını aç: kart aracına atanıp kaydediliyor');
    await evaluate(`document.querySelector('#genel-tuval-deneme').click()`);
    await until(`!!document.querySelector('#deneme-sol-arac-sec')`);
    await evaluate(`document.querySelector('[data-deneme-tasarim="renkli"]').click()`);
    await until(`document.querySelector('[data-deneme-kart]').dataset.denemeKart === 'renkli'`);
    await evaluate(`document.querySelector('#deneme-sol-arac-sec').click()`);
    await until(`!!document.querySelector('#kart-arac-sekme-bilgisayar')`);
    await evaluate(`document.querySelector('#kart-arac-sekme-bilgisayar').click()`);
    await until(`!!document.querySelector('[data-arac="pcKlavye:"]')`);
    await evaluate(`document.querySelector('[data-arac="pcKlavye:"]').click()`);
    await until(`!document.querySelector('#kart-arac-ekle')`);
    assert(await evaluate(`JSON.parse(localStorage.getItem('nb-deneme-gorunum-v1')).sol.islev === 'pcKlavye'`));
    console.log('PASS genel Ayarlar: deneme kartı ve sol bilgisayar aracı değiştirilebiliyor');
    if (!process.env.NB_HISTORY_ONLY) {
        const settingsShot = await cdp('Page.captureScreenshot', { format: 'png' });
        writeFileSync(resolve('.codex/artifacts/deneme-gorunum-ayarlari.png'), Buffer.from(settingsShot.data, 'base64'));
    }
    await home();
    p = await rect(shortcut);
    await touch('touchStart', p); await wait(450); await touch('touchCancel');
    assert(await evaluate(`!document.querySelector('#deneme-menusu') && location.pathname === '/'`));
    console.log('PASS iptal edilen dokunuş: menü kapanır, editöre gitmez');
    await tap('[aria-label="Telefon klavyesiyle yaz"]');
    await until(`!!document.querySelector('#pc-hizli-yaz')`);
    await evaluate(`document.querySelector('#pc-hizli-yaz [aria-label="Kapat"]').click()`);
    await until(`!document.querySelector('#pc-hizli-yaz')`);
    console.log('PASS sol bölme atanan bilgisayar klavyesini açıyor');
    await evaluate(`Object.defineProperty(navigator.clipboard, 'writeText', { configurable:true, value:async text => { window.__copied = text; } })`);
    await tap('[aria-label="Deneme ağacının içeriğini kopyala"]');
    await until(`typeof window.__copied === 'string' && window.__copied.includes('Türkçe karakter')`);
    assert(await evaluate(`location.pathname === '/'`));
    await tap(shortcut);
    await until(`location.search === '?deneme=hepsi' && !!document.querySelector('textarea')`);
    await evaluate(`document.querySelector('textarea').focus(); document.querySelector('textarea').select()`);
    await cdp('Input.insertText', { text: 'Deneme son metin: çğıöşü' });
    await until(`document.querySelector('textarea').value === 'Deneme son metin: çğıöşü'`);
    await wait(200);
    await evaluate(`history.back()`);
    await until(`!!document.querySelector(${JSON.stringify(shortcut)})`);
    await wait(600);
    await tap('[aria-label="Deneme ağacının içeriğini kopyala"]');
    await wait(200);
    await until(`window.__copied === 'Deneme son metin: çğıöşü'`);
    console.log('PASS sağ bölme son editör içeriğini kopyalıyor; gerçek sistem panosuna yazılmadı');
    await evaluate(`localStorage.setItem('nb-taslak-gercek-not-test', 'NORMAL_NOT_KORUNDU')`);
    await cdp('Page.reload'); await until(`!!document.querySelector(${JSON.stringify(shortcut)})`); await wait(600);
    await tap(shortcut); await until(`document.querySelector('textarea')?.value === 'Deneme son metin: çğıöşü'`);
    assert(await evaluate(`!document.querySelector('[aria-label="Deneme yazılarım"]') && !document.querySelector('#deneme-son-yazilar')`), 'No history UI or information banner');
    assert(await evaluate(`localStorage.getItem('nb-taslak-gercek-not-test') === 'NORMAL_NOT_KORUNDU'`));
    assert(await evaluate(`!Object.keys(localStorage).some(k=>k.startsWith('nb-deneme-gecmis'))`));
    console.log('PASS yalnız son metin korunur; geçmiş arayüzü/bilgi kutusu yok; normal not değişmedi');
    assert.deepEqual(errors, [], 'Yakalanmayan tarayıcı hatası');
    console.log('PASS tarayıcı istisnası yok; ekran görüntüsü: ' + artifact);
} finally {
    if (cdp) { try { await cdp('Browser.close'); } catch {} }
    ws?.close(); chrome.kill(); server.close();
}
