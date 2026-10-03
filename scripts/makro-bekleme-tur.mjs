/**
 * Sıralı makroda bekleme adımı duman testi.
 *
 * 1) Düzenleyicide iki metin adımının arasına "+ Bekleme" ile 1 sn eklenir,
 *    süre 1,5 sn yapılır ve makro kaydedilir.
 * 2) Makro kısayol panosundan sahte PC yardımcısıyla çalıştırılır; iki metin
 *    adımı arasında gerçekten ~1,5 sn geçtiği ölçülür.
 *
 * Kullanım: npm run dev açıkken  node scripts/makro-bekleme-tur.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as bekle } from 'node:timers/promises';

const ADRES = process.env.NB_ADRES || 'http://localhost:3000';
const PORT = Number(process.env.NB_CDP_PORT || 9447);
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
    const profil = join(tmpdir(), 'nb-makro-tur-' + Date.now());
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
        const yaz = (secici, deger) => degerlendir(`(() => { const i = ${secici}; if (!i) return false; const tip = i.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(tip.prototype, 'value').set.call(i, ${JSON.stringify(deger)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
        const sart = (ad, ok, ayrinti = '') => (ok ? gecti : kaldi).push(ad + (ok ? '' : ' ' + ayrinti));

        await git('/', 5000);
        await degerlendir(EKME);
        await git(SAYFA, 8000);
        problemler.length = 0;

        // 1) Düzenleyici: Sıralı makro, iki metin adımı, araya bekleme.
        await tikla('[...document.querySelectorAll("button")].find(b => b.getAttribute("title") === "Ayarlar")'); await bekle(1500);
        await tikla('[...document.querySelectorAll("button")].find(b => b.innerText.trim().startsWith("Düzenleme araçları"))'); await bekle(1200);
        await tikla('document.getElementById("tools-settings-tab-computer")'); await bekle(1000);
        sart('Makro Ekle açıldı', await tikla('document.getElementById("makro-ekle")'));
        await bekle(800);
        await yaz('document.getElementById("makro-ad")', 'Bekleme denemesi');
        await tikla('document.getElementById("makro-tur-sirali")'); await bekle(300);
        await tikla('document.getElementById("makro-adim-ekle-text")'); await bekle(200);
        await tikla('document.getElementById("makro-adim-ekle-text")'); await bekle(300);
        await yaz('document.querySelector(\'textarea[aria-label="1. adım metni"]\')', 'birinci');
        await yaz('document.querySelector(\'textarea[aria-label="2. adım metni"]\')', 'ikinci');
        await bekle(200);
        sart('İki adımın arasında "+ Bekleme" düğmesi var', await tikla('document.querySelector(\'button[aria-label="1. ve 2. adımın arasına bekleme ekle"]\')'));
        await bekle(400);
        const liste = await degerlendir(`[...document.querySelectorAll('[data-makro-adim]')].map(li => li.querySelector('span')?.innerText.trim())`);
        sart('Bekleme tam araya girdi (Metin, Bekle, Metin)', JSON.stringify(liste.map(t => t.split('·')[1]?.trim())) === JSON.stringify(['Metin', 'Bekle', 'Metin']), JSON.stringify(liste));
        const ara = await degerlendir(`!!document.querySelector('button[aria-label$="arasına bekleme ekle"]')`);
        sart('Bekleme komşusunda yeni "+ Bekleme" gösterilmiyor', ara === false);
        const hazir = await degerlendir(`[...document.querySelectorAll('[aria-label="2. adım hazır süreler"] button')].find(b => b.getAttribute('aria-pressed') === 'true')?.innerText`);
        sart('Varsayılan 1 sn seçili', hazir === '1 sn', String(hazir));
        await yaz('document.querySelector(\'input[aria-label="2. adım bekleme süresi (saniye)"]\')', '1.5');
        await bekle(300);
        await tikla('document.getElementById("makro-kaydet")'); await bekle(800);
        const kayit = await degerlendir(`(JSON.parse(localStorage.getItem('nb-remote-prefs-v1')).macros || []).find(m => m.name === 'Bekleme denemesi')`);
        sart('Makro kaydedildi, bekleme 1500 ms', !!kayit && JSON.stringify(kayit.steps.map(a => a.type + ':' + a.value)) === JSON.stringify(['text:birinci', 'wait:1500', 'text:ikinci']), JSON.stringify(kayit?.steps));

        // 2) Çalıştırma: sahte yardımcıyla adımlar arasındaki süre ölçülür.
        await git(SAYFA, 6000);
        await degerlendir(`(() => {
            window.__giden = [];
            const gercek = window.fetch.bind(window);
            window.fetch = async (url, secenek) => {
                if (String(url).includes('127.0.0.1:9/input')) { window.__giden.push({ t: performance.now(), g: JSON.parse(secenek.body) }); return new Response('{"ok":true}', { status: 200 }); }
                return gercek(url, secenek);
            };
            return 1;
        })()`);
        await tikla('document.getElementById("studio-kisayollar")'); await bekle(1000);
        sart('Makro panoda çalıştırıldı', await tikla(`[...document.querySelectorAll('#kisayol-izgarasi button')].find(b => b.getAttribute('aria-label').startsWith('Bekleme denemesi'))`));
        await bekle(3000);
        const giden = await degerlendir('JSON.stringify(window.__giden)').then(JSON.parse);
        const fark = giden.length === 2 ? giden[1].t - giden[0].t : -1;
        sart('İki metin de gitti (birinci, ikinci)', giden.length === 2 && giden[0].g.text === 'birinci' && giden[1].g.text === 'ikinci', JSON.stringify(giden.map(x => x.g)));
        sart('Aradaki süre ~1,5 sn (1,45–1,9 sn)', fark >= 1450 && fark <= 1900, Math.round(fark) + ' ms');

        console.log('');
        for (const s of gecti) console.log('  ✓ ' + s);
        for (const s of kaldi) console.log('  ✗ ' + s);
        console.log('  · ölçülen bekleme: ' + Math.round(fark) + ' ms');
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
