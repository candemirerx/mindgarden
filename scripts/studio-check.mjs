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
const PORT = Number(process.env.NB_CDP_PORT || 9335);

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


        const evaluate = async expression => {
            const r = await cdp.gonder('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
            if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
            return r.result.value;
        };
        const assert = async (expression, label) => {
            if(!await evaluate(expression)) throw new Error(label);
            console.log('PASS ' + label);
        };
        /** Sayfa yenilendikten sonra uygulamanın hazır olmasını bekler. */
        const bekleSecici = async (secici, deneme = 40) => {
            for (let i = 0; i < deneme; i++) {
                if (await evaluate('!!document.querySelector(' + JSON.stringify(secici) + ')')) return true;
                await bekle(150);
            }
            return false;
        };
        await cdp.gonder('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
        await git('/editor.html?id=bahce-kitap&nodeId=dugum-altini',1500);
        await assert('!!document.querySelector(".studio-paper")','editor rendered');
        await assert('document.querySelector(".studio-header").getBoundingClientRect().height <= 115','compact header');
        await assert('[...document.querySelectorAll(".studio-header button")].every(b=>b.getBoundingClientRect().height >= 44)','44px touch targets');
        await assert('document.documentElement.scrollWidth <= innerWidth','mobile no overflow');
        await assert('!!document.querySelector("#studio-panel-tools") && !document.querySelector("#studio-panel-ai")','tools tab default');
        await cek(['docs/reviews/studio/mobile-light.png']);
        await evaluate('document.querySelector("#studio-tab-ai").click()');
        await bekle(200);
        await assert('!!document.querySelector("#studio-panel-ai") && !document.querySelector("#studio-panel-tools")','AI tab shows only AI tools');
        await cek(['docs/reviews/studio/mobile-ai-tab.png']);
        await evaluate('document.querySelector("#studio-tab-tools").click()');
        await bekle(200);
        await assert('!!document.querySelector("#studio-panel-tools") && !document.querySelector("#studio-panel-ai")','tools tab switches back');
        await evaluate('localStorage.setItem("nb-tools-section","0");window.dispatchEvent(new Event("focus"))');
        await bekle(200);
        await assert('!document.querySelector("#studio-tab-tools") && !!document.querySelector("#studio-panel-ai")','disabled tools tab removed and AI selected');
        await evaluate('localStorage.setItem("nb-ai-section","0");window.dispatchEvent(new Event("focus"))');
        await bekle(200);
        await assert('!document.querySelector(".studio-tab") && !document.querySelector(".studio-tool-row")','all disabled tabs removed');
        await evaluate('localStorage.setItem("nb-tools-section","1");window.dispatchEvent(new Event("focus"))');
        await bekle(200);
        await assert('!document.querySelector("#studio-tab-ai") && !!document.querySelector("#studio-panel-tools")','disabled AI tab removed');
        await evaluate('localStorage.setItem("nb-ai-section","1");window.dispatchEvent(new Event("focus"))');
        await bekle(200);
        // Fare modu: dokunmatik yuzey ekranin kalanini tamamen kaplar.
        await evaluate('document.querySelector("#studio-fare").click()');
        await bekle(300);
        await assert('document.querySelector("[role=application]").getBoundingClientRect().height > innerHeight * 0.5','mouse surface fills the phone screen');
        await cek(['docs/reviews/studio/fare-yuzeyi.png']);
        await evaluate('document.querySelector("#studio-fare").click()');
        await bekle(300);
        await assert('!document.querySelector("[role=application]") && !!document.querySelector(".studio-paper")','mouse mode returns to the note');
        // Kisayollar: panoda yalnizca makrolar dizilir; makro ekleme ve duzenleme ayarlardan yapilir.
        await assert('!!document.querySelector("#studio-kisayollar")','shortcuts tool visible in editor');
        await evaluate('document.querySelector("#studio-kisayollar").click()');
        await bekle(300);
        await assert('!!document.querySelector("[data-kisayol-panosu]")','macro pad opens');
        await assert('!!document.querySelector("#kisayol-bos") && !document.querySelector("#kisayol-izgarasi")','empty pad is a single empty box');
        await assert('document.querySelector("#kisayol-bos").getBoundingClientRect().height > innerHeight * 0.4','empty macro pad fills the writing area');
        await assert('!document.querySelector("#karalama-metni") && !document.querySelector("[data-kisayol-panosu] textarea")','no collected text area on the pad');
        await assert('!document.querySelector("#kisayol-makro-ekle") && !document.querySelector("#kisayol-kapat")','pad has neither an add nor a back button');
        await assert('!!document.querySelector("#kisayol-ayarlar")','empty box points to the macro settings');
        await evaluate('document.querySelector("#studio-kisayollar").click()');
        await bekle(300);
        await assert('!document.querySelector("[data-kisayol-panosu]") && !!document.querySelector(".studio-paper")','pressing the tool again returns to the note');
        await evaluate('document.querySelector("#studio-kisayollar").click()');
        await bekle(300);
        await evaluate('document.querySelector("#kisayol-ayarlar").click()');
        await bekle(700);
        await assert('!!document.querySelector("[data-settings-screen]") && !!document.querySelector("#makro-ekle")','empty box opens the macro settings');
        await evaluate('document.querySelector("#makro-ekle").click()');
        await bekle(300);
        await assert('!!document.querySelector("[data-makro-duzenleyici]")','macro editor opens from settings');
        // Dört kenarda da en üstteki öğe pencerenin kendisi olmalı: üstten
        // şeffaf bir şerit kalmadığını ve pencerenin tüm ekranı kapladığını
        // bu şekilde ölçüyoruz (fixed öğenin kutusu kaydırılan ata içinde
        // yanıltıcı olabiliyor).
        const makroKapsama = await evaluate('(()=>{const d=document.querySelector("[data-makro-duzenleyici]");const r=d.getBoundingClientRect();const ic=(x,y)=>!!document.elementFromPoint(x,y)?.closest("[data-makro-duzenleyici]");return {ust:ic(5,5),alt:ic(5,innerHeight-5),sol:ic(2,Math.round(innerHeight/2)),sag:ic(innerWidth-2,Math.round(innerHeight/2)),h:r.height,w:r.width,ih:innerHeight,iw:innerWidth}})()');
        await cek(['docs/reviews/studio/makro-ayarla.png']);
        if (!(makroKapsama.ust && makroKapsama.alt && makroKapsama.sol && makroKapsama.sag && makroKapsama.h >= makroKapsama.ih - 1 && makroKapsama.w >= makroKapsama.iw - 1)) throw new Error('macro editor covers the whole phone screen: ' + JSON.stringify(makroKapsama));
        console.log('PASS macro editor covers the whole phone screen');
        await evaluate('(()=>{const yaz=(s,d)=>{const el=document.querySelector(s);const p=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,"value").set.call(el,d);el.dispatchEvent(new Event("input",{bubbles:true}));};yaz("#makro-ad","Imza metni");return true})()');
        await evaluate('document.querySelector("#makro-tur-metin").click()');
        await bekle(200);
        await evaluate('(()=>{const yaz=(s,d)=>{const el=document.querySelector(s);const p=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,"value").set.call(el,d);el.dispatchEvent(new Event("input",{bubbles:true}));};yaz("#makro-deger","Sevgiler");return true})()');
        await evaluate('document.querySelector("#makro-kaydet").click()');
        await bekle(300);
        await assert('!!document.querySelector("#kisayol-detay-0")','saved macro row appears in settings');
        await evaluate('document.querySelector("#kisayol-detay-0").click()');
        await bekle(250);
        await assert('!!document.querySelector("#kisayol-duzenle-0")','macro row offers Duzenle');
        await evaluate('document.querySelector("#kisayol-duzenle-0").click()');
        await bekle(300);
        await assert('!!document.querySelector("[data-makro-duzenleyici]") && document.querySelector("#makro-tur-metin").getAttribute("aria-pressed") === "true"','editing keeps the macro type');
        await evaluate('document.querySelector("#makro-vazgec").click()');
        await bekle(300);
        await assert('!document.querySelector("[data-makro-duzenleyici]")','macro editor closes');
        // Konum makrosu: tur secimi ve tam ekran konum secici.
        await evaluate('document.querySelector("#makro-ekle").click()');
        await bekle(300);
        await evaluate('document.querySelector("#makro-tur-konum").click()');
        await bekle(200);
        await assert('!!document.querySelector("#makro-konum-sec")','position type offers Konum sec');
        await evaluate('document.querySelector("#makro-konum-sec").click()');
        await bekle(350);
        await assert('!!document.querySelector("[data-konum-secici]")','position picker opens');
        await assert('document.querySelector("#konum-deger").textContent.includes("X %50.0")','picker starts at the centre');
        await evaluate('document.querySelector("#konum-adim-orta").click()');
        await evaluate('document.querySelector("#konum-yon-sag").click()');
        await bekle(200);
        await assert('!document.querySelector("#konum-deger").textContent.includes("X %50.0")','dial moves the point one step');
        await assert('!!document.querySelector("#konum-yonluk") && !!document.querySelector("#konum-merkez")','dial and centre controls present');
        // Bastirip tutunca nokta surekli kayar; tek dokunus tek adim kalir.
        const konumX = async () => Number((await evaluate('document.querySelector("#konum-deger").textContent')).match(/X %([0-9.]+)/)[1]);
        await evaluate('document.querySelector("#konum-merkez").click()');
        await bekle(200);
        await evaluate('(()=>{const b=document.querySelector("#konum-yon-sag");b.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,isPrimary:true,pointerType:"touch",button:0}));b.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,isPrimary:true,pointerType:"touch"}));return true})()');
        await bekle(150);
        const tekAdim = (await konumX()) - 50;
        await evaluate('document.querySelector("#konum-merkez").click()');
        await bekle(200);
        await evaluate('(()=>{const b=document.querySelector("#konum-yon-sag");b.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,isPrimary:true,pointerType:"touch",button:0}));return true})()');
        await bekle(800);
        await evaluate('(()=>{const b=document.querySelector("#konum-yon-sag");b.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,isPrimary:true,pointerType:"touch"}));return true})()');
        await bekle(150);
        const tutAdim = (await konumX()) - 50;
        if (!(tekAdim > 0.5 && tutAdim > tekAdim * 1.5)) throw new Error('dial hold repeat: tek=' + tekAdim + ' tut=' + tutAdim);
        console.log('PASS dial holds to keep moving (' + tekAdim.toFixed(1) + '% -> ' + tutAdim.toFixed(1) + '%)');
        await cek(['docs/reviews/studio/konum-secici.png']);
        await evaluate('document.querySelector("#konum-merkez").click()');
        await bekle(200);
        await assert('document.querySelector("#konum-deger").textContent.includes("X %50.0")','Merkeze al returns to the centre');
        await evaluate('document.querySelector("#konum-kullan").click()');
        await bekle(300);
        await assert('!document.querySelector("[data-konum-secici]") && !!document.querySelector("#makro-konum-deger")','picked position returns to the macro editor');
        await evaluate('(()=>{const yaz=(s,d)=>{const el=document.querySelector(s);const p=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,"value").set.call(el,d);el.dispatchEvent(new Event("input",{bubbles:true}));};yaz("#makro-ad","Ortadaki dugme");return true})()');
        await evaluate('document.querySelector("#makro-kaydet").click()');
        await bekle(300);
        await assert('!!document.querySelector("#kisayol-detay-1")','position macro row appears in settings');
        await evaluate('document.querySelector("#makro-ekle").scrollIntoView({block:"center"});true');
        await bekle(300);
        await cek(['docs/reviews/studio/makro-ayarlari.png']);
        await evaluate('(()=>{const p=JSON.parse(localStorage.getItem("nb-remote-prefs-v1"));p.macros=p.macros.map(m=>({...m,enabled:false}));p.enabledTools.shortcuts=false;localStorage.setItem("nb-remote-prefs-v1",JSON.stringify(p));window.dispatchEvent(new Event("focus"));return true})()');
        await bekle(400);
        await assert('!!document.querySelector("#makro-ekle")','Makro Ekle stays after macros disabled');
        await evaluate('(()=>{const p=JSON.parse(localStorage.getItem("nb-remote-prefs-v1"));p.macros=p.macros.map(m=>({...m,enabled:true}));p.enabledTools.shortcuts=true;localStorage.setItem("nb-remote-prefs-v1",JSON.stringify(p));window.dispatchEvent(new Event("focus"));return true})()');
        await bekle(400);
        await assert('!!document.querySelector("#makro-ekle") && !!document.querySelector("#kisayol-detay-1")','Makro Ekle stays after macros re-enabled');
        // Sayfa yeniden yuklenince ayar penceresi kapanir; panoda makrolar sirayla dizilir.
        await git('/editor.html?id=bahce-kitap&nodeId=dugum-altini',1500);
        await assert('!document.querySelector("[data-settings-screen]")','settings closed');
        if (!await bekleSecici('#studio-kisayollar')) throw new Error('reload sonrası kısayollar düğmesi gelmedi');
        await evaluate('document.querySelector("#studio-kisayollar").click()');
        await bekle(300);
        await assert('document.querySelectorAll("#kisayol-izgarasi button").length === 2','both macros sit on the pad');
        await assert('document.querySelector("#kisayol-makro-0").getAttribute("data-makro-tur") === "text" && document.querySelector("#kisayol-makro-1").getAttribute("data-makro-tur") === "position"','pad keeps the order the macros were added');
        await evaluate('document.querySelector("#kisayol-makro-0").click()');
        await bekle(400);
        await assert('!!document.querySelector("[data-kisayol-panosu]") && !document.querySelector("[data-kisayol-panosu] textarea")','macro tap keeps the pad a single box');
        await cek(['docs/reviews/studio/kisayol-panosu.png']);
        await evaluate('document.documentElement.classList.add("dark")');
        await cek(['docs/reviews/studio/kisayol-panosu-dark.png']);
        await evaluate('document.documentElement.classList.remove("dark")');
        await evaluate('document.querySelector("#studio-kisayollar").click()');
        await bekle(300);
        await assert('!document.querySelector("[data-kisayol-panosu]") && !!document.querySelector(".studio-paper")','pressing the tool again returns to the note');
        // Kopru Yaz: ayri bir panel yok; notun kendi yazi alani yerinde kalir
        // ve oraya yazilan metin ayni anda bilgisayara da gonderilir.
        await evaluate('document.querySelector("#studio-kopru-yaz").click()');
        await bekle(300);
        await assert('document.querySelector("#studio-kopru-yaz").getAttribute("aria-pressed") === "true"','bridge write turns on from its button');
        await assert('!document.querySelector("#kopru-yaz-paneli") && !document.querySelector("#kopru-yaz-alani")','bridge write opens no separate panel');
        await assert('!!document.querySelector("#studio-kopru-yaz-durum") && !!document.querySelector(".studio-text")','the note stays in place and the status line shows');
        await evaluate('(()=>{const t=document.querySelector(".studio-text");Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(t,t.value+" Kopru deneme");t.dispatchEvent(new Event("input",{bubbles:true}));return true})()');
        await bekle(700);
        await assert('document.querySelector(".studio-text").value.trim().endsWith("Kopru deneme")','typing stays in the note while bridge write is on');
        await assert('document.querySelector("#studio-kopru-yaz-durum").textContent.trim().length > 10','bridge write reports its transfer status');
        await cek(['docs/reviews/studio/kopru-yaz.png']);
        await evaluate('document.querySelector("#studio-kopru-yaz").click()');
        await bekle(300);
        await assert('document.querySelector("#studio-kopru-yaz").getAttribute("aria-pressed") === "false" && !document.querySelector("#studio-kopru-yaz-durum")','bridge write turns off from the same button');
        await evaluate('(()=>{const t=document.querySelector("textarea");Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(t,"Verified studio note ".repeat(300));t.dispatchEvent(new Event("input",{bubbles:true}));})()');
        await bekle(2000);
        await assert('document.querySelector("textarea").value.startsWith("Verified studio note")','typing');
        await assert('document.querySelector("textarea").scrollHeight <= document.querySelector("textarea").clientHeight+2','long content expands');
        await git('/editor.html?id=bahce-kitap&nodeId=dugum-altini',1200);
        await assert('document.querySelector("textarea").value.startsWith("Verified studio note")','autosave survives reload');
        await cdp.gonder('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});
        await bekle(200);
        await assert('document.documentElement.scrollWidth <= innerWidth','320px no overflow');
        await assert('document.querySelector("textarea").scrollHeight <= document.querySelector("textarea").clientHeight+2','resize preserves visible text');
        await evaluate(ekmeBetigi());
        await git('/editor.html?id=bahce-kitap&nodeId=dugum-altini',1200);
        await evaluate('document.documentElement.classList.add("dark")');
        await cek(['docs/reviews/studio/mobile-dark.png']);
        await cdp.gonder('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
        await evaluate('document.documentElement.classList.remove("dark")');
        await cek(['docs/reviews/studio/desktop.png']);
        await assert('document.documentElement.scrollWidth <= innerWidth','desktop no overflow');
        await evaluate('(()=>{const db=JSON.parse(localStorage.getItem("nb-local-db-v1"));for(let i=0;i<3;i++)db.nodes.push({...db.nodes[2],id:"canvas-sibling-"+i,content:"Branch "+(i+1),parent_id:"dugum-simyaci"});localStorage.setItem("nb-local-db-v1",JSON.stringify(db));})()');
        await cdp.gonder('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
        await git('/bahce_view.html?id=bahce-kitap',1500);
        await assert('!!document.querySelector(".garden-controls")','canvas rendered');
        await evaluate('document.querySelector(".garden-fit").click()');
        await bekle(300);
        await assert('innerHeight-document.querySelector(".garden-controls").getBoundingClientRect().bottom >= 59','navigation safe clearance');
        await assert('[...document.querySelectorAll(".garden-controls button")].every(b=>b.getBoundingClientRect().height>=44 && b.getBoundingClientRect().width>=44)','canvas touch targets');
        await assert('[...document.querySelectorAll(".dugum-karti")].every(n=>{const r=n.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=document.querySelector(".garden-page header").getBoundingClientRect().bottom && r.bottom<document.querySelector(".garden-controls").getBoundingClientRect().top})','fit includes all visible nodes');
        await assert('[...document.querySelectorAll(".tree ul ul")].every(n=>getComputedStyle(n).columnGap === "0px")','continuous sibling connectors');
        await cek(['docs/reviews/studio/canvas-light.png']);
        await cdp.gonder('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
        await evaluate('document.querySelector(".garden-fit").click()');
        await bekle(200);
        await cek(['docs/reviews/studio/canvas-desktop.png']);
        await cdp.gonder('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
        await evaluate('document.querySelector(".garden-fit").click()');
        await bekle(200);
        await evaluate('document.documentElement.classList.add("dark")');
        await cek(['docs/reviews/studio/canvas-dark.png']);
        await evaluate('document.querySelector(".garden-controls button").click()');
        await bekle(200);
        await evaluate('document.querySelector(".garden-fit").click()');
        await bekle(200);
        await evaluate('document.querySelector(".tree button[aria-expanded=true]").click()');
        await bekle(200);
        await assert('!!document.querySelector(".tree button[aria-expanded=false]")','collapse node');
        await evaluate('document.querySelector(".tree button[aria-expanded=false]").click()');
        await bekle(200);
        await assert('!document.querySelector(".tree button[aria-expanded=false]")','expand node');
        await assert('[...document.querySelectorAll(".tree [role=toolbar].pointer-events-none, .tree button.pointer-events-none")].every(n=>getComputedStyle(n).visibility==="hidden")','hidden actions excluded from keyboard focus');
        await evaluate('document.querySelector(".dugum-karti").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))');
        await bekle(200);
        await assert('!!document.querySelector(".dugum-karti[aria-pressed=true]")','keyboard selects card');
        await git('/',1200);
        await cdp.gonder('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
        await cek(['docs/reviews/studio/home.png']);
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

