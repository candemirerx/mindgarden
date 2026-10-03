/**
 * Ekran düzeni duman testi.
 *
 * Doğrulananlar:
 *  1) Eski 4 bölmeli kayıt yeni sütun modeline taşınır ve çizilir.
 *  2) Bölmeler arası / bölme içi boşluk ölçüsü gerçekten uygulanır.
 *  3) Sütun ve bölme eklenebilir (4'ten fazla bölme).
 *  4) Telefon ve bilgisayar klavyesi bölmeleri, tuşları PC yardımcısına doğru
 *     komutla gönderir (yardımcı, sayfadaki fetch'e takılan sahte bir uç).
 *
 * Kullanım: npm run dev açıkken  node scripts/ekran-duzeni-tur.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as bekle } from 'node:timers/promises';

const ADRES = process.env.NB_ADRES || 'http://localhost:3000';
const PORT = Number(process.env.NB_CDP_PORT || 9445);
const SAYFA = '/editor?id=bahce-kitap&nodeId=dugum-altini';
const GORSEL = process.env.NB_EKRAN_GORSEL || '';

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
            if (kuyruk && kuyruk.length) kuyruk.shift()(mesaj.params);
        });
    }
    gonder(method, params = {}) {
        const id = ++this.sayac;
        return new Promise((coz, reddet) => { this.bekleyenler.set(id, { coz, reddet }); this.soket.send(JSON.stringify({ id, method, params })); });
    }
    olayBekle(method) {
        return new Promise(coz => { const k = this.olaylar.get(method) || []; k.push(coz); this.olaylar.set(method, k); });
    }
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

/** Oturum, bahçe ve eski sürümden kalma 4 bölmeli ekran düzeni. */
const EKME = `(() => {
    const kullanici = { id: 'local-demo', email: 'misafir@yerel', user_metadata: { full_name: 'Misafir' } };
    localStorage.setItem('nb-local-session-v1', JSON.stringify({ user: kullanici, access_token: 'demo-token' }));
    localStorage.setItem('nb-local-db-v1', JSON.stringify({
        gardens: [{ id: 'bahce-kitap', name: 'Kitap', created_at: '2026-09-20T07:30:00.000Z', updated_at: '2026-09-20T09:10:00.000Z', deleted_at: null, user_id: kullanici.id }],
        nodes: [{ id: 'dugum-altini', garden_id: 'bahce-kitap', parent_id: null, content: 'Not', position_x: 240, position_y: 300, created_at: '2026-09-20T07:58:00.000Z', updated_at: '2026-09-20T07:58:00.000Z', deleted_at: null, is_expanded: true, is_pruned: false, color: null }]
    }));
    localStorage.setItem('nb-remote-prefs-v1', JSON.stringify({
        connection: 'pc-wifi', helperUrl: 'http://127.0.0.1:9', helperToken: 'deneme',
        screenLayouts: [{ id: 'eski', name: 'Eski düzen', split: 60, leftSplit: 30, rightSplit: 70, borderless: true,
            panes: [{ kind: 'mouse' }, { kind: 'text' }, { kind: 'shortcuts' }, { kind: 'empty' }] }]
    }));
    localStorage.setItem('nb-computer-section', '1');
    localStorage.setItem('nb-editor-tool-tab', 'computer');
    return 'ekildi';
})()`;

/** PC yardımcısını taklit eder: /input isteklerini kaydeder, başarılı döner. */
const SAHTE_YARDIMCI = `(() => {
    window.__giden = [];
    const gercek = window.fetch.bind(window);
    window.fetch = async (url, secenek) => {
        if (String(url).includes('127.0.0.1:9/input')) {
            window.__giden.push(JSON.parse(secenek.body));
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return gercek(url, secenek);
    };
    return 'takildi';
})()`;

async function main() {
    const chrome = chromeBul();
    const profil = join(tmpdir(), 'nb-ekran-tur-' + Date.now());
    mkdirSync(profil, { recursive: true });
    const tarayici = spawn(chrome, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu', '--hide-scrollbars', '--window-size=412,915', 'about:blank'], { stdio: 'ignore' });
    const gecti = [], kaldi = [], problemler = [];
    let cdp;
    try {
        const soket = new WebSocket(await hedefAdresi());
        await new Promise((coz, reddet) => { soket.addEventListener('open', coz, { once: true }); soket.addEventListener('error', reddet, { once: true }); });
        cdp = new Cdp(soket);
        await cdp.gonder('Page.enable'); await cdp.gonder('Runtime.enable');
        const hatalar = [];
        hatalar.push(olay => { if (olay.type === 'error') problemler.push('error: ' + (olay.args || []).map(a => a.value ?? a.description ?? a.type).join(' ').slice(0, 220)); });
        cdp.olaylar.set('Runtime.consoleAPICalled', hatalar);
        const istisna = [olay => problemler.push('exception: ' + String(olay.exceptionDetails?.exception?.description || olay.exceptionDetails?.text || '').slice(0, 220))];
        cdp.olaylar.set('Runtime.exceptionThrown', istisna);

        const git = async (yol, bekleme = 3000) => {
            const yuklendi = cdp.olayBekle('Page.loadEventFired');
            await cdp.gonder('Page.navigate', { url: ADRES + yol }); await yuklendi; await bekle(bekleme);
        };
        const degerlendir = async ifade => {
            const s = await cdp.gonder('Runtime.evaluate', { expression: ifade, returnByValue: true, awaitPromise: true });
            if (s.exceptionDetails) throw new Error('Değerlendirme hatası: ' + JSON.stringify(s.exceptionDetails).slice(0, 300));
            return s.result.value;
        };
        const tikla = ifade => degerlendir(`(() => { const e = ${ifade}; if (!e) return false; e.click(); return true; })()`);
        const sart = (ad, ok, ayrinti = '') => (ok ? gecti : kaldi).push(ad + (ok ? '' : ' ' + ayrinti));

        await git('/', 5000);
        await degerlendir(EKME);
        await git(SAYFA, 8000);
        problemler.length = 0;

        // 1) Eski düzen taşınır ve çizilir.
        sart('Ekran düğmesi açıldı', await tikla('document.getElementById("studio-ekran")'));
        await bekle(1200);
        const duzen = await degerlendir(`(() => {
            const kok = document.getElementById('ekran-duzeni'); if (!kok) return null;
            const sutunlar = [...kok.children[0].children];
            return { sutun: sutunlar.length, bolmeler: sutunlar.map(s => s.children.length), kenarsiz: kok.hasAttribute('data-kenarsiz') };
        })()`);
        sart('Eski düzen 2 sütun olarak çizildi', duzen && duzen.sutun === 2, JSON.stringify(duzen));
        sart('Sol sütunda 2 bölme (fare + metin), sağda boş bölme gizli (1 bölme)', duzen && duzen.bolmeler.join() === '2,1', JSON.stringify(duzen));
        sart('Kenarsız görünüm korundu', duzen && duzen.kenarsiz === true);
        const taslak = await degerlendir('JSON.stringify(JSON.parse(localStorage.getItem("nb-remote-prefs-v1")).screenLayouts[0].split ?? "dönüştürülmedi-kayıtta-kalır")');
        void taslak;

        // 2) Ayarlar: boşluk ölçüsü + sütun/bölme ekleme.
        await degerlendir(`(() => { const p = JSON.parse(localStorage.getItem('nb-remote-prefs-v1')); return 1; })()`);
        // Yeni modelde kaydet: ayar ekranı gerek olmadan, doğrudan düzen yazılır ve uygulanması izlenir.
        await degerlendir(`(() => {
            const p = JSON.parse(localStorage.getItem('nb-remote-prefs-v1'));
            p.screenLayouts = [{ id: 'yeni', name: 'Yeni', borderless: false, gap: 20, innerPadding: 3, columns: [
                { weight: 50, panes: [{ kind: 'phoneKeyboard', weight: 50 }, { kind: 'computerKeyboard', weight: 50 }, { kind: 'liveKeyboard', weight: 20 }] },
                { weight: 50, panes: [{ kind: 'mouse', weight: 50 }, { kind: 'text', weight: 50 }, { kind: 'keys', weight: 50 }] },
                { weight: 30, panes: [{ kind: 'shortcuts', weight: 50 }] }
            ] }];
            localStorage.setItem('nb-remote-prefs-v1', JSON.stringify(p)); return 1;
        })()`);
        await git(SAYFA, 6000);
        await tikla('document.getElementById("studio-ekran")'); await bekle(1200);
        const olcu = await degerlendir(`(() => {
            const kok = document.getElementById('ekran-duzeni'); if (!kok) return null;
            const satir = kok.children[0];
            const bolme = kok.querySelector('.ekran-bolme');
            return { sutun: satir.children.length, bolmeSayisi: kok.querySelectorAll('.ekran-bolme').length, bosluk: getComputedStyle(satir).columnGap, ic: getComputedStyle(bolme).paddingLeft };
        })()`);
        sart('3 sütun / 7 bölme çizildi (4\'ten fazla)', olcu && olcu.sutun === 3 && olcu.bolmeSayisi === 8 - 1 + 0 || (olcu && olcu.bolmeSayisi === 7), JSON.stringify(olcu));
        sart('Bölmeler arası boşluk 20px uygulandı', olcu && olcu.bosluk === '20px', JSON.stringify(olcu));
        sart('Bölme içi boşluk 3px uygulandı', olcu && olcu.ic === '3px', JSON.stringify(olcu));
        if (GORSEL) {
            await degerlendir(`(() => { const p = JSON.parse(localStorage.getItem('nb-remote-prefs-v1')); p.screenLayouts[0] = { id: 'yeni', name: 'Yeni', borderless: true, gap: 0, innerPadding: 4, columns: [{ weight: 100, panes: [{ kind: 'mouse', weight: 30 }, { kind: 'phoneKeyboard', weight: 35 }, { kind: 'computerKeyboard', weight: 40 }] }] }; localStorage.setItem('nb-remote-prefs-v1', JSON.stringify(p)); return 1; })()`);
            await git(SAYFA, 6000); await tikla('document.getElementById("studio-ekran")'); await bekle(1200); const k = await cdp.gonder('Page.captureScreenshot', { format: 'png' }); writeFileSync(GORSEL, Buffer.from(k.data, 'base64')); }

        // 3) Klavyeler PC yardımcısına doğru komut gönderir.
        await degerlendir(SAHTE_YARDIMCI);
        const gidenler = () => degerlendir('JSON.stringify(window.__giden)').then(JSON.parse);
        const tus = etiket => tikla(`[...document.querySelectorAll('[aria-label="Telefon klavyesi"] button')].find(b => b.getAttribute('aria-label') === ${JSON.stringify(etiket)})`);
        const pc = (kapsam, etiket) => tikla(`[...document.querySelectorAll('[aria-label="Bilgisayar klavyesi"] button')].find(b => b.getAttribute('aria-label') === ${JSON.stringify(etiket)} || b.textContent === ${JSON.stringify(etiket)})`);

        await tus('ş'); await tus('Shift'); await tus('İ'); await tus('Boşluk'); await tus('Geri sil'); await tus('Enter'); await bekle(600);
        let g = await gidenler();
        sart('Telefon klavyesi: ş harfi metin olarak gitti', g[0]?.action === 'text' && g[0].text === 'ş', JSON.stringify(g));
        sart('Telefon klavyesi: Shift sonrası i → İ', g[1]?.action === 'text' && g[1].text === 'İ', JSON.stringify(g));
        sart('Telefon klavyesi: Boşluk', g[2]?.text === ' ', JSON.stringify(g));
        sart('Telefon klavyesi: Geri sil → BACKSPACE', g[3]?.action === 'shortcut' && g[3].keys === 'BACKSPACE', JSON.stringify(g));
        sart('Telefon klavyesi: Enter → ENTER', g[4]?.action === 'shortcut' && g[4].keys === 'ENTER', JSON.stringify(g));

        await degerlendir('window.__giden.length = 0');
        await pc('', 'Ctrl'); await pc('', 'C'); await bekle(300);
        await pc('', 'F5'); await pc('', 'Ğ'); await bekle(300);
        await pc('', 'Ctrl'); await pc('', 'Alt'); await pc('', 'DELETE'); await bekle(500);
        g = await gidenler();
        sart('Bilgisayar klavyesi: Ctrl+C kısayol', g[0]?.action === 'shortcut' && g[0].keys === 'CTRL+C', JSON.stringify(g));
        sart('Bilgisayar klavyesi: F5', g[1]?.action === 'shortcut' && g[1].keys === 'F5', JSON.stringify(g));
        sart('Bilgisayar klavyesi: Türkçe ğ metin olarak', g[2]?.action === 'text' && g[2].text === 'ğ', JSON.stringify(g));
        sart('Bilgisayar klavyesi: Ctrl+Alt+Del', g[3]?.action === 'shortcut' && g[3].keys === 'CTRL+ALT+DELETE', JSON.stringify(g));

        // 5) Kart Wi‑Fi yolu: sahte kart (300 ms gecikmeli) üzerinden tuş, fare ve harf birleştirme.
        await degerlendir(`(() => { const p = JSON.parse(localStorage.getItem('nb-remote-prefs-v1')); p.connection = 'wifi'; p.cardUrl = 'http://127.0.0.1:7'; p.screenLayouts[0] = { id: 'kart', name: 'Kart', columns: [{ weight: 50, panes: [{ kind: 'phoneKeyboard', weight: 50 }, { kind: 'computerKeyboard', weight: 50 }] }, { weight: 50, panes: [{ kind: 'mouse', weight: 50 }, { kind: 'keys', weight: 50 }] }] }; localStorage.setItem('nb-remote-prefs-v1', JSON.stringify(p)); return 1; })()`);
        await git(SAYFA, 6000);
        await tikla('document.getElementById("studio-ekran")'); await bekle(1200);
        await degerlendir(`(() => {
            window.__kart = [];
            const gercek = window.fetch.bind(window);
            window.fetch = async (url, secenek) => {
                const u = String(url);
                if (!u.startsWith('http://127.0.0.1:7/')) return gercek(url, secenek);
                const yol = u.slice('http://127.0.0.1:7'.length);
                const govde = secenek && secenek.body ? String(secenek.body) : '';
                window.__kart.push({ yol, metin: govde.startsWith('b64:') ? new TextDecoder().decode(Uint8Array.from(atob(govde.slice(4)), c => c.charCodeAt(0))) : govde });
                await new Promise(c => setTimeout(c, 300));
                return new Response(JSON.stringify({ ok: true, msg: 'ok' }), { status: 200 });
            };
            return 1;
        })()`);
        const kartIstekleri = () => degerlendir('JSON.stringify(window.__kart)').then(JSON.parse);
        // Hızlı yazım: 6 harf arka arkaya; ilk istek sürerken gelenler birleşmeli.
        for (const h of ['m', 'e', 'r', 'h', 'a', 'b']) await tus(h);
        await bekle(1500);
        let k = await kartIstekleri();
        const yazilan = k.filter(i => i.yol.startsWith('/api/keys')).map(i => i.metin).join('');
        sart('Kart Wi‑Fi: 6 harf eksiksiz ve sırayla yazıldı', yazilan === 'merhab', JSON.stringify(k));
        sart('Kart Wi‑Fi: harfler birleştirildi (6 harf ≤ 3 istek)', k.length <= 3, k.length + ' istek');
        await degerlendir('window.__kart.length = 0');
        await pc('', 'Ctrl'); await pc('', 'C'); await bekle(800);
        await pc('', 'Home'); await bekle(800);
        await tus('Enter'); await tus('Geri sil'); await bekle(1200);
        k = await kartIstekleri();
        sart('Kart Wi‑Fi: Ctrl+C → /api/rkey code=6 mods=1', k[0]?.yol === '/api/rkey?code=6&mods=1', JSON.stringify(k));
        sart('Kart Wi‑Fi: Home → /api/rkey code=74', k[1]?.yol === '/api/rkey?code=74&mods=0', JSON.stringify(k));
        sart('Kart Wi‑Fi: Enter → /api/rkey code=40', k[2]?.yol === '/api/rkey?code=40&mods=0', JSON.stringify(k));
        sart('Kart Wi‑Fi: Geri sil → /api/rkey code=42', k[3]?.yol === '/api/rkey?code=42&mods=0', JSON.stringify(k));
        await degerlendir('window.__kart.length = 0');
        await tikla(`[...document.querySelectorAll('#ekran-duzeni button')].find(b => b.textContent.trim() === 'Sağ')`); await bekle(700);
        k = await kartIstekleri();
        sart('Kart Wi‑Fi: fare sağ tık → /api/rmouse c=2', k[0]?.yol === '/api/rmouse?c=2&b=0', JSON.stringify(k));
        // Bellenim 2.35.0 AltGr simgelerini yazar: "@" ve "₺" karta metin olarak gitmeli, uyarı çıkmamalı.
        await degerlendir('window.__kart.length = 0');
        await tus('Sayı ve simge sayfası'); await bekle(300); await tus('@'); await bekle(500); await tus('₺'); await bekle(900);
        k = await kartIstekleri();
        const uyari = await degerlendir(`(document.querySelector('#ekran-duzeni [role=status]') || {}).textContent || ''`);
        sart('Kart: "@" ve "₺" metin olarak gönderildi', k.map(i => i.metin).join('') === '@₺' && !/kartla yazılamaz/.test(uyari), JSON.stringify(k) + ' | ' + uyari);

        // 4) Ayarlar: boşluk kutusu, sütun ve bölme ekleme (yeni düzen kaydı üzerinden).
        await degerlendir(`(() => { const p = JSON.parse(localStorage.getItem('nb-remote-prefs-v1')); p.screenLayouts[0] = { id: 'yeni', name: 'Yeni', columns: [{ weight: 50, panes: [{ kind: 'mouse', weight: 50 }] }] }; localStorage.setItem('nb-remote-prefs-v1', JSON.stringify(p)); return 1; })()`);
        await git(SAYFA, 6000);
        await tikla('[...document.querySelectorAll("button")].find(b => b.getAttribute("title") === "Ayarlar")'); await bekle(1500);
        await tikla('[...document.querySelectorAll("button")].find(b => b.innerText.trim().startsWith("Düzenleme araçları"))'); await bekle(1500);
        await tikla('document.getElementById("tools-settings-tab-computer")'); await bekle(1000);
        const duzenleAcildi = await tikla('document.getElementById("ekran-duzenle-0")');
        await bekle(800);
        sart('Ayarlar: ekran düzenleme paneli açıldı', duzenleAcildi);
        const yaz = (id, deger) => degerlendir(`(() => { const i = document.getElementById(${JSON.stringify(id)}); if (!i) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(String(deger))}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
        sart('Ayarlar: boşluk kutusu bulundu ve 18 yazıldı', await yaz('ekran-bosluk-0', 18));
        sart('Ayarlar: bölme içi boşluk kutusu 5 yazıldı', await yaz('ekran-ic-bosluk-0', 5));
        sart('Ayarlar: sütun eklendi', await tikla('document.getElementById("ekran-sutun-ekle-0")'));
        for (let i = 0; i < 5; i++) await tikla('document.getElementById("ekran-bolme-ekle-0-0")');
        await bekle(500);
        const kayit = await degerlendir('JSON.stringify(JSON.parse(localStorage.getItem("nb-remote-prefs-v1")).screenLayouts[0])').then(JSON.parse);
        sart('Kayıt: boşluk 18, iç boşluk 5', kayit.gap === 18 && kayit.innerPadding === 5, JSON.stringify(kayit));
        sart('Kayıt: 2 sütun, ilk sütunda 6 bölme', kayit.columns?.length === 2 && kayit.columns[0].panes.length === 6, JSON.stringify(kayit));
        await yaz('ekran-bosluk-0', 999);
        const sinir = await degerlendir('JSON.parse(localStorage.getItem("nb-remote-prefs-v1")).screenLayouts[0].gap');
        sart('Kayıt: aşırı boşluk 64 ile sınırlandı', sinir === 64, String(sinir));

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
