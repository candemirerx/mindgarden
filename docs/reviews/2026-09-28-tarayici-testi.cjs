#!/usr/bin/env node
/**
 * Not Bahcesi - tarayici testi (bagimliliksiz, Chrome DevTools Protocol ile).
 *
 * Ne yapar:
 *  - Uretim derlemesini (next start) headless Chrome ile acar.
 *  - Her sayfa icin konsol hatalarini, sayfa istisnalarini ve basarisiz istekleri toplar.
 *  - Sayfa icinde erisilebilirlik + kontrast + dokunma hedefi denetimi yapar.
 *  - Mobil (390x844) ve masaustu (1440x900) ekran goruntuleri kaydeder.
 *
 * Kullanim:
 *   1) Uretim sunucusunu baslat:  npx next start --port 3200
 *   2) Calistir:                  node docs/reviews/2026-09-28-tarayici-testi.cjs
 *
 * Ortam degiskenleri: NB_BASE (varsayilan http://localhost:3200), NB_OUT (cikti klasoru),
 *                     NB_CHROME (chrome.exe yolu), NB_HEADFUL=1 (tarayiciyi gorunur ac).
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const BASE = process.env.NB_BASE || 'http://localhost:3200';
const OUT = process.env.NB_OUT || path.join(__dirname, 'tarayici-cikti');
const DEBUG_PORT = Number(process.env.NB_PORT || 9333);
const HEADFUL = process.env.NB_HEADFUL === '1';

function findChrome() {
    if (process.env.NB_CHROME && fs.existsSync(process.env.NB_CHROME)) return process.env.NB_CHROME;
    const candidates = [
        path.join(process.env['ProgramFiles'] || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['LOCALAPPDATA'] || '', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles'] || 'C:/Program Files', 'Microsoft/Edge/Application/msedge.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    ];
    const found = candidates.find(p => p && fs.existsSync(p));
    if (!found) throw new Error('Chrome/Edge bulunamadi. NB_CHROME degiskeniyle yol verin.');
    return found;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Cok kucuk CDP istemcisi (Node 22'nin yerlesik WebSocket'i ile). */
class Cdp {
    constructor(ws) {
        this.ws = ws;
        this.id = 0;
        this.pending = new Map();
        this.listeners = [];
        ws.addEventListener('message', ev => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            if (msg.id && this.pending.has(msg.id)) {
                const { resolve, reject } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
            } else if (msg.method) {
                for (const fn of this.listeners) fn(msg);
            }
        });
    }
    static async connect(url) {
        const ws = new WebSocket(url);
        await new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve, { once: true });
            ws.addEventListener('error', () => reject(new Error('WebSocket baglanti hatasi: ' + url)), { once: true });
        });
        return new Cdp(ws);
    }
    send(method, params = {}, sessionId) {
        const id = ++this.id;
        const payload = { id, method, params };
        if (sessionId) payload.sessionId = sessionId;
        this.ws.send(JSON.stringify(payload));
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            setTimeout(() => {
                if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP zaman asimi: ' + method)); }
            }, 60000);
        });
    }
    on(fn) { this.listeners.push(fn); }
    close() { try { this.ws.close(); } catch {} }
}

/** Sayfa icinde calisan denetim betigi. */
const AUDIT_FN = `(() => {
  const report = {
    url: location.href,
    title: document.title,
    lang: document.documentElement.lang || null,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    viewportMeta: (document.querySelector('meta[name="viewport"]') || {}).content || null,
    headings: [], imgIssues: [], nameIssues: [], labelIssues: [], contrastIssues: [],
    smallTargets: [], nonSemanticClicks: [], ariaHiddenFocusable: [], duplicateIds: [],
    tinyText: [], counts: {}, focusOutline: null, reducedMotionRule: null, colors: {}
  };

  const visible = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const accName = el => {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const labelled = el.getAttribute('aria-labelledby');
    if (labelled) {
      const t = labelled.split(/\\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
      if (t) return t;
    }
    const txt = (el.innerText || el.textContent || '').trim();
    if (txt) return txt;
    const img = el.querySelector && el.querySelector('img[alt]');
    if (img && img.alt.trim()) return img.alt.trim();
    const svgTitle = el.querySelector && el.querySelector('svg title');
    if (svgTitle && svgTitle.textContent.trim()) return svgTitle.textContent.trim();
    return (el.getAttribute('title') || '').trim();
  };
  const sel = el => {
    const parts = [];
    let n = el, guard = 0;
    while (n && n.nodeType === 1 && guard++ < 4) {
      let p = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(p + '#' + n.id); break; }
      const cls = (n.className && typeof n.className === 'string') ? n.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
      if (cls) p += '.' + cls;
      parts.unshift(p);
      n = n.parentElement;
    }
    return parts.join(' > ').slice(0, 160);
  };
  const describe = el => ({ tag: el.tagName.toLowerCase(), sel: sel(el), text: (el.innerText || el.textContent || '').trim().slice(0, 60) });

  // 1) Baslik hiyerarsisi
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
  hs.forEach(h => report.headings.push({ level: Number(h.tagName[1]), text: (h.textContent || '').trim().slice(0, 70) }));
  report.counts.h1 = hs.filter(h => h.tagName === 'H1').length;
  report.counts.headings = hs.length;

  // 2) Gorseller
  [...document.querySelectorAll('img')].forEach(img => {
    if (!img.hasAttribute('alt')) report.imgIssues.push({ reason: 'alt yok', src: (img.currentSrc || img.src || '').slice(-60), ...describe(img) });
    else if (!img.alt.trim() && img.getAttribute('role') !== 'presentation') report.imgIssues.push({ reason: 'alt bos', src: (img.currentSrc || img.src || '').slice(-60), ...describe(img) });
  });

  // 3) Erisilebilir adi olmayan etkilesimli ogeler
  const interactive = [...document.querySelectorAll('button, a[href], [role=button], [role=tab], [role=checkbox], [role=switch], [role=link], input, select, textarea')].filter(visible);
  interactive.forEach(el => {
    if (el.tagName === 'INPUT' && ['hidden'].includes(el.type)) return;
    if (el.getAttribute('aria-hidden') === 'true') return;
    if (!accName(el)) report.nameIssues.push({ reason: 'erisilebilir ad yok', ...describe(el), ariaLabel: el.getAttribute('aria-label') });
  });
  report.counts.interactive = interactive.length;

  // 4) Etiketsiz form alanlari
  [...document.querySelectorAll('input, select, textarea')].filter(visible).forEach(el => {
    if (['hidden', 'submit', 'button', 'checkbox', 'radio'].includes(el.type)) return;
    const id = el.id;
    const hasLabel = (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')) || el.closest('label') || (el.getAttribute('aria-label') || '').trim() || el.getAttribute('aria-labelledby');
    if (!hasLabel) report.labelIssues.push({ reason: 'etiket yok', ...describe(el), type: el.type, placeholder: el.placeholder || null });
  });

  // 5) Kontrast
  const parse = c => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map(v => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = c => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const effBg = el => {
    let n = el, acc = null;
    while (n) {
      const bg = parse(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0) acc = acc ? over(acc, bg) : bg;
      if (acc && acc.a === 1) return acc;
      n = n.parentElement;
    }
    const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
    if (acc) return bodyBg ? over(acc, bodyBg) : acc;
    return bodyBg || { r: 255, g: 255, b: 255, a: 1 };
  };
  const textOwners = [...document.querySelectorAll('body *')].filter(el => {
    if (!visible(el)) return false;
    if (!(el.innerText || '').trim()) return false;
    const hasTextChild = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasTextChild) return false;
    const s = getComputedStyle(el);
    return s.color !== 'rgba(0, 0, 0, 0)';
  });
  const seenTxt = new Set();
  textOwners.forEach(el => {
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg) return;
    const bg = effBg(el);
    const blended = fg.a < 1 ? over(fg, bg) : fg;
    const r = ratio(blended, bg);
    const size = parseFloat(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const txt = (el.innerText || '').trim().slice(0, 40);
    const key = sel(el) + '|' + Math.round(r * 10);
    if (r < need && !seenTxt.has(key)) {
      seenTxt.add(key);
      report.contrastIssues.push({ ...describe(el), ratio: Number(r.toFixed(2)), need, fontSize: size, fontWeight: s.fontWeight, color: s.color, bg: 'rgb(' + Math.round(bg.r) + ', ' + Math.round(bg.g) + ', ' + Math.round(bg.b) + ')', text: txt });
    }
    if (size < 12) report.tinyText.push({ ...describe(el), fontSize: size });
  });

  // 6) Dokunma hedefleri
  interactive.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) {
      report.smallTargets.push({ ...describe(el), w: Math.round(r.width), h: Math.round(r.height), ariaLabel: el.getAttribute('aria-label') || null });
    }
  });
  report.counts.contrastChecks = textOwners.length;

  // 7) Semantik olmayan tiklanabilirler
  [...document.querySelectorAll('div[onclick], span[onclick]')].filter(visible).forEach(el => {
    const role = el.getAttribute('role');
    const tab = el.getAttribute('tabindex');
    if (!role || tab === null) report.nonSemanticClicks.push({ ...describe(el), role, tabindex: tab });
  });

  // 8) Gizli ama odaklanabilir
  [...document.querySelectorAll('[aria-hidden="true"]')].forEach(el => {
    if (el.querySelector('a[href], button, input, select, textarea, [tabindex]')) report.ariaHiddenFocusable.push({ ...describe(el) });
  });

  // 9) Yinelenen id
  const ids = {};
  [...document.querySelectorAll('[id]')].forEach(el => { ids[el.id] = (ids[el.id] || 0) + 1; });
  Object.entries(ids).filter(([, n]) => n > 1).forEach(([id, n]) => report.duplicateIds.push({ id, count: n }));

  // 10) Renk envanteri + tema degiskenleri
  const colorCount = {};
  textOwners.forEach(el => { const c = getComputedStyle(el).color; colorCount[c] = (colorCount[c] || 0) + 1; });
  report.colors = { distinctTextColors: Object.keys(colorCount).length, top: Object.entries(colorCount).sort((a, b) => b[1] - a[1]).slice(0, 10) };
  const root = getComputedStyle(document.documentElement);
  report.themeVars = { paper: root.getPropertyValue('--paper').trim(), branch: root.getPropertyValue('--branch').trim() };
  report.darkModeQuery = matchMedia('(prefers-color-scheme: dark)').matches;
  report.reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 11) Odak halkasi var mi? (ilk odaklanabilir ogeye odaklanip stil karsilastirmasi)
  const firstFocusable = interactive.find(el => el.tabIndex >= 0 && !el.disabled);
  if (firstFocusable) {
    const before = getComputedStyle(firstFocusable);
    const beforeStyle = { o: before.outlineStyle + ' ' + before.outlineWidth + ' ' + before.outlineColor, s: before.boxShadow };
    firstFocusable.focus();
    const after = getComputedStyle(firstFocusable);
    const afterStyle = { o: after.outlineStyle + ' ' + after.outlineWidth + ' ' + after.outlineColor, s: after.boxShadow };
    report.focusOutline = { target: sel(firstFocusable), before: beforeStyle, after: afterStyle, changed: JSON.stringify(beforeStyle) !== JSON.stringify(afterStyle) };
    firstFocusable.blur();
  }

  // 12) prefers-reduced-motion kurali var mi?
  let rmFound = false;
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.conditionText && rule.conditionText.includes('prefers-reduced-motion')) rmFound = true;
      }
    } catch {}
  }
  report.reducedMotionRule = rmFound;
  return report;
})()`;

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    const chromePath = findChrome();
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-chrome-'));
    const args = [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--hide-scrollbars', '--force-device-scale-factor=1', '--mute-audio',
        '--user-data-dir=' + profile, '--remote-debugging-port=' + DEBUG_PORT, 'about:blank',
    ];
    if (!HEADFUL) args.unshift('--headless=new');
    const chrome = spawn(chromePath, args, { stdio: 'ignore' });

    let version = null;
    for (let i = 0; i < 40 && !version; i++) {
        await sleep(500);
        try {
            const res = await fetch('http://127.0.0.1:' + DEBUG_PORT + '/json/version');
            if (res.ok) version = await res.json();
        } catch {}
    }
    if (!version) { chrome.kill(); throw new Error('Chrome debug portuna baglanilamadi'); }

    const cdp = await Cdp.connect(version.webSocketDebuggerUrl);
    const out = { base: BASE, chrome: version.Browser, generatedAt: new Date().toISOString(), scenarios: [] };

    const consoleLog = [];
    let currentName = 'baslangic';
    cdp.on(msg => {
        if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
            consoleLog.push({ scenario: currentName, kind: 'console.' + msg.params.type, text: (msg.params.args || []).map(a => a.value || a.description || a.type).join(' ').slice(0, 400) });
        }
        if (msg.method === 'Runtime.exceptionThrown') {
            const d = msg.params.exceptionDetails;
            consoleLog.push({ scenario: currentName, kind: 'exception', text: (d.exception && (d.exception.description || d.exception.value) || d.text).slice(0, 600) });
        }
        if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) {
            consoleLog.push({ scenario: currentName, kind: 'log.' + msg.params.entry.level, text: (msg.params.entry.text + ' ' + (msg.params.entry.url || '')).slice(0, 400) });
        }
        if (msg.method === 'Network.loadingFailed') {
            consoleLog.push({ scenario: currentName, kind: 'network', text: msg.params.errorText + ' ' + (msg.params.type || '') });
        }
        if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
            consoleLog.push({ scenario: currentName, kind: 'http' + msg.params.response.status, text: msg.params.response.url.slice(0, 200) });
        }
    });

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => cdp.send(m, p, sessionId);
    await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');

    const evaluate = async (expression, awaitPromise = false) => {
        const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
        if (r.exceptionDetails) return { __error: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text };
        return r.result.value;
    };

    const setViewport = async (width, height, mobile) => {
        await S('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 3 : 1, mobile });
        if (mobile) await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        else await S('Emulation.setTouchEmulationEnabled', { enabled: false });
    };

    const shot = async name => {
        const { data } = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const file = path.join(OUT, name + '.png');
        fs.writeFileSync(file, Buffer.from(data, 'base64'));
        return file;
    };

    const goto = async url => {
        await S('Page.navigate', { url });
        await sleep(2500);
        // agin ve hidrasyonun oturmasi icin bekle
        for (let i = 0; i < 10; i++) {
            const ready = await evaluate('document.readyState === "complete" && !!document.querySelector("main, body > div")');
            if (ready === true) break;
            await sleep(800);
        }
        await sleep(1200);
    };

    const scenarios = [
        { name: '01-ana-sayfa-mobil', path: '/', mobile: true },
        { name: '02-projeler-mobil', path: '/projeler', mobile: true },
        { name: '03-editor-mobil', path: '/editor', mobile: true },
        { name: '04-bahce-view-mobil', path: '/bahce_view', mobile: true },
        { name: '05-gizlilik-mobil', path: '/gizlilik', mobile: true },
        { name: '06-veri-silme-mobil', path: '/veri-silme', mobile: true },
        { name: '07-ana-sayfa-masaustu', path: '/', mobile: false, width: 1440, height: 900 },
        { name: '08-projeler-masaustu', path: '/projeler', mobile: false, width: 1440, height: 900 },
    ];

    for (const sc of scenarios) {
        currentName = sc.name;
        const width = sc.width || 390;
        const height = sc.height || 844;
        await setViewport(width, height, sc.mobile !== false);
        await goto(BASE + sc.path);
        const audit = await evaluate(AUDIT_FN);
        let png = null;
        try { png = await shot(sc.name); } catch (e) { png = 'HATA: ' + e.message; }
        out.scenarios.push({ name: sc.name, path: sc.path, png, audit });
        process.stdout.write('[' + sc.name + '] tamam\n');
    }

    // Etkilesim senaryolari (ana sayfa): ayarlar modali + klavye ile kapatma
    currentName = '09-ayarlar-modali-mobil';
    await setViewport(390, 844, true);
    await goto(BASE + '/');
    const clickSettings = await evaluate(`(() => {
        const btn = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '') === 'Ayarları aç');
        if (!btn) return 'ayarlar dugmesi bulunamadi';
        btn.click();
        return 'tiklandi';
    })()`);
    await sleep(2000);
    const modalState = await evaluate(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"], dialog, [aria-modal="true"]')];
        const active = document.activeElement;
        const inDialog = dialogs.some(d => d.contains(active));
        return {
            dialogCount: dialogs.length,
            dialogAttrs: dialogs.map(d => ({ role: d.getAttribute('role'), ariaModal: d.getAttribute('aria-modal'), ariaLabel: d.getAttribute('aria-label'), labelledBy: d.getAttribute('aria-labelledby') })),
            activeElement: active ? (active.tagName.toLowerCase() + ' ' + (active.getAttribute('aria-label') || active.textContent || '').trim().slice(0, 40)) : null,
            focusInsideDialog: inDialog,
            bodyOverflow: getComputedStyle(document.body).overflow
        };
    })()`);
    let modalPng = null;
    try { modalPng = await shot('09-ayarlar-modali-mobil'); } catch (e) { modalPng = 'HATA: ' + e.message; }

    // Tab ile gezinme modali terk ediyor mu?
    const tabEscape = [];
    for (let i = 0; i < 25; i++) {
        await S('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, code: 'Tab', key: 'Tab' });
        await S('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, code: 'Tab', key: 'Tab' });
        await sleep(60);
        const inside = await evaluate(`(() => { const d = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')]; return d.length ? d.some(x => x.contains(document.activeElement)) : null; })()`);
        tabEscape.push(inside);
    }

    // ESC ile kapanma
    const beforeEsc = await evaluate('document.querySelectorAll(\'[role="dialog"], [aria-modal="true"]\').length');
    for (const type of ['rawKeyDown', 'keyUp']) {
        await S('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: 27, code: 'Escape', key: 'Escape' });
    }
    await sleep(1200);
    const afterEsc = await evaluate('document.querySelectorAll(\'[role="dialog"], [aria-modal="true"]\').length');
    const focusAfterEsc = await evaluate('document.activeElement ? (document.activeElement.getAttribute("aria-label") || document.activeElement.tagName) : null');
    const escPng = await shot('10-esc-sonrasi-mobil');

    out.interactions = {
        settingsClick: clickSettings,
        modal: modalState,
        modalPng,
        focusStayedInDialogWhileTabbing: tabEscape,
        tabEscapedDialog: tabEscape.some(v => v === false),
        dialogsBeforeEsc: beforeEsc, dialogsAfterEsc: afterEsc, focusAfterEsc, escPng,
    };

    out.consoleMessages = consoleLog;
    fs.writeFileSync(path.join(OUT, 'rapor.json'), JSON.stringify(out, null, 2), 'utf8');

    // Ozet
    const total = { contrast: 0, names: 0, labels: 0, targets: 0, img: 0, errors: 0, overflow: 0 };
    for (const s of out.scenarios) {
        const a = s.audit || {};
        total.contrast += (a.contrastIssues || []).length;
        total.names += (a.nameIssues || []).length;
        total.labels += (a.labelIssues || []).length;
        total.targets += (a.smallTargets || []).length;
        total.img += (a.imgIssues || []).length;
        if ((a.horizontalOverflow || 0) > 2) total.overflow++;
    }
    total.errors = consoleLog.filter(c => c.kind === 'exception' || c.kind.includes('error')).length;
    out.totals = total;
    process.stdout.write('\nOZET: ' + JSON.stringify(total) + '\n');
    process.stdout.write('Cikti klasoru: ' + OUT + '\n');

    cdp.close();
    chrome.kill();
    await sleep(500);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    process.exit(0);
}

main().catch(err => { console.error('TEST HATASI:', err); process.exit(1); });
