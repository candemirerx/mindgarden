/**
 * Not Bahcesi - canli arayuz denetimi (erisilebilirlik + UI + tema).
 *
 * Headless Chrome/Edge ile telefon olcusunde (412x915) sayfalari gezer:
 *   - axe-core (WCAG 2.2 AA + best-practice) ihlalleri
 *   - dokunma hedefi olculeri, yatay tasma, kucuk yazi, erisilebilir isim
 *   - sekme sirasi, karanlik tema tercihi, hareket azaltma, %200 yazi boyutu
 * Ekran goruntusu ve JSON rapor uretir.
 *
 * Kullanim:  npm run dev   ->   node docs/reviews/2026-09-28-ui-testi.mjs
 * Ortam: NB_ADRES, NB_CDP_PORT, NB_AXE, NB_TARAYICI, NB_CIKTI
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as bekle } from 'node:timers/promises';

const KOK = resolve(import.meta.dirname, '..', '..');
const ADRES = process.env.NB_ADRES || 'http://localhost:3000';
const PORT = Number(process.env.NB_CDP_PORT || 9444);
const AXE = process.env.NB_AXE || join(tmpdir(), 'axe.min.js');
const CIKTI = process.env.NB_CIKTI || join(KOK, 'docs', 'reviews', 'ui-testi');

function tarayiciBul() {
    const adaylar = [
        process.env.NB_TARAYICI,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    ].filter(Boolean);
    for (const aday of adaylar) if (existsSync(aday)) return aday;
    throw new Error('Chrome/Edge bulunamadi.');
}

class Cdp {
    constructor(soket) {
        this.soket = soket;
        this.sayac = 0;
        this.bekleyenler = new Map();
        this.olaylar = new Map();
        this.gunlukler = [];
        soket.addEventListener('message', (olay) => {
            const mesaj = JSON.parse(olay.data);
            if (mesaj.id !== undefined) {
                const bekleyen = this.bekleyenler.get(mesaj.id);
                if (!bekleyen) return;
                this.bekleyenler.delete(mesaj.id);
                if (mesaj.error) bekleyen.reddet(new Error(mesaj.method + ': ' + JSON.stringify(mesaj.error)));
                else bekleyen.coz(mesaj.result);
                return;
            }
            if (mesaj.method === 'Log.entryAdded') this.gunlukler.push(mesaj.params.entry);
            const kuyruk = this.olaylar.get(mesaj.method);
            if (kuyruk && kuyruk.length) kuyruk.shift()(mesaj.params);
        });
    }

    gonder(method, params = {}) {
        const id = ++this.sayac;
        return new Promise((coz, reddet) => {
            this.bekleyenler.set(id, { coz, reddet });
            this.soket.send(JSON.stringify({ id, method, params }));
        });
    }

    olayBekle(method) {
        const kuyruk = this.olaylar.get(method) || [];
        return new Promise((coz) => {
            kuyruk.push(coz);
            this.olaylar.set(method, kuyruk);
        });
    }
}

async function hedefAdresi() {
    for (let deneme = 0; deneme < 80; deneme++) {
        try {
            const yanit = await fetch('http://127.0.0.1:' + PORT + '/json/list');
            const liste = await yanit.json();
            const sayfa = liste.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
            if (sayfa) return sayfa.webSocketDebuggerUrl;
        } catch {
            // tarayici henuz acilmadi
        }
        await bekle(250);
    }
    throw new Error('Hata ayiklama kapisi acilmadi.');
}

const ORNEK_VERI = {
    kullanici: { id: 'local-demo', email: 'misafir@yerel', user_metadata: { full_name: 'Misafir Bahcivan', avatar_url: null } },
    bahceler: [
        ['bahce-kitap', 'Kitap Notlari', '2026-09-20T07:30:00.000Z', '2026-09-20T09:10:00.000Z'],
        ['bahce-proje', 'Proje Fikirleri', '2026-09-20T06:05:00.000Z', '2026-09-20T08:40:00.000Z'],
        ['bahce-gunluk', 'Gunluk', '2026-09-19T17:20:00.000Z', '2026-09-19T21:15:00.000Z']
    ],
    dugumler: [
        ['dugum-sapiens', 'bahce-kitap', null, 'Sapiens', 0, 0, '2026-09-20T07:35:00.000Z'],
        ['dugum-simyaci', 'bahce-kitap', null, 'Simyaci - Paulo Coelho', 0, 260, '2026-09-20T07:50:00.000Z'],
        ['dugum-altini', 'bahce-kitap', 'dugum-simyaci', 'Altini cizdigim satirlar', 240, 300, '2026-09-20T07:58:00.000Z'],
        ['dugum-proje-1', 'bahce-proje', null, 'Yeni uygulama fikri', 0, 0, '2026-09-20T06:10:00.000Z'],
        ['dugum-gunluk-1', 'bahce-gunluk', null, 'Bugun', 0, 0, '2026-09-19T17:25:00.000Z']
    ]
};

function ekmeBetigi() {
    const kullanici = ORNEK_VERI.kullanici;
    const bahceler = ORNEK_VERI.bahceler.map((b) => ({
        id: b[0], name: b[1], created_at: b[2], updated_at: b[3], deleted_at: null, user_id: kullanici.id
    }));
    const dugumler = ORNEK_VERI.dugumler.map((d) => ({
        id: d[0], garden_id: d[1], parent_id: d[2], content: d[3],
        position_x: d[4], position_y: d[5], created_at: d[6], updated_at: d[6],
        deleted_at: null, is_expanded: true, is_pruned: false, color: null
    }));
    const oturum = JSON.stringify({ user: kullanici, access_token: 'demo-token' });
    const veritabani = JSON.stringify({ gardens: bahceler, nodes: dugumler });
    return [
        'localStorage.setItem("nb-local-session-v1", ' + JSON.stringify(oturum) + ');',
        'localStorage.setItem("nb-local-db-v1", ' + JSON.stringify(veritabani) + ');',
        'localStorage.setItem("nb-ai-section", "1");',
        'localStorage.setItem("nb-tools-section", "1");',
        'localStorage.setItem("nb-ai-provider", "gemini");',
        '"ekildi"'
    ].join(';');
}

const SAYFALAR = [
    { ad: 'ana-sayfa', yol: '/' },
    { ad: 'projeler', yol: '/projeler?id=bahce-kitap' },
    { ad: 'editor', yol: '/editor?id=bahce-kitap&nodeId=dugum-altini' },
    { ad: 'bahce-view', yol: '/bahce_view?id=bahce-kitap' },
    { ad: 'gizlilik', yol: '/gizlilik' },
    { ad: 'veri-silme', yol: '/veri-silme' }
];
const OLCUM_IFADESI = "(() => {\n    function gorunur(el) {\n        const r = el.getBoundingClientRect();\n        const s = getComputedStyle(el);\n        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';\n    }\n    function ad(el) {\n        const aria = el.getAttribute('aria-label');\n        if (aria && aria.trim()) return 'aria-label: ' + aria.trim();\n        if (el.labels && el.labels.length && (el.labels[0].innerText || '').trim()) return 'label: ' + el.labels[0].innerText.trim();\n        const t = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();\n        if (t) return 'metin: ' + t.slice(0, 60);\n        const title = el.getAttribute('title');\n        if (title && title.trim()) return 'title: ' + title.trim();\n        const img = el.querySelector('img[alt]');\n        if (img && img.alt) return 'img alt: ' + img.alt;\n        return '(YOK)';\n    }\n    function yol(el) {\n        const parcalar = [];\n        let d = el;\n        while (d && d.nodeType === 1 && parcalar.length < 5) {\n            let p = d.tagName.toLowerCase();\n            if (d.id) p += '#' + d.id;\n            if (!d.id && d.className && typeof d.className === 'string') p += '.' + d.className.split(/\\s+/).filter(Boolean).slice(0, 2).join('.');\n            parcalar.unshift(p);\n            d = d.parentElement;\n        }\n        return parcalar.join(' > ');\n    }\n    const secici = 'a[href], button, [role=button], input:not([type=hidden]), select, textarea, [tabindex]';\n    const etkilesimliler = Array.prototype.slice.call(document.querySelectorAll(secici)).filter(gorunur).filter(function (el) { return el.getAttribute('tabindex') !== '-1'; });\n    const kucukHedefler = [];\n    etkilesimliler.forEach(function (el) {\n        const r = el.getBoundingClientRect();\n        if (r.width < 44 || r.height < 44) kucukHedefler.push({ yol: yol(el), ad: ad(el).slice(0, 60), genislik: Math.round(r.width), yukseklik: Math.round(r.height) });\n    });\n    const isimsizler = etkilesimliler.filter(function (el) { return ad(el) === '(YOK)'; }).map(yol).slice(0, 25);\n    const kucukYazilar = [];\n    const yaziSayaci = {};\n    Array.prototype.slice.call(document.querySelectorAll('body *')).forEach(function (el) {\n        if (!gorunur(el)) return;\n        const px = parseFloat(getComputedStyle(el).fontSize);\n        const kendiMetni = Array.prototype.slice.call(el.childNodes).some(function (n) { return n.nodeType === 3 && n.textContent.trim().length > 1; });\n        if (!kendiMetni || !isFinite(px) || px >= 12) return;\n        const anahtar = Math.round(px * 10) / 10;\n        yaziSayaci[anahtar] = (yaziSayaci[anahtar] || 0) + 1;\n        if (kucukYazilar.length < 12) kucukYazilar.push({ yol: yol(el), px: anahtar, ornek: (el.textContent || '').trim().slice(0, 40) });\n    });\n    const yatayTasma = [];\n    Array.prototype.slice.call(document.querySelectorAll('body *')).forEach(function (el) {\n        if (!gorunur(el)) return;\n        const s = getComputedStyle(el);\n        if (el.scrollWidth > el.clientWidth + 4 && s.overflowX !== 'auto' && s.overflowX !== 'scroll' && yatayTasma.length < 15) yatayTasma.push({ yol: yol(el), kaydirma: el.scrollWidth, gorunur: el.clientWidth });\n    });\n    const basliklar = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(function (h) { return { seviye: h.tagName, metin: (h.textContent || '').trim().slice(0, 50) }; });\n    return {\n        baslik: document.title,\n        dil: document.documentElement.lang || '(yok)',\n        genislik: window.innerWidth,\n        yukseklik: window.innerHeight,\n        belgeGenisligi: document.documentElement.scrollWidth,\n        sayfaYuksekligi: document.documentElement.scrollHeight,\n        yataySayfaTasmasi: document.documentElement.scrollWidth > window.innerWidth + 1,\n        etkilesimliSayisi: etkilesimliler.length,\n        kucukHedefSayisi: kucukHedefler.length,\n        kucukHedefler: kucukHedefler.slice(0, 25),\n        isimsizEtkilesimliler: isimsizler,\n        kucukYazilar: kucukYazilar,\n        kucukYaziDagilimi: Object.keys(yaziSayaci).map(function (k) { return [Number(k), yaziSayaci[k]]; }).sort(function (a, b) { return a[0] - b[0]; }),\n        yatayTasma: yatayTasma,\n        basliklar: basliklar.slice(0, 30),\n        imgSayisi: document.images.length,\n        altsizImg: Array.prototype.slice.call(document.images).filter(function (i) { return !i.hasAttribute('alt'); }).length,\n        animasyonluOgeSayisi: Array.prototype.slice.call(document.querySelectorAll('body *')).filter(function (el) { return getComputedStyle(el).animationName !== 'none'; }).length,\n        gecisliOgeSayisi: Array.prototype.slice.call(document.querySelectorAll('body *')).filter(function (el) { return getComputedStyle(el).transitionDuration.split(',').some(function (d) { return parseFloat(d) > 0.05; }); }).length,\n        renkler: (function () { const s = getComputedStyle(document.body); const p = getComputedStyle(document.documentElement); return { govdeZemin: s.backgroundColor, govdeRenk: s.color, kokZemin: p.backgroundColor }; })(),\n        tercihler: { karanlik: window.matchMedia('(prefers-color-scheme: dark)').matches, hareketAzalt: window.matchMedia('(prefers-reduced-motion: reduce)').matches },\n        touchAction: getComputedStyle(document.body).touchAction,\n        textSizeAdjust: getComputedStyle(document.documentElement).webkitTextSizeAdjust\n    };\n})()";
const AXE_IFADESI = "axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] }, resultTypes: ['violations','incomplete'] }).then(r => ({ ihlaller: r.violations.map(v => ({ id: v.id, etki: v.impact, yardim: v.help, kriterler: v.tags.filter(t => t.indexOf('wcag') === 0), dugumSayisi: v.nodes.length, ornekler: v.nodes.slice(0,3).map(n => ({ hedef: n.target.join(' '), ozet: (n.failureSummary || '').replace(/\\s+/g, ' ').slice(0,240) })) })), belirsiz: r.incomplete.map(v => ({ id: v.id, dugumSayisi: v.nodes.length })) }))";
const AXE_IHLAL_IFADESI = "axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] }, resultTypes: ['violations'] }).then(r => r.violations.map(v => ({ id: v.id, etki: v.impact, dugumSayisi: v.nodes.length, ornekler: v.nodes.slice(0,3).map(n => ({ hedef: n.target.join(' '), ozet: (n.failureSummary || '').replace(/\\s+/g, ' ').slice(0,220) })) })))";
const ODAK_IFADESI = "(function () { const a = document.activeElement; if (!a || a === document.body) return '(govde)'; const r = a.getBoundingClientRect(); return a.tagName.toLowerCase() + (a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label') + ']' : '') + ' | ' + ((a.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40)) + ' | ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' | ' + ((a.className && typeof a.className === 'string') ? a.className.slice(0, 70) : ''); })()";
const HAREKET_IFADESI = "({ eslesiyor: window.matchMedia('(prefers-reduced-motion: reduce)').matches, animasyonluOgeSayisi: Array.prototype.slice.call(document.querySelectorAll('body *')).filter(function (el) { return getComputedStyle(el).animationName !== 'none'; }).length, gecisliOgeSayisi: Array.prototype.slice.call(document.querySelectorAll('body *')).filter(function (el) { return getComputedStyle(el).transitionDuration.split(',').some(function (d) { return parseFloat(d) > 0.05; }); }).length })";
const DIYALOG_IFADESI = "(function () { const d = document.querySelector('[role=dialog]'); if (!d) return { dialogVar: false }; return { dialogVar: true, ariaModal: d.getAttribute('aria-modal'), etiketli: Boolean(d.getAttribute('aria-label') || d.getAttribute('aria-labelledby')), odakIceride: d.contains(document.activeElement) }; })()";
const DIYALOG_ODAK_IFADESI = "(function () { const d = document.querySelector('[role=dialog]'); return { odakIceride: d ? d.contains(document.activeElement) : null, aktif: document.activeElement ? (document.activeElement.tagName + ' | ' + ((document.activeElement.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40))) : null }; })()";

async function main() {
    if (!existsSync(AXE)) throw new Error('axe-core bulunamadi: ' + AXE);
    const axeKaynak = readFileSync(AXE, 'utf8');
    mkdirSync(CIKTI, { recursive: true });
    const tarayici = spawn(tarayiciBul(), [
        '--headless=new',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + join(tmpdir(), 'nb-ui-' + Date.now()),
        '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank'
    ], { stdio: 'ignore' });

    const rapor = { adres: ADRES, tarih: new Date().toISOString(), sayfalar: {}, masaustuAyarlar: null };
    let cdp;
    try {
        const soket = new WebSocket(await hedefAdresi());
        await new Promise((coz, reddet) => {
            soket.addEventListener('open', coz, { once: true });
            soket.addEventListener('error', reddet, { once: true });
        });
        cdp = new Cdp(soket);
        await cdp.gonder('Page.enable');
        await cdp.gonder('Runtime.enable');
        await cdp.gonder('Log.enable');

        const cek = async (dosya) => {
            const sonuc = await cdp.gonder('Page.captureScreenshot', { format: 'png', fromSurface: true });
            writeFileSync(join(CIKTI, dosya), Buffer.from(sonuc.data, 'base64'));
        };
        const git = async (yol, bekleme) => {
            const yuklendi = cdp.olayBekle('Page.loadEventFired');
            await cdp.gonder('Page.navigate', { url: ADRES + yol });
            await yuklendi;
            await bekle(bekleme);
        };
        const degerlendir = async (ifade) => {
            const s = await cdp.gonder('Runtime.evaluate', { expression: ifade, returnByValue: true, awaitPromise: true });
            return s.result ? s.result.value : undefined;
        };
        const sekmeBas = async () => {
            await cdp.gonder('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
            await cdp.gonder('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
            await bekle(80);
        };

        await cdp.gonder('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true });
        await git('/', 4000);
        await degerlendir(ekmeBetigi());
        console.log('Ornek veri ekildi.');
        for (const sayfa of SAYFALAR) {
            cdp.gunlukler.length = 0;
            await git(sayfa.yol, sayfa.ad === 'editor' ? 6000 : 4000);
            const olcum = await degerlendir(OLCUM_IFADESI);
            await cdp.gonder('Runtime.evaluate', { expression: axeKaynak, returnByValue: false });
            const axeSonuc = await degerlendir(AXE_IFADESI);

            const sekmeSirasi = [];
            for (let i = 0; i < 18; i++) {
                await sekmeBas();
                sekmeSirasi.push(await degerlendir(ODAK_IFADESI));
            }
            await cek(sayfa.ad + '-mobil.png');

            await cdp.gonder('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
            await bekle(600);
            const karanlik = await degerlendir(OLCUM_IFADESI);
            await cek(sayfa.ad + '-karanlik-tercih.png');
            await cdp.gonder('Emulation.setEmulatedMedia', { features: [] });

            await cdp.gonder('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
            await bekle(500);
            const hareketAzalt = await degerlendir(HAREKET_IFADESI);
            await cdp.gonder('Emulation.setEmulatedMedia', { features: [] });

            await degerlendir("document.documentElement.style.fontSize = '200%'");
            await bekle(700);
            const buyuk = await degerlendir(OLCUM_IFADESI);
            await cek(sayfa.ad + '-buyuk-yazi.png');
            await degerlendir("document.documentElement.style.fontSize = ''");

            rapor.sayfalar[sayfa.ad] = {
                yol: sayfa.yol,
                olcum: olcum,
                axe: axeSonuc,
                sekmeSirasi: sekmeSirasi,
                karanlikTercihRenkleri: karanlik ? karanlik.renkler : null,
                hareketAzalt: hareketAzalt,
                buyukYazi: buyuk ? { yataySayfaTasmasi: buyuk.yataySayfaTasmasi, belgeGenisligi: buyuk.belgeGenisligi, sayfaYuksekligi: buyuk.sayfaYuksekligi, kucukHedefSayisi: buyuk.kucukHedefSayisi, kucukYaziDagilimi: buyuk.kucukYaziDagilimi, yatayTasma: buyuk.yatayTasma, kucukYazilar: buyuk.kucukYazilar } : null,
                konsol: cdp.gunlukler.slice(0, 20).map(function (g) { return { seviye: g.level, metin: (g.text || '').slice(0, 200) }; })
            };
            console.log('  ' + sayfa.ad + ' -> axe ihlali: ' + (axeSonuc ? axeSonuc.ihlaller.length : '?') + ', kucuk hedef: ' + (olcum ? olcum.kucukHedefSayisi : '?') + ', tasma: ' + (olcum ? olcum.yataySayfaTasmasi : '?'));
        }

        await cdp.gonder('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 5000);
        await cek('masaustu-editor.png');
        await degerlendir("(function () { const b = Array.prototype.slice.call(document.querySelectorAll('button')).filter(function (x) { return x.getAttribute('title') === 'Ayarlar'; })[0]; if (b) b.click(); return Boolean(b); })()");
        await bekle(2000);
        await cek('masaustu-ayarlar.png');
        await cdp.gonder('Runtime.evaluate', { expression: axeKaynak, returnByValue: false });
        const ayarAxe = await degerlendir(AXE_IHLAL_IFADESI);
        const odakTesti = await degerlendir(DIYALOG_IFADESI);
        const sekmeIzleri = [];
        for (let i = 0; i < 15; i++) { await sekmeBas(); sekmeIzleri.push(await degerlendir(ODAK_IFADESI)); }
        const odakKacagi = await degerlendir(DIYALOG_ODAK_IFADESI);
        await cdp.gonder('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        await cdp.gonder('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        await bekle(900);
        const kapanmaSonrasi = await degerlendir("({ dialogVar: Boolean(document.querySelector('[role=dialog]')), odak: document.activeElement ? (document.activeElement.getAttribute('title') || document.activeElement.tagName) : null })");
        rapor.masaustuAyarlar = { axe: ayarAxe, odakTesti: odakTesti, sekmeIzleri: sekmeIzleri, odakKacagi: odakKacagi, kapanmaSonrasi: kapanmaSonrasi };
        await cek('masaustu-ayarlar-sonrasi.png');

        writeFileSync(join(CIKTI, 'sonuclar.json'), JSON.stringify(rapor, null, 2), 'utf8');
        console.log('Rapor yazildi: ' + join(CIKTI, 'sonuclar.json'));
    } finally {
        try { cdp.soket.close(); } catch (e) { /* yoksay */ }
        tarayici.kill();
        await bekle(500);
    }
}

main().catch(function (hata) {
    console.error('Hata: ' + hata.stack);
    process.exitCode = 1;
});
