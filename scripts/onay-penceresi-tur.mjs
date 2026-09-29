/**
 * Onay penceresi (ConfirmModal) klavye davranışı testi.
 *
 * Neden gerekli: P2-19 bulgusu, genel Enter kısayolunun odaktan bağımsız olarak
 * silme işlemini onaylamasıydı. Bu betik gerçek klavye olayları göndererek
 * şunları doğrular:
 *   1. Pencere açıldığında odak İptal düğmesindedir.
 *   2. Enter silmez (pencere açık kalır).
 *   3. Tab odağı pencerenin dışına kaçırmaz.
 *   4. Escape pencereyi kapatır.
 *
 * Kullanım:
 *   1) Uygulama çalışıyor olmalı:  npm run dev
 *   2) node scripts/onay-penceresi-tur.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as bekle } from 'node:timers/promises';

const ADRES = process.env.NB_ADRES || 'http://localhost:3000';
const PORT = Number(process.env.NB_CDP_PORT || 9455);

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

function ekmeBetigi() {
    const kullanici = { id: 'local-demo', email: 'misafir@yerel', user_metadata: { full_name: 'Misafir Bahçıvan' } };
    const bahce = {
        id: 'bahce-test',
        name: 'Silme Testi',
        created_at: '2026-09-20T07:30:00.000Z',
        updated_at: '2026-09-20T09:10:00.000Z',
        deleted_at: null,
        user_id: kullanici.id
    };
    return [
        'localStorage.setItem("nb-local-session-v1", ' + JSON.stringify(JSON.stringify({ user: kullanici, access_token: 'demo-token' })) + ');',
        'localStorage.setItem("nb-local-db-v1", ' + JSON.stringify(JSON.stringify({ gardens: [bahce], nodes: [] })) + ');',
        '"ekildi"'
    ].join('\n');
}

async function main() {
    const chrome = chromeBul();
    const profil = join(tmpdir(), 'nb-onay-tur-' + Date.now());
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
            '--window-size=420,900',
            'about:blank'
        ],
        { stdio: 'ignore' }
    );

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

        const degerlendir = async (ifade) => {
            const sonuc = await cdp.gonder('Runtime.evaluate', { expression: ifade, returnByValue: true, awaitPromise: true });
            if (sonuc.exceptionDetails) throw new Error('Değerlendirme hatası: ' + JSON.stringify(sonuc.exceptionDetails).slice(0, 200));
            return sonuc.result.value;
        };

        const git = async (yol, bekleme = 4000) => {
            const yuklendi = cdp.olayBekle('Page.loadEventFired');
            await cdp.gonder('Page.navigate', { url: ADRES + yol });
            await yuklendi;
            await bekle(bekleme);
        };

        const tusla = async (key, code, vk) => {
            const ortak = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
            await cdp.gonder('Input.dispatchKeyEvent', { type: 'keyDown', ...ortak });
            await cdp.gonder('Input.dispatchKeyEvent', { type: 'keyUp', ...ortak });
            await bekle(500);
        };

        const pencereAcikMi = () => degerlendir('(() => Boolean(document.querySelector("[role=dialog]")))()');
        const odakMetni = () =>
            degerlendir('(() => { const a = document.activeElement; return a ? ((a.innerText || a.getAttribute("aria-label") || a.tagName) + "").trim() : "yok"; })()');
        const odakPencereIcindeMi = () =>
            degerlendir('(() => { const d = document.querySelector("[role=dialog]"); return Boolean(d && document.activeElement && d.contains(document.activeElement)); })()');

        console.log('Uygulama açılıyor: ' + ADRES);
        await git('/', 6000);
        await degerlendir(ekmeBetigi());
        await git('/', 5000);

        const menuAcildi = await degerlendir(
            '(() => { const b = document.querySelector("button[aria-label=\'Bahçe seçenekleri\']"); if (!b) return false; b.click(); return true; })()'
        );
        if (!menuAcildi) throw new Error('Bahçe seçenekleri düğmesi bulunamadı.');
        await bekle(600);

        const silTiklandi = await degerlendir(
            '(() => { const b = [...document.querySelectorAll("button[role=menuitem]")].find((x) => x.innerText.includes("Bahçeyi sil")); if (!b) return false; b.click(); return true; })()'
        );
        if (!silTiklandi) throw new Error('"Bahçeyi sil" menü öğesi bulunamadı.');
        await bekle(900);

        const gecti = [];
        const kaldi = [];
        if (await pencereAcikMi()) gecti.push('Onay penceresi açıldı');
        else kaldi.push('Onay penceresi açılmadı');

        // Varsayılan odak, penceredeki ilk düğme olan vazgeç/iptal düğmesinde olmalı.
        const ilkOdak = await odakMetni();
        const iptalOdakta = await degerlendir(
            '(() => { const d = document.querySelector("[role=dialog]"); const b = d && d.querySelector("button"); return Boolean(b && document.activeElement === b); })()'
        );
        if (iptalOdakta) gecti.push('Varsayılan odak vazgeç düğmesinde (' + ilkOdak + ')');
        else kaldi.push('Varsayılan odak vazgeç düğmesinde değil: ' + ilkOdak);

        await tusla('Enter', 'Enter', 13);
        if (await pencereAcikMi()) gecti.push('Enter silme işlemini onaylamadı, pencere açık kaldı');
        else kaldi.push('Enter onayladı: pencere kapandı, silme riski sürüyor');

        await tusla('Tab', 'Tab', 9);
        if (await odakPencereIcindeMi()) gecti.push('Tab odağı pencere içinde tuttu (' + (await odakMetni()) + ')');
        else kaldi.push('Tab odağı pencerenin dışına kaçırdı');

        await tusla('Escape', 'Escape', 27);
        if (!(await pencereAcikMi())) gecti.push('Escape pencereyi kapattı');
        else kaldi.push('Escape pencereyi kapatmadı');

        console.log('');
        for (const satir of gecti) console.log('  ✓ ' + satir);
        for (const satir of kaldi) console.log('  ✗ ' + satir);
        console.log('');
        console.log('Özet: ' + gecti.length + ' geçti, ' + kaldi.length + ' kaldı.');
        if (kaldi.length > 0) process.exitCode = 1;
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
