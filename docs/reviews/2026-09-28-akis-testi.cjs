#!/usr/bin/env node
/**
 * Not Bahcesi - uctan uca akis testi (bagimliliksiz, Chrome DevTools Protocol).
 *
 * Senaryo: bahce/agac olustur -> agaci ac -> editor'de yaz -> otomatik kaydet ->
 *          sayfayi yenile (kalicilik) -> tuval (canvas) gorunumu -> hizli cikista taslak.
 *
 * Kullanim:
 *   1) npx next start --port 3200
 *   2) node docs/reviews/2026-09-28-akis-testi.cjs
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const BASE = process.env.NB_BASE || 'http://localhost:3200';
const OUT = process.env.NB_OUT || path.join(__dirname, 'tarayici-cikti');
const DEBUG_PORT = Number(process.env.NB_PORT || 9334);
const DB_KEY = 'nb-local-db-v1';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function findChrome() {
    const candidates = [
        process.env.NB_CHROME,
        path.join(process.env['ProgramFiles'] || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['LOCALAPPDATA'] || '', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    ].filter(Boolean);
    const found = candidates.find(p => fs.existsSync(p));
    if (!found) throw new Error('Chrome/Edge bulunamadi');
    return found;
}

class Cdp {
    constructor(ws) {
        this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
        ws.addEventListener('message', ev => {
            let m; try { m = JSON.parse(ev.data); } catch { return; }
            if (m.id && this.pending.has(m.id)) {
                const { resolve, reject } = this.pending.get(m.id);
                this.pending.delete(m.id);
                m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
            } else if (m.method) for (const fn of this.listeners) fn(m);
        });
    }
    static async connect(url) {
        const ws = new WebSocket(url);
        await new Promise((res, rej) => {
            ws.addEventListener('open', res, { once: true });
            ws.addEventListener('error', () => rej(new Error('ws baglanti hatasi')), { once: true });
        });
        return new Cdp(ws);
    }
    send(method, params = {}, sessionId) {
        const id = ++this.id;
        this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('zaman asimi: ' + method)); } }, 60000);
        });
    }
    on(fn) { this.listeners.push(fn); }
    close() { try { this.ws.close(); } catch {} }
}

const steps = [];
const errors = [];
function check(name, pass, detail) {
    steps.push({ name, pass: !!pass, detail });
    process.stdout.write((pass ? '  [OK]   ' : '  [HATA] ') + name + (detail ? '  -> ' + JSON.stringify(detail).slice(0, 260) : '') + '\n');
}

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-chrome-akis-'));
    const chrome = spawn(findChrome(), [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--hide-scrollbars', '--mute-audio', '--user-data-dir=' + profile,
        '--remote-debugging-port=' + DEBUG_PORT, 'about:blank',
    ], { stdio: 'ignore' });

    let version = null;
    for (let i = 0; i < 40 && !version; i++) {
        await sleep(500);
        try { const r = await fetch('http://127.0.0.1:' + DEBUG_PORT + '/json/version'); if (r.ok) version = await r.json(); } catch {}
    }
    if (!version) { chrome.kill(); throw new Error('Chrome baslatilamadi'); }

    const cdp = await Cdp.connect(version.webSocketDebuggerUrl);
    const consoleLog = [];
    let step = 'baslangic';
    cdp.on(m => {
        if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
            consoleLog.push({ step, kind: 'console.' + m.params.type, text: (m.params.args || []).map(a => a.value || a.description).join(' ').slice(0, 300) });
        }
        if (m.method === 'Runtime.exceptionThrown') {
            const d = m.params.exceptionDetails;
            consoleLog.push({ step, kind: 'exception', text: String((d.exception && d.exception.description) || d.text).slice(0, 400) });
        }
        if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
            consoleLog.push({ step, kind: 'log.error', text: (m.params.entry.text + ' ' + (m.params.entry.url || '')).slice(0, 300) });
        }
    });

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => cdp.send(m, p, sessionId);
    await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');
    await S('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    const ev = async (expr, awaitPromise = false) => {
        const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
        if (r.exceptionDetails) return { __error: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 300) };
        return r.result.value;
    };
    const shot = async name => {
        try {
            const { data } = await S('Page.captureScreenshot', { format: 'png' });
            const f = path.join(OUT, name + '.png');
            fs.writeFileSync(f, Buffer.from(data, 'base64'));
            return f;
        } catch (e) { return 'HATA: ' + e.message; }
    };
    const goto = async (url, waitMs = 2500) => {
        await S('Page.navigate', { url });
        await sleep(waitMs);
        for (let i = 0; i < 12; i++) {
            if (await ev('document.readyState === "complete"') === true) break;
            await sleep(600);
        }
        await sleep(1500);
    };
    // Once tam eslesme, sonra "icerir" aramasi. Kapsam verilirse yalnizca o kok icinde arar.
    const clickText = async (text, scope) => ev(`(() => {
        const root = ${scope ? `document.querySelector(${JSON.stringify(scope)})` : 'document'};
        if (!root) return { __error: 'kapsam bulunamadi: ' + ${JSON.stringify(scope || '')} };
        const els = [...root.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="menuitem"]')];
        const vis = e => e.offsetParent !== null && !e.disabled;
        const norm = e => (e.innerText || '').trim().toLowerCase();
        const t = ${JSON.stringify(text.toLowerCase())};
        const el = els.find(e => vis(e) && norm(e) === t) || els.find(e => vis(e) && norm(e).startsWith(t)) || els.find(e => vis(e) && norm(e).includes(t));
        if (!el) return null;
        el.click();
        return { tag: el.tagName, text: (el.innerText || '').trim().slice(0, 50) };
    })()`);
    const typeInto = async (selector, text) => {
        const ok = await ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); el.select && el.select(); return true; })()`);
        if (!ok) return false;
        await S('Input.insertText', { text });
        return true;
    };
    const db = () => ev(`(() => { try { return JSON.parse(localStorage.getItem(${JSON.stringify(DB_KEY)}) || 'null'); } catch (e) { return { __parseError: String(e) }; } })()`);
    // Metni silmeden sona ekler; kalicilik testinde mevcut icerigi ezmemek icin.
    const appendInto = async (selector, text) => {
        const ok = await ev(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return false;
            el.focus();
            const len = (el.value || '').length;
            try { el.setSelectionRange(len, len); } catch {}
            return true;
        })()`);
        if (!ok) return false;
        await S('Input.insertText', { text });
        return true;
    };
    const waitFor = async (predicateExpr, label, timeoutMs = 12000) => {
        const t0 = Date.now();
        while (Date.now() - t0 < timeoutMs) {
            const v = await ev(predicateExpr);
            if (v === true) { check(label, true); return true; }
            await sleep(500);
        }
        check(label, false, 'zaman asimi');
        return false;
    };

    process.stdout.write('== AKIS TESTI (mobil 390x844) ==\n');

    // 0) TUZAK: oturum ve bahce yokken /projeler uzerinden agac ekleme denemesi
    step = '0-bahcesiz-agac-ekleme';
    await goto(BASE + '/projeler');
    check('Oturum yokken /projeler acildi', (await ev('location.pathname')) === '/projeler');
    check('Bos durumda "Ilk Agaci Dik" cagrisi gorunuyor', !!(await ev('!![...document.querySelectorAll("button")].find(b => (b.innerText||"").includes("İlk Ağacı Dik"))')));
    await shot('akis-01-bahcesiz-liste');
    const clicked = await clickText('İlk Ağacı Dik');
    check('"Ilk Agaci Dik" tiklandi', !!clicked, clicked);
    const promptOpen = await waitFor('!!document.querySelector("[role=\\"dialog\\"] input")', 'Ad sorma penceresi acildi');
    if (promptOpen) {
        await shot('akis-02-bahcesiz-pencere');
        await typeInto('[role="dialog"] input', 'Yetim Düğüm');
        await clickText('Tamam', '[role="dialog"]');
        await sleep(2500);
        const tuzak = await ev('(() => { const d = JSON.parse(localStorage.getItem("nb-local-db-v1")||"{}"); const body = document.body.innerText; const uyari = ["hata","Hata","başarısız","olmadı","gerekli","önce"].some(k => body.includes(k)); return { gardens: (d.gardens||[]).length, nodes: (d.nodes||[]).length, nodeGardenIds: (d.nodes||[]).map(n => n.garden_id), uyariMetniVar: uyari, gorunurDugum: body.includes("Yetim") }; })()');
        check('Bahcesiz agac ekleme denemesi sessizce basarisiz mi? (beklenen: uyari veya otomatik bahce)', tuzak.uyariMetniVar || tuzak.gardens > 0, tuzak);
        await shot('akis-03-bahcesiz-sonuc');
    }

    // 1) Yerel oturum ac
    step = '1-yerel-oturum';
    await goto(BASE + '/');
    const guest = await clickText('Yerel Modda Gir');
    check('"Yerel Modda Gir" butonu bulundu', !!guest, guest);
    await waitFor('!!localStorage.getItem("nb-local-session-v1")', 'Yerel oturum olustu');
    await waitFor('!![...document.querySelectorAll("button")].find(b => (b.innerText||"").includes("İlk Bahçemi Oluştur"))', 'Bos bahce ekrani geldi');

    // 2) Bahce olustur
    step = '2-bahce-olustur';
    await clickText('İlk Bahçemi Oluştur');
    const dialogOpen = await waitFor('!!document.querySelector("#garden-name")', 'Bahce olusturma penceresi acildi');
    if (dialogOpen) {
        await shot('akis-04-bahce-penceresi');
        const typed = await typeInto('#garden-name', 'Test Bahçesi');
        check('Bahce adi yazildi', typed);
        await clickText('Oluştur', '[role="dialog"]');
        await waitFor('!document.querySelector("#garden-name")', 'Pencere kapandi');
        await sleep(1500);
        const data = await db();
        const gardens = (data && data.gardens) || [];
        check('Bahce veriye yazildi (nb-local-db-v1)', gardens.length === 1, { adet: gardens.length, ad: gardens[0] && gardens[0].name, user_id: gardens[0] && gardens[0].user_id });
    }

    // 3) Bahceden agac ekle
    step = '3-agac-ekle';
    const dataAfter = await db();
    const garden = (dataAfter && dataAfter.gardens && dataAfter.gardens[0]) || null;
    if (!garden) throw new Error('Bahce olusturulamadi, akis testi surdurulemiyor');
    await goto(BASE + '/projeler?id=' + garden.id, 2500);
    const addRoot = await clickText('İlk Ağacı Dik');
    check('Bahce icinde "Ilk Agaci Dik" tiklandi', !!addRoot, addRoot);
    await waitFor('!!document.querySelector("[role=\\"dialog\\"] input")', 'Agac adi penceresi acildi', 8000);
    await typeInto('[role="dialog"] input', 'Kök Düğüm');
    await clickText('Tamam', '[role="dialog"]');
    await sleep(2500);
    const nodes = await ev('(() => { const d = JSON.parse(localStorage.getItem("nb-local-db-v1")||"{}"); return (d.nodes||[]).filter(n => !n.deleted_at).length; })()');
    check('Agac (dugum) olusturuldu', nodes >= 1, { dugum: nodes });
    check('Dugum ekranda listelendi', (await ev('document.body.innerText.includes("Kök Düğüm")')));
    await shot('akis-05-agac-listesi');

    // 4) Editor'e gir, yaz ve otomatik kaydet
    step = '4-yaz-ve-kaydet';
    await clickText('Kök Düğüm');
    await sleep(3000);
    let url = await ev('location.pathname + location.search');
    if (!String(url).startsWith('/editor')) {
        const nodeId = await ev('(() => { const d = JSON.parse(localStorage.getItem("nb-local-db-v1")||"{}"); const n = (d.nodes||[]).filter(x => !x.deleted_at)[0]; return n ? n.id : null; })()');
        await goto(BASE + '/editor?id=' + garden.id + '&nodeId=' + nodeId, 3000);
        url = await ev('location.pathname + location.search');
    }
    check('Editor sayfasina girildi', typeof url === 'string' && url.startsWith('/editor'), url);
    await shot('akis-06-editor-bos');
    const titleOk = await typeInto('input[placeholder="Başlık"]', 'Deneme Notu');
    const bodyOk = await typeInto('textarea', 'Bu bir akis testi icerigidir. Ikinci satir.');
    check('Baslik ve icerik alanlarina yazildi', titleOk && bodyOk, { titleOk, bodyOk });
    await sleep(3500); // otomatik kaydetme 1,5 sn
    const saved = await ev('(() => { const d = JSON.parse(localStorage.getItem("nb-local-db-v1")||"{}"); const n = (d.nodes||[])[0]||{}; return { content: n.content, updated: n.updated_at || null }; })()');
    check('Icerik otomatik kaydedildi', typeof saved.content === 'string' && saved.content.includes('akis testi icerigi'), { ilk60: String(saved.content).slice(0, 60) });
    await shot('akis-04-editor-dolu');

    // 5) Sayfayi yenile -> kalicilik
    step = '5-yenile-kalicilik';
    const urlNow = await ev('location.pathname + location.search');
    const titleSel = JSON.stringify('input[placeholder="Başlık"]');
    const readEditor = '(() => { const t = document.querySelector(' + titleSel + '); const b = document.querySelector("textarea"); return { title: t ? t.value : null, body: b ? b.value : null }; })()';
    const beforeReload = await ev(readEditor);
    check('Yenileme oncesi editor icerigi okunabildi', !!(beforeReload && typeof beforeReload.body === 'string' && beforeReload.body.includes('akis testi icerigi')), { body: String(beforeReload && beforeReload.body).slice(0, 50) });
    await goto(BASE + urlNow);
    const afterReload = await ev(readEditor);
    check('Yenileme sonrasi baslik geri yuklendi', !!(afterReload && afterReload.title === 'Deneme Notu'), afterReload && afterReload.title);
    check('Yenileme sonrasi icerik geri yuklendi', !!(afterReload && typeof afterReload.body === 'string' && afterReload.body.includes('akis testi icerigi')), { body: String(afterReload && afterReload.body).slice(0, 60) });
    const dbAfterReload = await ev('(() => { const d = JSON.parse(localStorage.getItem("nb-local-db-v1")||"{}"); const n = (d.nodes||[]).filter(x => !x.deleted_at)[0]||{}; return String(n.content||""); })()');
    check('Yenileme sonrasi yerel veri bozulmadi', typeof dbAfterReload === 'string' && dbAfterReload.includes('akis testi icerigi'), String(dbAfterReload).slice(0, 60));

    // 6) Hizli cikis (kaydetmeden once sayfadan ayrilma)
    step = '6-hizli-cikis';
    await appendInto('textarea', ' HIZLI-CIKIS-EKI');
    const fastUrl = await ev('location.pathname + location.search');
    await sleep(200); // otomatik kaydetme suresi (1,5 sn) dolmadan ayril
    await S('Page.navigate', { url: BASE + '/projeler' });
    await sleep(2500);
    await goto(BASE + fastUrl, 2000);
    const afterFast = await ev('(() => { const b = document.querySelector("textarea"); return b ? b.value : null; })()');
    check('Hizli cikistan sonra eklenen metin korundu', typeof afterFast === 'string' && afterFast.includes('HIZLI-CIKIS-EKI'), String(afterFast || '').slice(-60));
    check('Hizli cikis eski icerigi silmedi', typeof afterFast === 'string' && afterFast.includes('akis testi icerigi'), String(afterFast || '').slice(0, 50));

    // 7) Canvas / bahce gorunumu
    step = '7-canvas';
    if (garden) {
        await goto(BASE + '/bahce_view?id=' + garden.id, 3000);
        const canvas = await ev('(() => { const t = document.body.innerText; return { hasEmptyText: t.includes("Bahçe bulunamadı"), textLen: t.length, reactFlow: !!document.querySelector(".react-flow"), svg: document.querySelectorAll("svg").length }; })()');
        check('Canvas gorunumu dugumu cizdi (bos durum degil)', canvas && canvas.hasEmptyText === false, canvas);
        await sleep(1500);
        await shot('akis-05-canvas');
    }

    // 8) Coklu sekme: ayni anda iki sekme yazarsa
    step = '8-coklu-sekme';
    const { targetId: t2 } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId: s2 } = await cdp.send('Target.attachToTarget', { targetId: t2, flatten: true });
    const S2 = (m, p) => cdp.send(m, p, s2);
    await S2('Page.enable'); await S2('Runtime.enable');
    await S2('Page.navigate', { url: BASE + '/projeler' });
    await sleep(3000);
    const tab2 = await S2('Runtime.evaluate', { expression: '({ lists: (JSON.parse(localStorage.getItem("nb-local-db-v1")||"{}").gardens||[]).map(g => g.name) })', returnByValue: true });
    check('Ikinci sekme ayni veriyi gordu', JSON.stringify((tab2.result.value || {}).lists) === JSON.stringify(['Test Bahçesi']), tab2.result.value);

    const report = { base: BASE, steps, consoleMessages: consoleLog, passed: steps.filter(s => s.pass).length, failed: steps.filter(s => !s.pass).length };
    fs.writeFileSync(path.join(OUT, 'akis-rapor.json'), JSON.stringify(report, null, 2), 'utf8');
    process.stdout.write('\nSONUC: ' + report.passed + ' gecti, ' + report.failed + ' basarisiz. Konsol hata/uyari: ' + consoleLog.length + '\n');
    if (consoleLog.length) process.stdout.write(JSON.stringify(consoleLog.slice(0, 15), null, 1) + '\n');

    cdp.close(); chrome.kill(); await sleep(400);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    process.exit(report.failed ? 1 : 0);
}

main().catch(e => { console.error('TEST HATASI:', e); process.exit(2); });
