/**
 * PC yardımcısını indirilebilir tek zip olarak hazırlar:
 *   public/indir/not-bahcesi-pc-yardimcisi.zip
 *
 * Play Store'dan uygulamayı kuran kullanıcı yardımcıyı sitenin /pc sayfasından
 * indirir; uygulamadaki bağlantı kurulumu bu sayfanın adresini gösterir.
 * Yardımcı değiştiğinde (pc_clipboard_helper.ps1, RemoteInput.cs) yeniden çalıştırın:
 *   node scripts/yardimci-zip.mjs
 */
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const KOK = resolve(import.meta.dirname, '..');
const HEDEF_KLASOR = join(KOK, 'public', 'indir');
const HEDEF = join(HEDEF_KLASOR, 'not-bahcesi-pc-yardimcisi.zip');
const DOSYALAR = [
    'pc_yardimcisi_baslat.cmd',
    'pc_yardimcisi_baslat.ps1',
    'pc_yardimcisi_wifi.cmd',
    'pc_guvenlik_duvari.ps1',
    'pc_tailscale_izni.cmd',
    'pc_tailscale_izin.ps1',
    'pc_clipboard_helper.ps1',
    'RemoteInput.cs',
    'PhoneDrive.cs',
    'UsbInternetRelay.cs',
    'vendor/InTheHand.Net.Personal.dll',
    'vendor/32feet-LICENSE.txt',
    'vendor/README.md'
];
const OKUBENI = [
    'NOT BAHCESI - PC YARDIMCISI',
    '',
    'NE ZAMAN GEREKIR?',
    '  - Bilgisayar - Wi-Fi baglantisinda: yazma, fare, kisayol ve pano icin.',
    '  - Diger baglantilarda (Kart Wi-Fi, Kart Bluetooth, Bilgisayar Bluetooth)',
    '    yazma ve fare programsiz calisir; yalniz PANOYA GONDERMEK icin gerekir.',
    '',
    'BASLATMA',
    '  1) "scripts" klasorundeki pc_yardimcisi_baslat.cmd dosyasina cift tiklayin.',
    '     Yonetici izni istemez. Varsayilan: Tailscale, kart USB ve Bluetooth.',
    '     Tailscale kurulu ve oturumu aciksa 8765 portunu yerel yardimciya',
    '     yonlendirir; baska yayinlara ve guvenlik duvarina dokunmaz.',
    '     Ayni agda Wi-Fi icin pc_yardimcisi_wifi.cmd dosyasini acin.',
    '     Windows Wi-Fi baglantisini engelliyorsa sistem yoneticisinin',
    '     verdigi bir guvenlik duvari izni gerekir; baslatici izin istemez.',
    '  2) Pencere acik kalsin. Pencerede 6 haneli ESLESTIRME KODU gorunur.',
    '',
    'TELEFONLA ILK ESLESME (bir kez)',
    '  Telefonda: Ayarlar > Bilgisayar baglantisi > Pano bolumu:',
    '  - Bluetooth: Windows ve telefonu eslestirin, bilgisayari secin.',
    '    Uygulama sorarsa yardimcinin 6 haneli kodunu girin.',
    '  - Wi-Fi: "Agda bilgisayar ara" > penceredeki kodu yazin > Eslestir.',
    '  - Tailscale: telefonda da Tailscale acik olmali. Penceredeki 100.x',
    '    adresini uygulamaya girin; ilk seferde eslesme kodunu kullanin.',
    '  Eslesen telefon bir daha kod sormaz. Sonraki kullanimlarda yalniz bu',
    '  programi calistirmaniz yeterlidir.',
    '',
    'GORSELLER',
    '  Telefondaki mini galeriden "Bilgisayara" ile gonderilen gorseller',
    '  Resimler > Not Bahcesi klasorune kaydedilir; "PC panosuna" ile gonderilen',
    '  gorsel panoya konur, Ctrl+V ile yapistirilir.',
    '',
    'Bilgisayar her acildiginda yardimciyi yeniden calistirin (pencere kapaninca durur).',
    'Gizlilik: Tailscale ozel aginiz, kart USB, Bluetooth veya secilen yerel ag',
    'kullanilir; halka acik yayin yapilmaz. Erisim anahtari .pc_clipboard_token',
    'dosyasindadir;',
    'kimseyle paylasmayin. Kapatmak icin pencerede Ctrl+C.',
    ''
].join('\r\n');

const stage = join(tmpdir(), 'nb-yardimci-zip');
await rm(stage, { recursive: true, force: true });
await mkdir(join(stage, 'scripts', 'vendor'), { recursive: true });
for (const dosya of DOSYALAR) await copyFile(join(KOK, 'scripts', dosya), join(stage, 'scripts', dosya));
await writeFile(join(stage, 'OKUBENI.txt'), OKUBENI, 'utf8');
await mkdir(HEDEF_KLASOR, { recursive: true });
execFileSync('powershell.exe', ['-NoProfile', '-Command',
    'Compress-Archive -Path "' + join(stage, '*') + '" -DestinationPath "' + HEDEF + '" -CompressionLevel Optimal -Force'], { stdio: 'inherit' });
await rm(stage, { recursive: true, force: true });
console.log('Hazir: ' + HEDEF);
