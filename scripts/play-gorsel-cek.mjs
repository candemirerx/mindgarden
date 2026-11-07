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
 * Çıktı: store/ ve play-store-paketi/gorseller/ klasörlerine aynı sekiz kare
 * (Play telefon için en çok 8 kare kabul eder).
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
        ],
        // Tuval ve YZ ağacı kareleri için: lansman planı ve içinde bir yapay zekâ ağacı.
        ['dugum-lansman', 'bahce-proje', null, 'Uygulama Lansmanı\n\nMağaza sayfası, kampanya ve destek hazırlığı.', 0, 0, '2026-09-20T06:10:00.000Z'],
        ['dugum-kitle', 'bahce-proje', 'dugum-lansman', 'Hedef kitle\n\nÖğrenciler, yazarlar ve proje yöneticileri.', 0, 0, '2026-09-20T06:12:00.000Z'],
        ['dugum-asistan', 'bahce-proje', 'dugum-lansman', 'Lansman Asistanı', 0, 0, '2026-09-20T06:14:00.000Z'],
        ['dugum-takvim', 'bahce-proje', 'dugum-lansman', 'Kampanya takvimi\n\n1. hafta duyuru, 2. hafta tanıtım videosu.', 0, 0, '2026-09-20T06:16:00.000Z']
    ]
};

/** YZ ağacı: talimat, belgeler ve örnek bir sohbet. */
const YZ_AGACLARI = {
    'dugum-asistan': {
        talimat: 'Lansman planına yardım eden bir pazarlama danışmanısın. Kısa, uygulanabilir öneriler ver.',
        yalnizBelge: false, uzunluk: 'orta', olusturma: 1789900000000, guncelleme: 1789900000000, simge: 'ampul',
        belgeler: [
            { id: 'b1', ad: 'Lansman planı.pdf', karakter: 18420, eklenme: 1789900000000 },
            { id: 'b2', ad: 'Rakip analizi.docx', karakter: 9310, eklenme: 1789900000000 }
        ]
    }
};
const YZ_SOHBET = [
    { rol: 'kullanici', metin: 'İlk hafta için üç duyuru fikri verir misin?', zaman: 1789900100000 },
    { rol: 'asistan', metin: '1. Kısa bir tanıtım videosu: notların ağaç gibi büyümesini 15 saniyede gösterin.\n2. "Bahçeni kur" meydan okuması: kullanıcılar ilk ağaçlarını paylaşsın.\n3. Öğrencilere özel ders notu şablonları.', zaman: 1789900105000, kaynaklar: ['Lansman planı.pdf'] },
    { rol: 'kullanici', metin: 'Videoyu hangi gün yayınlayalım?', zaman: 1789900200000 },
    { rol: 'asistan', metin: 'Plana göre salı sabahı en uygunu; ilgi hafta başında yüksek. Aynı gün mağaza sayfasını da güncelleyin.', zaman: 1789900206000, kaynaklar: ['Lansman planı.pdf', 'Rakip analizi.docx'] }
];
/** Geri dönüşüm kutusu karesi: çöpe atılmış iki kayıt. */
const satir = (id, garden_id, parent_id, content) => ({ id, garden_id, parent_id, content, position_x: 0, position_y: 0, created_at: '2026-09-18T08:00:00.000Z', updated_at: '2026-09-18T08:00:00.000Z', deleted_at: null, is_expanded: true, is_pruned: false, color: null });
const COP_KAYITLARI = [
    { id: 'cop-toplanti', bahceId: 'bahce-gunluk', bahceAdi: 'Günlük', baslik: 'Eski toplantı notları', silinme: Date.now() - 2 * 3600_000, yzSayisi: 0,
        satirlar: [satir('cop-toplanti', 'bahce-gunluk', null, 'Eski toplantı notları\n\nBütçe ve takvim konuşuldu.'), satir('cop-t1', 'bahce-gunluk', 'cop-toplanti', 'Bütçe'), satir('cop-t2', 'bahce-gunluk', 'cop-toplanti', 'Takvim')] },
    { id: 'cop-taslak', bahceId: 'bahce-proje', bahceAdi: 'Proje Fikirleri', baslik: 'Taslak slogan', silinme: Date.now() - 4 * 86400_000, yzSayisi: 0,
        satirlar: [satir('cop-taslak', 'bahce-proje', null, 'Taslak slogan\n\nFikirlerin kök salsın.')] }
];

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
        'localStorage.setItem("nb-yz-agaclari-v1", ' + JSON.stringify(JSON.stringify(YZ_AGACLARI)) + ');',
        'localStorage.setItem("nb-yz-sohbet-v1:dugum-asistan", ' + JSON.stringify(JSON.stringify(YZ_SOHBET)) + ');',
        // Geri dönüşüm kutusu kayıtları IndexedDB'de durur.
        'new Promise(c=>{const r=indexedDB.open("nb-cop",1);r.onupgradeneeded=()=>r.result.createObjectStore("kayitlar",{keyPath:"id"});r.onsuccess=()=>{const t=r.result.transaction("kayitlar","readwrite");for(const k of ' + JSON.stringify(COP_KAYITLARI) + ')t.objectStore("kayitlar").put(k);t.oncomplete=()=>{r.result.close();c("ekildi")}}})'
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
        await cdp.gonder('Runtime.evaluate', { expression: ekmeBetigi(), returnByValue: true, awaitPromise: true });

        // Dev sunucusu sayfaları ilk istekte derler; önce ısıtıp sonra çekiyoruz.
        console.log('Sayfalar ısıtılıyor');
        await git('/projeler?id=bahce-kitap', 7000);
        await git('/bahce_view?id=bahce-proje', 7000);
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 8000);
        const calistir = (ifade) => cdp.gonder('Runtime.evaluate', { expression: ifade, returnByValue: true, awaitPromise: true });
        const tikla = (secici) => calistir('(()=>{const e=' + secici + ';if(e)e.click();return Boolean(e)})()');
        // Eski kare adları (ayarlar, kılavuz) yeni sıralamada yok; karışmasın diye silinir.
        for (const ad of ['4-ayarlar', '7-kilavuz', '2-projeler', '3-editor', '5-ekran-duzeni', '6-kisayollar']) {
            rmSync(join(KOK, 'store', 'screenshot-' + ad + '.png'), { force: true });
            rmSync(join(KOK, 'play-store-paketi', 'gorseller', 'ekran-' + ad + '.png'), { force: true });
        }

        console.log('Ekran görüntüleri alınıyor');
        await git('/', 5000);
        await cek(['store/screenshot-1-ana-sayfa.png', 'play-store-paketi/gorseller/ekran-1-ana-sayfa.png']);
        // Tuval: ağaç ve içindeki yapay zekâ ağacı.
        await git('/bahce_view?id=bahce-proje', 6000);
        await cek(['store/screenshot-2-tuval-yz.png', 'play-store-paketi/gorseller/ekran-2-tuval-yz.png'], async () => {
            await tikla('document.querySelector(\'[aria-label="Tüm notları ekrana sığdır"]\')');
            await bekle(900);
        });
        // YZ ağacı sohbeti: belgelere dayanan yanıtlar.
        await cek(['store/screenshot-3-yz-sohbet.png', 'play-store-paketi/gorseller/ekran-3-yz-sohbet.png'], async () => {
            await calistir('window.dispatchEvent(new CustomEvent("nb-yz-ac",{detail:{id:"dugum-asistan",ekran:"sohbet"}}))');
            await bekle(1500);
        });
        await git('/projeler?id=bahce-proje', 5000);
        await cek(['store/screenshot-4-liste.png', 'play-store-paketi/gorseller/ekran-4-liste.png']);
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 6000);
        await cek(['store/screenshot-5-editor.png', 'play-store-paketi/gorseller/ekran-5-editor.png']);

        // Bilgisayar araçları: bölmeli ekran düzeni.
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 5000);
        await cek(['store/screenshot-6-ekran-duzeni.png', 'play-store-paketi/gorseller/ekran-6-ekran-duzeni.png'], async () => {
            await tikla('document.getElementById("studio-tab-computer")');
            await bekle(600);
            await tikla('document.getElementById("studio-ekran")');
            await bekle(1500);
        });

        // Kısayol panosu: Ofis profili.
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 5000);
        await cek(['store/screenshot-7-kisayollar.png', 'play-store-paketi/gorseller/ekran-7-kisayollar.png'], async () => {
            await tikla('document.getElementById("studio-tab-computer")');
            await bekle(600);
            await tikla('document.getElementById("studio-kisayollar")');
            await bekle(800);
            await tikla('[...document.querySelectorAll(\'[aria-label="Kısayol profilleri"] button\')].find((b)=>b.innerText==="Ofis")');
            await bekle(800);
        });

        // Geri dönüşüm kutusu: silinen notlar ve otomatik temizleme süresi.
        await git('/editor?id=bahce-kitap&nodeId=dugum-altini', 5000);
        await cek(['store/screenshot-8-cop-kutusu.png', 'play-store-paketi/gorseller/ekran-8-cop-kutusu.png'], async () => {
            await tikla('[...document.querySelectorAll("button")].find((b)=>b.getAttribute("title")==="Ayarlar")');
            await bekle(1500);
            await tikla('[...document.querySelectorAll("button")].find((b)=>b.innerText.includes("Geri dönüşüm kutusu"))');
            await bekle(1500);
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

