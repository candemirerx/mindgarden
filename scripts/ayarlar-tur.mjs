/**
 * Ayarlar arayüzü duman testi.
 *
 * Neden gerekli: Ayarlar penceresi yeni bir giriş ekranı ve dokuz alt bölüme
 * ayrıldı. Bu betik her bölümü tek tek açar, başlığın gerçekten çizildiğini
 * doğrular, arama süzgecini ve geri dönüşü denetler; bu sırada oluşan konsol
 * hatası/uyarısı ile yakalanmayan istisnaları toplar.
 *
 * Kullanım:
 *   1) Uygulama çalışıyor olmalı:  npm run dev
 *   2) node scripts/ayarlar-tur.mjs
 *
 * Çıktı: her bölüm için geçti/kaldı satırı ve sonda özet. Hata varsa çıkış
 * kodu 1 olur.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as bekle } from 'node:timers/promises';

const ADRES = process.env.NB_ADRES || 'http://localhost:3000';
const PORT = Number(process.env.NB_CDP_PORT || 9444);
const SAYFA = '/editor?id=bahce-kitap&nodeId=dugum-altini';
/** Verilirse, adı geçen bölüm açıkken bu dosyaya ekran görüntüsü yazılır. */
const GORSEL_BOLUM = process.env.NB_TUR_BOLUM || '';
const GORSEL_YOL = process.env.NB_TUR_GORSEL || '';

const BOLUMLER = [
    ['Kullanım kılavuzu', 'Kullanım kılavuzu'],
    ['Hesap ve giriş', 'Hesap ve giriş'],
    ['Yapay zekâ', 'Yapay Zekâ'],
    ['AI makroları', 'Makro'],
    ['Düzenleme araçları', 'Araç'],
    ['Bilgisayar bağlantısı', 'Bilgisayar'],
    ['Yedekleme ve senkronizasyon', 'Yedekleme ve senkronizasyon'],
    ['Veri yönetimi', 'Veri Yönetimi'],
    ['Uygulama hakkında', 'Hakkında']
];

function chromeBul() {
    const adaylar = [
        process.env.CHROME_BIN,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ].filter(Boolean);
    for (const aday of adaylar) if (existsSync(aday)) return aday;
    throw new Error('Chrome/Edge bulunamadı. CHROME_BIN ortam değişkenini ayarlayın.');
}

class Cdp {
    constructor(soket) {
        this.soket = soket;
        this.sayac = 0;
        this.bekleyenler = new Map();
        this.olaylar = new Map();
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
        return new Promise((coz) => {
            const kuyruk = this.olaylar.get(method) || [];
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
            const sayfa = liste.find((hedef) => hedef.type === 'page' && hedef.webSocketDebuggerUrl);
            if (sayfa) return sayfa.webSocketDebuggerUrl;
        } catch {
            // Tarayıcı henüz açılmadı.
        }
        await bekle(250);
    }
    throw new Error('Tarayıcının hata ayıklama kapısı açılmadı.');
}

/** Örnek veri: betiğin açacağı editör sayfası için en küçük oturum + bahçe. */
function ekmeBetigi() {
    const kullanici = { id: 'local-demo', email: 'misafir@yerel', user_metadata: { full_name: 'Misafir Bahçıvan' } };
    const bahce = {
        id: 'bahce-kitap',
        name: 'Kitap Notları',
        created_at: '2026-09-20T07:30:00.000Z',
        updated_at: '2026-09-20T09:10:00.000Z',
        deleted_at: null,
        user_id: kullanici.id
    };
    const dugum = {
        id: 'dugum-altini',
        garden_id: 'bahce-kitap',
        parent_id: null,
        content: 'Altını çizdiğim satırlar',
        position_x: 240,
        position_y: 300,
        created_at: '2026-09-20T07:58:00.000Z',
        updated_at: '2026-09-20T07:58:00.000Z',
        deleted_at: null,
        is_expanded: true,
        is_pruned: false,
        color: null
    };
    return [
        'localStorage.setItem("nb-local-session-v1", ' + JSON.stringify(JSON.stringify({ user: kullanici, access_token: 'demo-token' })) + ');',
        'localStorage.setItem("nb-local-db-v1", ' + JSON.stringify(JSON.stringify({ gardens: [bahce], nodes: [dugum] })) + ');',
        '"ekildi"'
    ].join('\n');
}

async function main() {
    const chrome = chromeBul();
    const profil = join(tmpdir(), 'nb-ayar-tur-' + Date.now());
    mkdirSync(profil, { recursive: true });

    const tarayici = spawn(
        chrome,
        [
            '--headless=new',
            '--remote-debugging-port=' + PORT,
            '--user-data-dir=' + profil,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-extensions',
            '--disable-gpu',
            '--hide-scrollbars',
            '--window-size=412,915',
            'about:blank'
        ],
        { stdio: 'ignore' }
    );

    const problemler = [];
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

        /** Konsol ve istisna kayıtlarını toplar. */
        const dinle = () => {
            const kuyruk = cdp.olaylar.get('Runtime.consoleAPICalled') || [];
            kuyruk.push((olay) => {
                if (olay.type !== 'error' && olay.type !== 'warning') return;
                const metin = (olay.args || []).map((arg) => arg.value ?? arg.description ?? arg.type).join(' ');
                if (!metin) return;
                if (/Download the React DevTools|Fast Refresh|baseline-browser-mapping|browserslist/i.test(metin)) return;
                problemler.push(olay.type + ': ' + metin.slice(0, 220));
            });
            cdp.olaylar.set('Runtime.consoleAPICalled', kuyruk);

            const istisnalar = cdp.olaylar.get('Runtime.exceptionThrown') || [];
            istisnalar.push((olay) => {
                const ayrinti = olay.exceptionDetails || {};
                problemler.push('exception: ' + String(ayrinti.exception?.description || ayrinti.text || '').slice(0, 220));
            });
            cdp.olaylar.set('Runtime.exceptionThrown', istisnalar);

            const kayitlar = cdp.olaylar.get('Log.entryAdded') || [];
            kayitlar.push((olay) => {
                const giris = olay.entry || {};
                if (giris.level !== 'error') return;
                problemler.push('log: ' + String(giris.text || '').slice(0, 220));
            });
            cdp.olaylar.set('Log.entryAdded', kayitlar);
        };
        dinle();

        const git = async (yol, bekleme = 3000) => {
            const yuklendi = cdp.olayBekle('Page.loadEventFired');
            await cdp.gonder('Page.navigate', { url: ADRES + yol });
            await yuklendi;
            await bekle(bekleme);
        };

        const degerlendir = async (ifade) => {
            const sonuc = await cdp.gonder('Runtime.evaluate', { expression: ifade, returnByValue: true, awaitPromise: true });
            if (sonuc.exceptionDetails) throw new Error('Değerlendirme hatası: ' + JSON.stringify(sonuc.exceptionDetails).slice(0, 200));
            return sonuc.result.value;
        };

        console.log('Uygulama açılıyor: ' + ADRES);
        await git('/', 6000);
        await degerlendir(ekmeBetigi());

        // Dev sunucusu sayfaları ilk istekte derler; editörü ısıtıyoruz.
        await git(SAYFA, 8000);
        problemler.length = 0;

        const ayarlariAc = async () => {
            const acildi = await degerlendir(
                '(() => { const d = [...document.querySelectorAll("button")].find((b) => b.getAttribute("title") === "Ayarlar"); if (!d) return false; d.click(); return true; })()'
            );
            if (!acildi) throw new Error('Ayarlar düğmesi bulunamadı.');
            await bekle(1500);
        };

        const anaEkranMi = async () =>
            degerlendir('(() => { const g = document.querySelector("input[type=search]"); return Boolean(g && document.body.innerText.includes("Ayarlarda ara")); })()');

        const bolumAc = async (baslik) =>
            degerlendir(
                '(() => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim().startsWith(' +
                    JSON.stringify(baslik) +
                    ')); if (!b) return false; b.click(); return true; })()'
            );

        const geriDon = async () => {
            const dondu = await degerlendir(
                '(() => { const b = document.querySelector("button[aria-label=\'Tüm ayarlara dön\']"); if (!b) return false; b.click(); return true; })()'
            );
            await bekle(700);
            return dondu;
        };

        const basliklar = () =>
            degerlendir('(() => [...document.querySelectorAll("h3,h4")].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 6))()');

        await ayarlariAc();
        const gecti = [];
        const kaldi = [];
        if (await anaEkranMi()) gecti.push('Ayarlar giriş ekranı açıldı');
        else kaldi.push('Ayarlar giriş ekranı açılmadı');

        // Arama süzgeci: "yedek" iki bölümden azını bırakmalı.
        await degerlendir(
            '(() => { const g = document.querySelector("input[type=search]"); const ayarlayici = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; ayarlayici.call(g, "yedek"); g.dispatchEvent(new Event("input", { bubbles: true })); return true; })()'
        );
        await bekle(600);
        const suzulmus = await degerlendir('(() => [...document.querySelectorAll("button")].filter((b) => /Yedekleme ve senkronizasyon|Veri yönetimi/.test(b.innerText)).length)()');
        if (suzulmus === 2) gecti.push('Arama süzgeci "yedek" için 2 bölüm buldu');
        else kaldi.push('Arama süzgeci beklenen sonucu vermedi (bulunan: ' + suzulmus + ')');
        await degerlendir(
            '(() => { const g = document.querySelector("input[type=search]"); const ayarlayici = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; ayarlayici.call(g, ""); g.dispatchEvent(new Event("input", { bubbles: true })); return true; })()'
        );
        await bekle(500);

        for (const [baslik, beklenen] of BOLUMLER) {
            const acildi = await bolumAc(baslik);
            if (!acildi) {
                kaldi.push(baslik + ': bölüm düğmesi bulunamadı');
                continue;
            }
            await bekle(1300);
            const metinler = await basliklar();
            if (GORSEL_YOL && GORSEL_BOLUM && baslik === GORSEL_BOLUM) {
                const kare = await cdp.gonder('Page.captureScreenshot', { format: 'png', fromSurface: true });
                writeFileSync(GORSEL_YOL, Buffer.from(kare.data, 'base64'));
                console.log('  · ekran görüntüsü: ' + GORSEL_YOL);
            }
            const uygun = metinler.some((metin) => metin.toLocaleLowerCase('tr-TR').includes(beklenen.toLocaleLowerCase('tr-TR')));
            if (uygun) gecti.push(baslik + ' → ' + (metinler[0] || '?'));
            else kaldi.push(baslik + ': başlık bulunamadı (görülen: ' + metinler.join(' | ') + ')');
            const dondu = await geriDon();
            if (!dondu) kaldi.push(baslik + ': geri düğmesi bulunamadı');
        }

        console.log('');
        for (const satir of gecti) console.log('  ✓ ' + satir);
        for (const satir of kaldi) console.log('  ✗ ' + satir);
        console.log('');
        if (problemler.length === 0) console.log('Konsol: hata/uyarı yok.');
        else {
            console.log('Konsol kayıtları (' + problemler.length + '):');
            for (const satir of [...new Set(problemler)].slice(0, 15)) console.log('  ! ' + satir);
        }
        console.log('');
        console.log('Özet: ' + gecti.length + ' geçti, ' + kaldi.length + ' kaldı.');
        if (kaldi.length > 0 || problemler.length > 0) process.exitCode = 1;
    } finally {
        try {
            cdp?.soket.close();
        } catch {
            // yoksay
        }
        tarayici.kill();
        await bekle(500);
        try {
            rmSync(profil, { recursive: true, force: true });
        } catch {
            // yoksay
        }
    }
}

main().catch((hata) => {
    console.error('Hata: ' + hata.message);
    process.exitCode = 1;
});
