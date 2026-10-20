/**
 * Pano paylaşımının uçtan uca testi: uygulamanın pano kodu (lib/remoteTools.ts)
 * her bağlantı türüyle, kaynağından çalıştırılan gerçek PC yardımcısına gönderir
 * ve sonuç gerçek Windows panosundan okunur.
 *
 * Yollar: Wi‑Fi (PC), USB, Tailscale, Bluetooth (PC yardımcısının RFCOMM
 * alıcısı), kart Wi‑Fi (/api/clip), kart BLE (pb/pp/pe), kartla Wi‑Fi yedeği;
 * telefon panosundan bilgisayara metin ve görsel; tek görsel ve birden çok
 * dosya panoya. Kart ve telefon uçları yazılımlarının protokolüyle taklit edilir.
 *
 * Panonuzdaki metin test sonunda geri konur. Yalnız Windows'ta çalışır.
 * Çalıştırmak için: node scripts/pano-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const PORT = 18990 + Math.floor(Math.random() * 400) * 2;
const TOKEN = 'pano-test-' + Math.random().toString(36).slice(2) + 'x'.repeat(24);
const HELPER = `http://127.0.0.1:${PORT}`;
const yardimciBetigi = new URL('./pano-test-yardimci.ps1', import.meta.url);

function surecBaslat(ekArgs) {
    const surec = spawn('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', yardimciBetigi.pathname.replace(/^\/([A-Za-z]:)/, '$1'), '-Port', String(PORT), ...ekArgs], { stdio: ['ignore', 'pipe', 'pipe'] });
    let hata = '';
    surec.stderr.on('data', (d) => { hata += d; });
    const hazir = new Promise((coz, red) => {
        surec.stdout.on('data', (d) => { if (String(d).includes('HAZIR')) coz(); });
        surec.on('exit', (kod) => red(new Error('Yardımcı kapandı (' + kod + '): ' + hata)));
        setTimeout(() => red(new Error('Yardımcı 30 sn içinde açılmadı: ' + hata)), 30000);
    });
    return { surec, hazir };
}

const psPano = (betik) => execFileSync('powershell.exe', ['-NoProfile', '-STA', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8; Add-Type -AssemblyName System.Windows.Forms; ' + betik], { encoding: 'utf8' });
const panoMetni = () => JSON.parse(psPano('$t=[Windows.Forms.Clipboard]::GetText(); ConvertTo-Json -Compress @{ t = $t }')).t;
const panoBicimleri = () => JSON.parse(psPano('ConvertTo-Json -Compress @{ resim = [Windows.Forms.Clipboard]::ContainsImage(); dosyalar = @([Windows.Forms.Clipboard]::GetFileDropList()) }'));

// ---- Telefon tarafının taklidi: ağ, Bluetooth, kart ve telefon panosu ----
const kayit = [];
let telefonPanosu = {};
let bleTampon = null;
const yardimciya = async (yol, govde, tur = 'text/plain; charset=utf-8', anahtar = TOKEN) => {
    const yanit = await fetch(HELPER + yol, { method: 'POST', headers: { Authorization: 'Bearer ' + anahtar, 'Content-Type': tur }, body: govde });
    return { status: yanit.status, body: await yanit.text() };
};
const native = {
    async request({ url, method, body, token }) {
        const u = new URL(url);
        kayit.push({ yol: 'http', host: u.host, path: u.pathname });
        // Kart yazılımı: /api/clip "b64:…" metni NBPANO1 olarak USB'den yardımcıya, o da /clipboard'a koyar.
        if (u.host === '192.168.4.1' || u.host === 'kart.local') {
            if (u.pathname === '/api/clip') {
                const r = await yardimciya('/clipboard', Buffer.from(body.replace(/^b64:/, ''), 'base64'));
                return { status: r.status, body: JSON.stringify({ ok: r.status === 200 }) };
            }
            if (u.pathname === '/api/pcbridge') {
                const bayt = Buffer.from(body, 'utf8');
                assert.ok(bayt.length <= 24000, 'kart çerçevesi 24000 baytı aşmamalı: ' + bayt.length);
                const r = await yardimciya('/input', bayt, 'application/json; charset=utf-8');
                return { status: r.status, body: JSON.stringify({ ok: r.status === 200 }) };
            }
            return { status: 404, body: '{}' };
        }
        // Ağdaki yardımcı (LAN, USB tüneli, Tailscale): hepsi bu bilgisayardaki test yardımcısına çıkar.
        const r = await fetch(HELPER + u.pathname, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'text/plain' }, body: method === 'GET' ? undefined : body });
        return { status: r.status, body: await r.text() };
    },
    // PC yardımcısının Bluetooth alıcısı: tek satır JSON, tek satır yanıt.
    sendClassic({ body }) {
        kayit.push({ yol: 'bluetooth', bayt: Buffer.byteLength(body) });
        return new Promise((coz, red) => {
            const soket = net.connect(PORT + 1, '127.0.0.1', () => soket.write(body + '\n'));
            let gelen = '';
            soket.on('data', (d) => { gelen += d; if (gelen.includes('\n')) soket.end(); });
            soket.on('end', () => {
                const yanit = JSON.parse(gelen.trim());
                if (yanit.ok) coz(yanit); else red(new Error(yanit.error || 'Bluetooth komutu reddedildi'));
            });
            soket.on('error', red);
        });
    },
    // Kart BLE: pb → pp:<base64 parçası>… → pe; kart sonunda NBPANO1 ile yardımcıya iletir.
    async send({ command }) {
        kayit.push({ yol: 'ble', command: command.slice(0, 3) });
        if (command === 'pb') bleTampon = '';
        else if (command.startsWith('pp:')) bleTampon += command.slice(3);
        else if (command === 'pe') { const r = await yardimciya('/clipboard', Buffer.from(bleTampon, 'base64')); assert.equal(r.status, 200); bleTampon = null; }
        return {};
    },
    async isConnected() { return { connected: true }; },
    async readClipboard() { return telefonPanosu; },
    async writeClipboard(o) { telefonPanosu = { text: o.text }; },
    scanComputers: async () => ({ devices: [] }),
};

class FileReaderShim {
    readAsDataURL(blob) {
        blob.arrayBuffer().then((b) => { this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + Buffer.from(b).toString('base64'); this.onload?.(); }, () => this.onerror?.());
    }
}
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/remoteTools.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
    exports, Error, URL, Blob, Promise, JSON, Math, Date, Array, Uint8Array, atob, btoa, TextEncoder, encodeURIComponent, unescape,
    FileReader: FileReaderShim, setTimeout, clearTimeout, console,
    localStorage: { getItem: () => null, setItem() { }, removeItem() { } },
    require: (name) => name === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => true }, registerPlugin: () => native }
        : name.endsWith('kilavuzIlerleme') ? { dersTamamla() { } } : {},
});
const { sendToComputerClipboard, telefonPanosunuBilgisayaraGonder, dosyalariBilgisayaraGonder } = exports;

// Bağlantı türleri: ayarlardaki gibi (adresler yalnız yönlendirme için; hepsi test yardımcısına çıkar).
const PC_WIFI = { connection: 'pc-wifi', helperUrl: 'http://192.168.1.3:8765', helperToken: TOKEN };
const ROTALAR = {
    'Wi‑Fi (PC)': PC_WIFI,
    USB: { connection: 'pc-wifi', agTuru: 'usb', helperUrl: 'http://127.0.0.1:18775', helperToken: TOKEN },
    Tailscale: { connection: 'pc-wifi', agTuru: 'tailscale', helperUrl: 'http://100.64.0.7:8765', helperToken: TOKEN },
    'Bluetooth (PC)': { connection: 'pc-bluetooth', helperUrl: '', helperToken: TOKEN, helperBluetoothAddress: 'AA:BB:CC:DD:EE:FF' },
    'Kart Wi‑Fi': { connection: 'wifi', cardUrl: 'http://192.168.4.1', helperUrl: '', helperToken: '' },
    'Kart BLE': { connection: 'bluetooth', cardUrl: 'http://192.168.4.1', helperUrl: '', helperToken: '' },
};
const METINLER = {
    'Türkçe': 'Merhaba dünya: ğüşıöç İĞÜŞÖÇ',
    'emoji ve simgeler': '🌱 Not Bahçesi — “tırnak” «» € ₺ 😀 עברית ✓',
    'çok satırlı': '1. satır\r\n\t2. satır (sekme)\r\n\r\n4. satır',
    'uzun (20 bin karakter)': ('Uzun metin ğüşöçı 😀 ').repeat(1000),
    // Uzun bir not: Bluetooth satır sınırını (32 KB) ve /input metin sınırını (32000) aşar.
    'çok uzun (80 bin karakter)': ('Çok uzun not satırı ğüşöçı İ 😀\n').repeat(2500),
};

const onceki = (() => { try { return panoMetni(); } catch { return null; } })();
const yardimci = surecBaslat(['-Token', TOKEN]);
const kopru = surecBaslat(['-Kopru']);
const sonuclar = [];
const hatalar = [];
try {
    await Promise.all([yardimci.hazir, kopru.hazir]);

    for (const [rota, prefs] of Object.entries(ROTALAR)) {
        for (const [ad, metin] of Object.entries(METINLER)) {
            kayit.length = 0;
            try {
                await sendToComputerClipboard(metin, { ...prefs });
                const pano = panoMetni();
                assert.equal(pano, metin, 'panodaki metin farklı');
                sonuclar.push(`${rota} · ${ad}`);
            } catch (hata) {
                hatalar.push(`${rota} · ${ad}: ${hata.message.split('\n')[0].slice(0, 160)} [${[...new Set(kayit.map((k) => k.yol))].join('+')}${kayit.some((k) => k.bayt) ? ', ' + Math.max(...kayit.map((k) => k.bayt || 0)) + ' bayt' : ''}]`);
            }
        }
    }

    // Kart Wi‑Fi'si yanıt vermezse PC Wi‑Fi eşleşmesine düşülmeli.
    try {
        const kartYok = { ...PC_WIFI, connection: 'wifi', cardUrl: 'http://kart.local' };
        await sendToComputerClipboard('Kart yok, yardımcıya düştü', kartYok);
        assert.equal(panoMetni(), 'Kart yok, yardımcıya düştü');
        sonuclar.push('Kart ulaşılamaz → PC Wi‑Fi yedeği');
    } catch (hata) { hatalar.push('Kart ulaşılamaz → PC Wi‑Fi yedeği: ' + hata.message); }

    // Arka arkaya hızlı gönderimler (pano kısa süre kilitli kalabilir).
    try {
        for (let i = 0; i < 8; i++) await sendToComputerClipboard('Hızlı ' + i, PC_WIFI);
        assert.equal(panoMetni(), 'Hızlı 7');
        sonuclar.push('8 hızlı ardışık gönderim');
    } catch (hata) { hatalar.push('Hızlı ardışık gönderim: ' + hata.message); }

    // Yanlış anahtar anlaşılır biçimde reddedilmeli; pano değişmemeli.
    try {
        await assert.rejects(sendToComputerClipboard('yanlış anahtar', { ...PC_WIFI, helperToken: 'yanlis-anahtar-' + 'y'.repeat(30) }), /yeniden bağlanın \(HTTP 401\)/);
        assert.equal(panoMetni(), 'Hızlı 7');
        sonuclar.push('Yanlış anahtar reddedilir');
    } catch (hata) { hatalar.push('Yanlış anahtar: ' + hata.message); }

    // Boş metin gönderilmez.
    try { await assert.rejects(sendToComputerClipboard('', PC_WIFI), /boş/); sonuclar.push('Boş metin engellenir'); }
    catch (hata) { hatalar.push('Boş metin: ' + hata.message); }

    // Telefon panosu → bilgisayar: metin ve görsel, her PC rotasında.
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==', 'base64');
    for (const rota of ['Wi‑Fi (PC)', 'USB', 'Bluetooth (PC)', 'Kart Wi‑Fi']) {
        try {
            telefonPanosu = { text: 'Telefonda kopyalandı: ' + rota + ' ğş' };
            const ileti = await telefonPanosunuBilgisayaraGonder({ ...ROTALAR[rota] });
            assert.match(ileti, /gönderildi/);
            assert.equal(panoMetni(), telefonPanosu.text);
            sonuclar.push(`Telefon panosu metin → PC · ${rota}`);
        } catch (hata) { hatalar.push(`Telefon panosu metin → PC · ${rota}: ${hata.message}`); }
        try {
            telefonPanosu = { mime: 'image/png', data: PNG.toString('base64') };
            await telefonPanosunuBilgisayaraGonder({ ...ROTALAR[rota] });
            const b = panoBicimleri();
            assert.ok(b.resim, 'panoda görsel yok');
            sonuclar.push(`Telefon panosu görsel → PC · ${rota}`);
        } catch (hata) { hatalar.push(`Telefon panosu görsel → PC · ${rota}: ${hata.message}`); }
    }
    try {
        telefonPanosu = { turler: ['text/plain'] };
        await assert.rejects(telefonPanosunuBilgisayaraGonder(PC_WIFI), /boş/);
        sonuclar.push('Boş telefon panosu anlaşılır hata verir');
    } catch (hata) { hatalar.push('Boş telefon panosu: ' + hata.message); }

    // Mini galeriden panoya: birden çok dosya Gezgin'e yapıştırılabilir liste olarak.
    for (const rota of ['Wi‑Fi (PC)', 'Bluetooth (PC)', 'Kart Wi‑Fi']) {
        try {
            await dosyalariBilgisayaraGonder([
                { ad: 'gorsel.png', veri: new Blob([PNG], { type: 'image/png' }) },
                { ad: 'not.txt', veri: new Blob(['galeri metni ğş'], { type: 'text/plain' }) },
            ], 'pano', { ...ROTALAR[rota] });
            const b = panoBicimleri();
            assert.equal(b.dosyalar.length, 2, 'panoda 2 dosya olmalı');
            assert.equal(readFileSync(b.dosyalar[1], 'utf8'), 'galeri metni ğş');
            sonuclar.push(`Galeri → PC panosu (2 dosya) · ${rota}`);
        } catch (hata) { hatalar.push(`Galeri → PC panosu · ${rota}: ${hata.message}`); }
    }
} finally {
    yardimci.surec.kill();
    kopru.surec.kill();
    try { execFileSync('taskkill', ['/F', '/T', '/PID', String(yardimci.surec.pid)], { stdio: 'ignore' }); } catch { }
    try { execFileSync('taskkill', ['/F', '/T', '/PID', String(kopru.surec.pid)], { stdio: 'ignore' }); } catch { }
    // Kullanıcının panosundaki metni geri koy (görsel ya da dosya listesi geri konamaz).
    if (onceki) { try { const yol = join(tmpdir(), 'nb-pano-onceki.txt'); writeFileSync(yol, onceki, 'utf8'); psPano("$m=[IO.File]::ReadAllText('" + yol + "'); for($i=0;$i -lt 20;$i++){ try { [Windows.Forms.Clipboard]::SetText($m); break } catch { Start-Sleep -Milliseconds 150 } }"); unlinkSync(yol); } catch { } }
}

for (const s of sonuclar) console.log('  ✓ ' + s);
for (const h of hatalar) console.log('  ✗ ' + h);
if (hatalar.length) { console.log(`FAIL: ${hatalar.length} / ${sonuclar.length + hatalar.length} pano senaryosu başarısız`); process.exit(1); }
console.log(`PASS: ${sonuclar.length} pano senaryosu (6 bağlantı türü, telefon panosu, galeri) gerçek Windows panosunda doğrulandı`);
