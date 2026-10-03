/**
 * Sıralı makronun çalışma biçimleri duman testi.
 *
 * 1) Düzenleyicide dört biçim (Normal, Sayılı, Anahtar, Basılı tut) görünür;
 *    Sayılı 3 kez + 0,2 sn tur arası kaydedilir, geçersiz sayı reddedilir.
 * 2) Kısayol panosunda sahte PC yardımcısıyla: Normal 1 kez, Sayılı tam 3 kez,
 *    Anahtar kapatılana kadar, Basılı tut bırakılana kadar çalışır.
 *
 * Kullanım: npm run dev açıkken  node scripts/makro-calisma-tur.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as bekle } from 'node:timers/promises';

const ADRES = process.env.NB_ADRES || 'http://localhost:3000';
const PORT = Number(process.env.NB_CDP_PORT || 9448);
const SAYFA = '/editor?id=bahce-kitap&nodeId=dugum-altini';

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
    localStorage.setItem('nb-remote-prefs-v1', JSON.stringify({ connection: 'pc-wifi', helperUrl: 'http://127.0.0.1:9', helperToken: 'deneme' }));
    localStorage.setItem('nb-computer-section', '1');
    return 'ekildi';
})()`;



async function main() {
    const profil = join(tmpdir(), 'nb-makro-calisma-' + Date.now());
    mkdirSync(profil, { recursive: true });
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
        const yaz = (secici, deger) => degerlendir(`(() => { const i = ${secici}; if (!i) return false; Object.getOwnPropertyDescriptor((i.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement).prototype, 'value').set.call(i, ${JSON.stringify(deger)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
        const sart = (ad, ok, ayrinti = '') => (ok ? gecti : kaldi).push(ad + (ok ? '' : ' ' + ayrinti));

        await git('/', 5000);
        await degerlendir(EKME);
        await git(SAYFA, 8000);
        problemler.length = 0;

        // 1) Düzenleyici: sıralı makro, "Sayılı" 3 kez, turlar arası 0,2 sn.
        await tikla('[...document.querySelectorAll("button")].find(b => b.getAttribute("title") === "Ayarlar")'); await bekle(1500);
        await tikla('[...document.querySelectorAll("button")].find(b => b.innerText.trim().startsWith("Düzenleme araçları"))'); await bekle(1200);
        await tikla('document.getElementById("tools-settings-tab-computer")'); await bekle(1000);
        sart('Makro Ekle açıldı', await tikla('document.getElementById("makro-ekle")'));
        await bekle(800);
        await yaz('document.getElementById("makro-ad")', 'Sayili');
        await tikla('document.getElementById("makro-tur-sirali")'); await bekle(300);
        await tikla('document.getElementById("makro-adim-ekle-text")'); await bekle(300);
        await yaz('document.querySelector(\'textarea[aria-label="1. adım metni"]\')', 's');
        const secenekler = await degerlendir(`[...document.querySelectorAll('[aria-label="Çalışma biçimi"] button')].map(b => b.innerText.trim())`);
        sart('Dört çalışma biçimi var', JSON.stringify(secenekler) === JSON.stringify(['Normal', 'Sayılı', 'Anahtar', 'Basılı tut']), JSON.stringify(secenekler));
        sart('Varsayılan Normal', await degerlendir(`document.getElementById('makro-calisma-tek').getAttribute('aria-pressed')`) === 'true');
        sart('Normalde sayı alanı yok', await degerlendir(`!document.getElementById('makro-tekrar')`));
        await tikla('document.getElementById("makro-calisma-sayili")'); await bekle(300);
        sart('Sayılıda sayı alanı çıktı', await yaz('document.getElementById("makro-tekrar")', '3'));
        await yaz('document.getElementById("makro-tur-arasi")', '0.2');
        await yaz('document.getElementById("makro-tekrar")', '0');
        await tikla('document.getElementById("makro-kaydet")'); await bekle(400);
        sart('Geçersiz sayı (0) kaydedilmedi', await degerlendir(`!!document.querySelector('[data-makro-duzenleyici]')`));
        await yaz('document.getElementById("makro-tekrar")', '3'); await bekle(200);
        await tikla('document.getElementById("makro-kaydet")'); await bekle(800);
        const kayit = await degerlendir(`(JSON.parse(localStorage.getItem('nb-remote-prefs-v1')).macros || []).find(m => m.name === 'Sayili')`);
        sart('Kaydedildi: sayili, 3 kez, 200 ms', kayit?.calisma === 'sayili' && kayit?.tekrar === 3 && kayit?.turArasi === 200, JSON.stringify(kayit));

        // Anahtar, basılı ve normal makrolar doğrudan eklenir.
        await degerlendir(`(() => {
            const p = JSON.parse(localStorage.getItem('nb-remote-prefs-v1'));
            const adim = t => [{ type: 'text', value: t }];
            p.macros.push({ id: 'm-anahtar', name: 'Anahtar', type: 'sequence', value: '1 adım', enabled: true, steps: adim('a'), calisma: 'anahtar' });
            p.macros.push({ id: 'm-basili', name: 'Basili', type: 'sequence', value: '1 adım', enabled: true, steps: adim('b'), calisma: 'basili' });
            p.macros.push({ id: 'm-tek', name: 'Tek', type: 'sequence', value: '1 adım', enabled: true, steps: adim('t') });
            localStorage.setItem('nb-remote-prefs-v1', JSON.stringify(p));
            return 1;
        })()`);

        // 2) Çalıştırma: sahte yardımcı, gönderilen metinler sayılır.
        await git(SAYFA, 6000);
        await degerlendir(`(() => {
            window.__giden = [];
            const gercek = window.fetch.bind(window);
            window.fetch = async (url, secenek) => {
                if (String(url).includes('127.0.0.1:9/input')) { window.__giden.push(JSON.parse(secenek.body).text); return new Response('{"ok":true}', { status: 200 }); }
                return gercek(url, secenek);
            };
            return 1;
        })()`);
        await tikla('document.getElementById("studio-kisayollar")'); await bekle(1000);
        const dugme = ad => `[...document.querySelectorAll('#kisayol-izgarasi button')].find(b => b.getAttribute('aria-label').startsWith('${ad} '))`;
        const say = harf => degerlendir(`window.__giden.filter(t => t === '${harf}').length`);
        const calisiyor = ad => degerlendir(`${dugme(ad)}?.getAttribute('data-makro-calisiyor') === 'evet'`);

        await tikla(dugme('Tek')); await bekle(1200);
        sart('Normal: bir kez', await say('t') === 1, String(await say('t')));

        await tikla(dugme('Sayili')); await bekle(80);
        sart('Sayılı: çalışırken vurgulu ve sayaç görünür', await calisiyor('Sayili') && /\d\/3/.test(await degerlendir(`${dugme('Sayili')}.innerText`)));
        await bekle(2500);
        sart('Sayılı: tam 3 kez', await say('s') === 3, String(await say('s')));
        sart('Sayılı: bitince vurgu kalktı', !(await calisiyor('Sayili')));

        await tikla(dugme('Anahtar')); await bekle(1500);
        const anahtarAcik = await say('a');
        sart('Anahtar: açıkken tekrar ediyor (≥3)', anahtarAcik >= 3, String(anahtarAcik));
        sart('Anahtar: basılı görünüyor (aria-pressed)', await degerlendir(`${dugme('Anahtar')}.getAttribute('aria-pressed')`) === 'true');
        await tikla(dugme('Anahtar')); await bekle(600);
        const anahtarKapali = await say('a'); await bekle(1000);
        sart('Anahtar: kapatınca durdu', (await say('a')) === anahtarKapali && !(await calisiyor('Anahtar')), anahtarKapali + ' → ' + (await say('a')));

        const isaretci = tur => degerlendir(`(() => { const b = ${dugme("Basili")}; b.dispatchEvent(new PointerEvent("${tur}", { bubbles: true, pointerId: 1, button: 0, isPrimary: true, pointerType: "touch" })); return true; })()`);
        await tikla(dugme('Basili')); await bekle(600);
        sart('Basılı: yalnız tıklama çalıştırmaz', await say('b') === 0, String(await say('b')));
        await isaretci('pointerdown'); await bekle(1500);
        const basiliIken = await say('b');
        sart('Basılı: basılıyken tekrar ediyor (≥3)', basiliIken >= 3, String(basiliIken));
        await isaretci('pointerup'); await bekle(600);
        const birakinca = await say('b'); await bekle(1000);
        sart('Basılı: bırakınca durdu', (await say('b')) === birakinca && !(await calisiyor('Basili')), birakinca + ' → ' + (await say('b')));

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
