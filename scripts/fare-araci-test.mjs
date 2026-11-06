import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
const wait = ms => new Promise(r => setTimeout(r, ms));
const server = http.createServer((req, res) => {
    try {
        let path = resolve('out', '.' + decodeURIComponent(req.url.split('?')[0]));
        if (!path.startsWith(resolve('out') + '\\') && path !== resolve('out')) throw new Error('path');
        if (existsSync(path + '.html')) path += '.html'; else if (!extname(path)) path = join(path, 'index.html');
        const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
        res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); res.end(readFileSync(path));
    } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browserPath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert(browserPath);
const chrome = spawn(browserPath, ['--headless=new', '--remote-debugging-port=9447', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nb-fare-test-'))}`, '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws, cdp;
try {
    let target;
    for (let i = 0; i < 100; i++) { try { target = (await (await fetch('http://127.0.0.1:9447/json')).json()).find(t => t.type === 'page'); if (target) break; } catch {} await wait(200); }
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    const pending = new Map(); let seq = 0; const errors = [];
    ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
    cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
    const ev = async expression => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const until = async expression => { for (let i = 0; i < 120; i++) { if (await ev(expression)) return; await wait(150); } console.log('DOM', await ev(`document.body.innerText.slice(-2500)`), 'ERRORS', errors); throw new Error('Timeout: ' + expression); };
    const click = expression => ev(`(${expression}).click()`);
    const textButton = text => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)})`;
    const setField = async (label, value) => ev(`(() => {const label=[...document.querySelectorAll('label')].find(l=>l.firstChild.textContent.trim()===${JSON.stringify(label)});const e=label.querySelector('input,select');const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const saved = () => ev(`JSON.parse(localStorage.getItem('nb-remote-prefs-v1'))`);
    await cdp('Runtime.enable'); await cdp('Page.enable');
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
        if (!localStorage.getItem('fare-test-seeded')) {
            localStorage.setItem('nb-remote-prefs-v1',JSON.stringify({autoBaglan:false,connection:'wifi',cardUrl:'http://127.0.0.1:9',macros:[{id:'test-macro',name:'Kaydet makrosu',type:'sequence',value:'',calisma:'sayili',tekrar:2,steps:[{type:'shortcut',value:'CTRL+S'}]}]}));
            localStorage.setItem('fare-test-seeded','1');
            localStorage.setItem('nb-computer-section','1');localStorage.setItem('nb-editor-tool-tab','computer');
        }
        window.__fareRequests=[];const realFetch=window.fetch;
        window.fetch=(url,options)=>String(url).startsWith('http://127.0.0.1:9/')?(window.__fareRequests.push(String(url)),Promise.resolve(new Response(JSON.stringify({ok:true,sd:true}),{status:200}))):realFetch(url,options);
    ` });
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp('Page.navigate', { url: base + '/editor?deneme=hepsi' });
    await until(`!!document.querySelector('#studio-fare')`);
    await until(`!!window.__nbUzak`); await wait(600);
    await click(`document.querySelector('#studio-fare')`);
    await until(`!!document.querySelector('[aria-label="Fare dokunmatik yüzeyi"]')`);
    assert.equal(await ev(`document.querySelector('[data-fare-konum="alt"]').children.length`), 4);
    await click(textButton('Fare ayarları'));
    await until(`!!document.querySelector('[aria-label="Fare aracı ayarları"]')`);
    const before = await ev(`window.__fareRequests.length`);
    await click(`document.querySelector('[aria-label="Sol tık kaldır"]')`);
    assert.equal((await saved()).fareDugmeleri.length, 3);
    await click(textButton('Düğme ekle'));
    await setField('Düğme adı', 'Hızlı'); await setField('Konum', 'sagUst'); await setField('Yapacağı iş', 'hiz');
    await setField('Bu düğmenin ayarlayacağı hız', '2.5'); await click(textButton('Düğmeyi kaydet'));
    assert((await saved()).fareDugmeleri.some(d => d.ad === 'Hızlı' && d.konum === 'sagUst'));
    await click(textButton('Düğme ekle')); await setField('Düğme adı', 'Kaydet'); await setField('Konum', 'solAlt'); await setField('Yapacağı iş', 'makro'); await click(textButton('Düğmeyi kaydet'));
    await click(textButton('Düğme ekle')); await setField('Düğme adı', 'Yön yukarı'); await setField('Yapacağı iş', 'kisayol'); await setField('Tuş / kısayol', 'UP'); await click(textButton('Düğmeyi kaydet'));
    await click(`document.querySelector('[aria-label="Yön yukarı önceye taşı"]')`);
    assert.equal((await saved()).fareDugmeleri.filter(d => d.konum === 'alt').at(-2).ad, 'Yön yukarı');
    assert.equal(await ev(`window.__fareRequests.length`), before, 'Editing and preview must never send PC commands');
    await click(textButton('Ayarları kapat'));
    await click(textButton('Hızlı')); await until(`JSON.parse(localStorage.getItem('nb-remote-prefs-v1')).mouseSensitivity===2.5`);
    await click(textButton('Kaydet'));
    await until(`window.__fareRequests.filter(u=>u.includes('/api/rkey?code=22&mods=1')).length===2`);
    await until(`![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Yön yukarı').disabled`);
    await click(textButton('Yön yukarı'));
    await until(`window.__fareRequests.some(u=>u.includes('/api/rkey?code=82&mods=0'))`);
    for (const width of [320, 390, 768, 1440]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }); await wait(200);
        assert(await ev(`document.documentElement.scrollWidth<=innerWidth`), 'No horizontal overflow ' + width);
        assert(await ev(`[...document.querySelectorAll('[data-fare-konum] button')].every(b=>{const r=b.getBoundingClientRect();return r.width>=43&&r.height>=43})`), 'Touch targets ' + width);
    }
    await cdp('Page.reload'); await until(`!!document.querySelector('#studio-fare')`); await click(`document.querySelector('#studio-fare')`);
    await until(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hızlı')`);
    assert.equal((await saved()).mouseSensitivity, 2.5);
    assert.equal(await ev(`!!document.querySelector('[data-fare-konum="solAlt"] button')`), true);
    await click(textButton('Fare ayarları')); await click(textButton('Varsayılan düğmelere dön'));
    assert.equal((await saved()).fareDugmeleri.length, 4);
    for (const name of ['Sol tık', '↑ Kaydır', 'Sağ tık', '↓ Kaydır']) await click(`[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(name + ' kaldır')})`);
    assert.equal((await saved()).fareDugmeleri.length, 0);
    assert.deepEqual(errors, []);
    console.log('PASS: mouse settings add/remove, corner layout, macro/arrow commands, speed presets, safe preview, 320–1440px, reload persistence, reset/empty');
} finally { if (cdp) { try { await cdp('Browser.close'); } catch {} } ws?.close(); chrome.kill(); server.close(); }
