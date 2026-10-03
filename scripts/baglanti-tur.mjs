/**
 * Bağlantı kurulum ekranı duman testi.
 *
 * Ayarlar → Bilgisayar bağlantısı açılır; dört yolun her biri seçilir ve
 * adımlarının çizildiği, kart kiplerinde PC panosu bölümünün göründüğü,
 * gelişmiş "bağlantı satırı" yolunun ayarları kaydettiği ve konsolda hata
 * olmadığı denetlenir. NB_GORSEL_DIR verilirse her yolun ekran görüntüsü yazılır.
 *
 * Kullanım: npm run dev açıkken  node scripts/baglanti-tur.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as bekle } from 'node:timers/promises';

const ADRES = process.env.NB_ADRES || 'http://localhost:3000';
const PORT = Number(process.env.NB_CDP_PORT || 9446);
const SAYFA = '/editor?id=bahce-kitap&nodeId=dugum-altini';
const GORSEL = process.env.NB_GORSEL_DIR || '';

function chromeBul() {
    const adaylar = [process.env.CHROME_BIN, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
    for (const aday of adaylar) if (existsSync(aday)) return aday;
    throw new Error('Chrome/Edge bulunamadı. CHROME_BIN ortam değişkenini ayarlayın.');
}

class Cdp {
    constructor(soket) {
        this.soket = soket; this.sayac = 0; this.bekleyenler = new Map(); this.olaylar = new Map();
        soket.addEventListener('message', olay => {
            const mesaj = JSON.parse(olay.data);
            if (mesaj.id !== undefined) {
                const b = this.bekleyenler.get(mesaj.id); if (!b) return;
                this.bekleyenler.delete(mesaj.id);
                if (mesaj.error) b.reddet(new Error(JSON.stringify(mesaj.error))); else b.coz(mesaj.result);
                return;
            }
            const kuyruk = this.olaylar.get(mesaj.method);
            if (kuyruk) for (const f of kuyruk) f(mesaj.params);
        });
    }
    gonder(method, params = {}) {
        const id = ++this.sayac;
        return new Promise((coz, reddet) => { this.bekleyenler.set(id, { coz, reddet }); this.soket.send(JSON.stringify({ id, method, params })); });
    }
    dinle(method, f) { const k = this.olaylar.get(method) || []; k.push(f); this.olaylar.set(method, k); }
}

async function hedefAdresi() {
    for (let i = 0; i < 80; i++) {
        try {
            const liste = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
            const sayfa = liste.find(h => h.type === 'page' && h.webSocketDebuggerUrl);
            if (sayfa) return sayfa.webSocketDebuggerUrl;
        } catch { /* tarayıcı henüz açılmadı */ }
        await bekle(250);
    }
    throw new Error('Tarayıcının hata ayıklama kapısı açılmadı.');
}

const EKME = `(() => {
    const kullanici = { id: 'local-demo', email: 'misafir@yerel', user_metadata: { full_name: 'Misafir' } };
    localStorage.setItem('nb-local-session-v1', JSON.stringify({ user: kullanici, access_token: 'demo-token' }));
    localStorage.setItem('nb-local-db-v1', JSON.stringify({
        gardens: [{ id: 'bahce-kitap', name: 'Kitap', created_at: '2026-09-20T07:30:00.000Z', updated_at: '2026-09-20T09:10:00.000Z', deleted_at: null, user_id: kullanici.id }],
        nodes: [{ id: 'dugum-altini', garden_id: 'bahce-kitap', parent_id: null, content: 'Not', position_x: 240, position_y: 300, created_at: '2026-09-20T07:58:00.000Z', updated_at: '2026-09-20T07:58:00.000Z', deleted_at: null, is_expanded: true, is_pruned: false, color: null }]
    }));
    localStorage.setItem('nb-remote-prefs-v1', JSON.stringify({ connection: 'pc-wifi' }));
    localStorage.setItem('nb-computer-section', '1');
    return 'ekildi';
})()`;

async function main() {
    const profil = join(tmpdir(), 'nb-baglanti-tur-' + Date.now());
    mkdirSync(profil, { recursive: true });
    if (GORSEL) mkdirSync(GORSEL, { recursive: true });
    const tarayici = spawn(chromeBul(), ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu', '--hide-scrollbars', '--window-size=412,915', 'about:blank'], { stdio: 'ignore' });
    const gecti = [], kaldi = [], problemler = [];
    let cdp;
    try {
        const soket = new WebSocket(await hedefAdresi());
        await new Promise((coz, reddet) => { soket.addEventListener('open', coz, { once: true }); soket.addEventListener('error', reddet, { once: true }); });
        cdp = new Cdp(soket);
        await cdp.gonder('Page.enable'); await cdp.gonder('Runtime.enable');
        cdp.dinle('Runtime.consoleAPICalled', o => { if (o.type === 'error') problemler.push('error: ' + (o.args || []).map(a => a.value ?? a.description ?? a.type).join(' ').slice(0, 220)); });
        cdp.dinle('Runtime.exceptionThrown', o => problemler.push('exception: ' + String(o.exceptionDetails?.exception?.description || o.exceptionDetails?.text || '').slice(0, 220)));
        const degerlendir = async ifade => {
            const s = await cdp.gonder('Runtime.evaluate', { expression: ifade, returnByValue: true, awaitPromise: true });
            if (s.exceptionDetails) throw new Error('Değerlendirme hatası: ' + JSON.stringify(s.exceptionDetails).slice(0, 300));
            return s.result.value;
        };
        const git = async (yol, ms) => { await cdp.gonder('Page.navigate', { url: ADRES + yol }); await bekle(ms); };
        const tikla = ifade => degerlendir(`(() => { const e = ${ifade}; if (!e) return false; e.click(); return true; })()`);
        const sart = (ad, ok, ayrinti = '') => (ok ? gecti : kaldi).push(ad + (ok ? '' : ' ' + ayrinti));

        await git('/', 5000);
        await degerlendir(EKME);
        await git(SAYFA, 8000);
        problemler.length = 0;

        await tikla('[...document.querySelectorAll("button")].find(b => b.getAttribute("title") === "Ayarlar")'); await bekle(1500);
        sart('Bilgisayar bağlantısı bölümü açıldı', await tikla('[...document.querySelectorAll("button")].find(b => b.innerText.trim().startsWith("Bilgisayar bağlantısı"))'));
        await bekle(1500);

        for (const [id, beklenenAdim, kartKipi] of [['pc-wifi', 4, false], ['pc-bluetooth', 4, false], ['wifi', 3, true], ['bluetooth', 2, true]]) {
            const secildi = await tikla(`document.getElementById('baglanti-yolu-${id}')`);
            await bekle(700);
            const durum = await degerlendir(`(() => {
                const radyo = document.getElementById('baglanti-yolu-${id}');
                const liste = document.querySelector('[role=radiogroup][aria-label="Bağlantı yolu"]')?.parentElement?.querySelector('ol');
                const pano = [...document.querySelectorAll('h3,h4')].some(h => /PC panosu/.test(h.innerText));
                return { secili: radyo?.getAttribute('aria-checked') === 'true', adim: liste ? liste.children.length : 0, pano };
            })()`);
            sart(id + ': seçildi', secildi && durum.secili, JSON.stringify(durum));
            sart(id + ': ' + beklenenAdim + ' adım çizildi', durum.adim === beklenenAdim, JSON.stringify(durum));
            sart(id + ': PC panosu bölümü ' + (kartKipi ? 'görünüyor' : 'gizli'), durum.pano === kartKipi, JSON.stringify(durum));
            const kayit = await degerlendir(`JSON.parse(localStorage.getItem('nb-remote-prefs-v1')).connection`);
            sart(id + ': seçim kaydedildi', kayit === id, String(kayit));
            if (GORSEL) {
                await degerlendir(`document.getElementById('baglanti-yolu-${id}').scrollIntoView({ block: 'start' })`); await bekle(300);
                const k = await cdp.gonder('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                writeFileSync(join(GORSEL, 'baglanti-' + id + '.png'), Buffer.from(k.data, 'base64'));
            }
        }

        // Gelişmiş yol: bağlantı satırı yapıştırılıp kaydedilir.
        await tikla(`document.getElementById('baglanti-yolu-pc-wifi')`); await bekle(500);
        await tikla(`[...document.querySelectorAll('summary')].find(s => /bağlantı satırıyla/.test(s.innerText))`); await bekle(300);
        await degerlendir(`(() => { const i = document.querySelector('input[aria-label="Bağlantı satırı"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'http://192.168.1.50:8765|anahtar-deneme-1234567890'); i.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
        await bekle(200);
        await tikla(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Kaydet' && b.closest('details'))`); await bekle(500);
        const p = await degerlendir(`JSON.parse(localStorage.getItem('nb-remote-prefs-v1'))`);
        sart('Gelişmiş: bağlantı satırı adres ve anahtarı kaydetti', p.helperUrl === 'http://192.168.1.50:8765' && p.helperToken === 'anahtar-deneme-1234567890', JSON.stringify({ u: p.helperUrl, t: p.helperToken }));
        const adim3 = await degerlendir(`!!document.getElementById('pc-wifi-kod')`);
        sart('Kayıtlı bilgisayar varken kod alanı gösteriliyor', adim3);
        // Kod alanı yalnız rakam kabul eder, 6 hane olmadan Eşleştir kapalıdır.
        await degerlendir(`(() => { const i = document.getElementById('pc-wifi-kod'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '12a3'); i.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
        await bekle(200);
        const kodDurumu = await degerlendir(`(() => { const i = document.getElementById('pc-wifi-kod'); const b = i.parentElement.querySelector('button'); return { deger: i.value, kapali: b.disabled }; })()`);
        sart('Kod alanı harfleri atar, eksik kodda Eşleştir kapalı', kodDurumu.deger === '123' && kodDurumu.kapali, JSON.stringify(kodDurumu));

        console.log('');
        for (const s of gecti) console.log('  ✓ ' + s);
        for (const s of kaldi) console.log('  ✗ ' + s);
        console.log('');
        console.log(problemler.length ? 'Konsol hataları:\n  ! ' + [...new Set(problemler)].slice(0, 10).join('\n  ! ') : 'Konsol: hata yok.');
        console.log('Özet: ' + gecti.length + ' geçti, ' + kaldi.length + ' kaldı.');
        if (kaldi.length || problemler.length) process.exitCode = 1;
    } finally {
        try { cdp?.soket.close(); } catch { /* yoksay */ }
        tarayici.kill(); await bekle(500);
        try { rmSync(profil, { recursive: true, force: true }); } catch { /* yoksay */ }
    }
}
main().catch(h => { console.error('Hata: ' + h.message); process.exitCode = 1; });
