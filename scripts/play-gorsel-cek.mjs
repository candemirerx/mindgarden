/**
 * Play Store ekran görüntülerini yeniden üretir.
 *
 * Neden gerekli: Play Console, telefon ekran görüntülerinde uzun kenarın kısa
 * kenarın en fazla iki katı olmasını şart koşar. Elimizdeki 430x932 kareler
 * bu sınırı aşıyordu (2,17:1). Bu betik uygulamayı 540x1080 CSS pikselinde
 * (2:1) açar ve 2x yoğunlukla 1080x2160 PNG üretir.
 *
 * Kullanım:
 *   1) Uygulama çalışıyor olmalı:  npm run dev
 *   2) node scripts/play-gorsel-cek.mjs
 *
 * Çıktı: store/ ve play-store-paketi/gorseller/ klasörlerine aynı üç kare.
 * Veriler tarayıcının localStorage'ına ekilir; gerçek verilerinize dokunulmaz.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as bekle } from 'node:timers/promises';

const KOK = resolve(import.meta.dirname, '..');
const ADRES = process.env.NB_ADRES || 'http://localhost:3000';
const PORT = Number(process.env.NB_CDP_PORT || 9333);

/** Chrome kurulumunu bulur; CHROME_BIN ile geçersiz kılınabilir. */
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

/** Örnek veri: üç bahçe, Kitap Notları'nın içinde iki ağaç ve bir yaprak. */
const ORNEK_VERI = {
    kullanici: {
        id: 'local-demo',
        email: 'misafir@yerel',
        user_metadata: { full_name: 'Misafir Bahçıvan', avatar_url: null }
    },
    bahceler: [
        ['bahce-kitap', 'Kitap Notları', '2026-09-20T07:30:00.000Z', '2026-09-20T09:10:00.000Z'],
        ['bahce-proje', 'Proje Fikirleri', '2026-09-20T06:05:00.000Z', '2026-09-20T08:40:00.000Z'],
        ['bahce-gunluk', 'Günlük', '2026-09-19T17:20:00.000Z', '2026-09-19T21:15:00.000Z']
    ],
    dugumler: [
        ['dugum-sapiens', 'bahce-kitap', null, 'Sapiens', 0, 0, '2026-09-20T07:35:00.000Z'],
        ['dugum-simyaci', 'bahce-kitap', null, 'Simyacı — Paulo Coelho', 0, 260, '2026-09-20T07:50:00.000Z'],
        [
            'dugum-altini',
            'bahce-kitap',
            'dugum-simyaci',
            'Altını çizdiğim satırlar\n\nBir şeyi gerçekten istersen, tüm evren onu elde etmen için el birliği eder.',
            240,
            300,
            '2026-09-20T07:58:00.000Z'
        ]
    ]
};

/** Bilgisayar araçları: makrolar, iki profil ve iki sütunlu bir ekran düzeni. */
const makro = (id, name, type, value, ek = {}) => ({ id, name, type, value, enabled: true, ...ek });
const ORNEK_BILGISAYAR = {
    connection: 'pc-bluetooth',
    macros: [
        makro('m-kaydet', 'Kaydet', 'shortcut', 'CTRL+S'),
        makro('m-kopyala', 'Kopyala', 'shortcut', 'CTRL+C'),
        makro('m-yapistir', 'Yapıştır', 'shortcut', 'CTRL+V'),
        makro('m-geri', 'Geri al', 'shortcut', 'CTRL+Z'),
        makro('m-masaustu', 'Masaüstü', 'shortcut', 'WIN+D'),
        makro('m-imza', 'E-posta imzası', 'text', 'Saygılarımla,\nAd Soyad'),
        makro('m-rapor', 'Haftalık rapor', 'sequence', '3 adım', {
            steps: [{ type: 'shortcut', value: 'CTRL+N' }, { type: 'wait', value: '1000' }, { type: 'text', value: 'Haftalık rapor' }],
            calisma: 'sayili', tekrar: 3
        }),
        makro('m-kaydir', 'Sayfayı kaydır', 'sequence', '2 adım', {
            steps: [{ type: 'shortcut', value: 'PAGEDOWN' }, { type: 'wait', value: '2000' }],
            calisma: 'anahtar'
        })
    ],
    profiles: [
        { id: 'p-ofis', name: 'Ofis', macroIds: ['m-kaydet', 'm-kopyala', 'm-yapistir', 'm-geri', 'm-imza', 'm-rapor'] },
        { id: 'p-okuma', name: 'Okuma', macroIds: ['m-kaydir', 'm-masaustu'] }
    ],
    shortcutButtons: [],
    screenLayouts: [{
        id: 'ekran-masa', name: 'Masa',
        columns: [
            { weight: 55, panes: [{ kind: 'mouse', weight: 60 }, { kind: 'keys', weight: 40 }] },
            { weight: 45, panes: [{ kind: 'shortcuts', weight: 55, profileId: 'p-ofis' }, { kind: 'text', weight: 45 }] }
        ]
    }]
};

function ekmeBetigi() {
    const kullanici = ORNEK_VERI.kullanici;
    const bahceler = ORNEK_VERI.bahceler.map(([id, name, created_at, updated_at]) => ({
        id,
        name,
        created_at,
        updated_at,
        deleted_at: null,
        user_id: kullanici.id
    }));
    const dugumler = ORNEK_VERI.dugumler.map(([id, garden_id, parent_id, content, position_x, position_y, created_at]) => ({
        id,
        garden_id,
        parent_id,
        content,
        position_x,
        position_y,
        created_at,
        updated_at: created_at,
        deleted_at: null,
        is_expanded: true,
        is_pruned: false,
        color: null
    }));
    return [
        'localStorage.setItem("nb-local-session-v1", ' + JSON.stringify(JSON.stringify({ user: kullanici, access_token: 'demo-token' })) + ');',
        'localStorage.setItem("nb-local-db-v1", ' + JSON.stringify(JSON.stringify({ gardens: bahceler, nodes: dugumler })) + ');',
        'localStorage.setItem("nb-ai-section", "1");',
        'localStorage.setItem("nb-tools-section", "1");',
        // Örnek anahtar: yapay zekâ makroları çekimde etkin görünsün diye.
        'localStorage.setItem("nb-ai-provider", "gemini");',
        'localStorage.setItem("nb-ai-key-gemini", "AIzaSyOrnek-Anahtar-Cekim-Icin");',
        'localStorage.setItem("nb-ai-model-gemini", "gemini-2.5-flash");',
        // Bilgisayar araçları kareleri için örnek makrolar, profiller ve ekran düzeni.
        'localStorage.setItem("nb-computer-section", "1");',
        'localStorage.setItem("nb-remote-prefs-v1", ' + JSON.stringify(JSON.stringify(ORNEK_BILGISAYAR)) + ');',
        '"ekildi"'
    ].join('\n');
}

async function main() {
    const chrome = chromeBul();
    const profil = join(tmpdir(), 'nb-gorsel-' + Date.now());
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
            '--force-device-scale-factor=1',
            '--window-size=540,1080',
            'about:blank'
        ],
        { stdio: 'ignore' }
    );

    let cdp;
    try {
        const hedef = await hedefAdresi();
        const soket = new WebSocket(hedef);
        await new Promise((coz, reddet) => {
            soket.addEventListener('open', coz, { once: true });
            soket.addEventListener('error', reddet, { once: true });
        });
        cdp = new Cdp(soket);

        await cdp.gonder('Page.enable');
        await cdp.gonder('Runtime.enable');
        await cdp.gonder('Emulation.setDeviceMetricsOverride', {
            width: 540,
            height: 1080,
            deviceScaleFactor: 2,
            mobile: false
        });

        const git = async (yol, bekleme = 3200) => {
            const yuklendi = cdp.olayBekle('Page.loadEventFired');
            await cdp.gonder('Page.navigate', { url: ADRES + yol });
            await yuklendi;
            await bekle(bekleme);
        };

        /** Geliştirme modu göstergesini (nextjs-portal) karelerden gizler. */
        const gostergeyiGizle = () =>
            cdp.gonder('Runtime.evaluate', {
                expression:
                    '(()=>{if(document.getElementById("nb-cekim-gizle"))return 1;' +
                    'const stil=document.createElement("style");stil.id="nb-cekim-gizle";' +
                    'stil.textContent="nextjs-portal{display:none !important}";' +
                    'document.head.appendChild(stil);return 1})()',
                returnByValue: true
            });

        const cek = async (yollar, hazirla) => {
            if (hazirla) await hazirla();
            await gostergeyiGizle();
            await bekle(400);
            const sonuc = await cdp.gonder('Page.captureScreenshot', { format: 'png', fromSurface: true });
            for (const yol of yollar) {
                const tam = join(KOK, yol);
                mkdirSync(resolve(tam, '..'), { recursive: true });
                writeFileSync(tam, Buffer.from(sonuc.data, 'base64'));
            }
            console.log('  ✓ ' + yollar.join(', '));
        };

        console.log('Uygulama açılıyor: ' + ADRES);
        await git('/', 6000);

        console.log('Örnek veri ekiliyor');
        await cdp.gonder('Runtime.evaluate', { expression: ekmeBetigi(), returnByValue: true });

        // Dev sunucusu sayfaları ilk istekte derler; önce ısıtıp sonra çekiyoruz.
        console.log('Sayfalar ısıtılıyor');
        await git('/projeler?id=bahce-kitap', 7000);
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 8000);

        console.log('Ekran görüntüleri alınıyor');
        await git('/', 5000);
        await cek(['store/screenshot-1-ana-sayfa.png', 'play-store-paketi/gorseller/ekran-1-ana-sayfa.png']);
        await git('/projeler?id=bahce-kitap', 5000);
        await cek(['store/screenshot-2-projeler.png', 'play-store-paketi/gorseller/ekran-2-projeler.png']);
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 6000);
        await cek(['store/screenshot-3-editor.png', 'play-store-paketi/gorseller/ekran-3-editor.png']);

        // Ayarlar penceresi: yenilenen sekme düzenini gösterir.
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 5000);
        await cek(['store/screenshot-4-ayarlar.png', 'play-store-paketi/gorseller/ekran-4-ayarlar.png'], async () => {
            await cdp.gonder('Runtime.evaluate', {
                expression:
                    '(()=>{const dugme=[...document.querySelectorAll("button")]' +
                    '.find((b)=>b.getAttribute("title")==="Ayarlar");if(dugme)dugme.click();return Boolean(dugme)})()',
                returnByValue: true
            });
            await bekle(1600);
        });

        const calistir = (ifade) => cdp.gonder('Runtime.evaluate', { expression: ifade, returnByValue: true, awaitPromise: true });
        const tikla = (secici) => calistir('(()=>{const e=' + secici + ';if(e)e.click();return Boolean(e)})()');

        // Bilgisayar araçları: bölmeli ekran düzeni.
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 5000);
        await cek(['store/screenshot-5-ekran-duzeni.png', 'play-store-paketi/gorseller/ekran-5-ekran-duzeni.png'], async () => {
            await tikla('document.getElementById("studio-tab-computer")');
            await bekle(600);
            await tikla('document.getElementById("studio-ekran")');
            await bekle(1500);
        });

        // Kısayol panosu: Ofis profili.
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 5000);
        await cek(['store/screenshot-6-kisayollar.png', 'play-store-paketi/gorseller/ekran-6-kisayollar.png'], async () => {
            await tikla('document.getElementById("studio-tab-computer")');
            await bekle(600);
            await tikla('document.getElementById("studio-kisayollar")');
            await bekle(800);
            await tikla('[...document.querySelectorAll(\'[aria-label="Kısayol profilleri"] button\')].find((b)=>b.innerText==="Ofis")');
            await bekle(800);
        });

        // Seviyeli kullanım kılavuzu: İleri seviye, bir ders açık.
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 5000);
        await cek(['store/screenshot-7-kilavuz.png', 'play-store-paketi/gorseller/ekran-7-kilavuz.png'], async () => {
            await tikla('[...document.querySelectorAll("button")].find((b)=>b.getAttribute("title")==="Ayarlar")');
            await bekle(1500);
            await tikla('[...document.querySelectorAll("button")].find((b)=>b.innerText.trim().startsWith("Kullanım kılavuzu"))');
            await bekle(1200);
            await tikla('document.getElementById("kilavuz-seviye-ileri")');
            await bekle(500);
            await tikla('[...document.querySelectorAll("[aria-expanded]")].find((b)=>b.innerText.includes("Size uygun bağlantıyı"))');
            await bekle(800);
        });

        console.log('Bitti.');
    } finally {
        try {
            cdp?.soket.close();
        } catch {
            // yoksay
        }
        tarayici.kill();
        await bekle(600);
        try {
            rmSync(profil, { recursive: true, force: true });
        } catch {
            // Geçici profil silinemezse sorun değil.
        }
    }
}

main().catch((hata) => {
    console.error('Hata: ' + hata.message);
    process.exitCode = 1;
});

