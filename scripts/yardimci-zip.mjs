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
    'pc_guvenlik_duvari.ps1',
    'pc_tailscale_izni.cmd',
    'pc_clipboard_helper.ps1',
    'RemoteInput.cs',
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
    '     Yonetici olarak calistirmaniz GEREKMEZ. Wi-Fi icin guvenlik duvari izni',
    '     yoksa yalniz onu eklemek icin BIR KEZ Windows izin penceresi cikar.',
    '     "Hayir" derseniz program yine acilir (Bluetooth ile pano calisir).',
    '  2) Pencere acik kalsin. Pencerede 6 haneli ESLESTIRME KODU gorunur.',
    '',
    'TELEFONLA ILK ESLESME (bir kez)',
    '  Telefonda: Ayarlar > Bilgisayar baglantisi > Pano bolumu:',
    '  - Bluetooth: telefon bilgisayarla Bluetooth uzerinden eslesmisse KOD',
    '    GEREKMEZ; bilgisayari secip baglanmaniz yeterli.',
    '  - Wi-Fi: "Agda bilgisayar ara" > penceredeki kodu yazin > Eslestir.',
    '  Eslesen telefon bir daha kod sormaz. Sonraki kullanimlarda yalniz bu',
    '  programi calistirmaniz yeterlidir.',
    '',
    'GORSELLER',
    '  Telefondaki mini galeriden "Bilgisayara" ile gonderilen gorseller',
    '  Resimler > Not Bahcesi klasorune kaydedilir; "PC panosuna" ile gonderilen',
    '  gorsel panoya konur, Ctrl+V ile yapistirilir.',
    '',
    'Bilgisayar her acildiginda yardimciyi yeniden calistirin (pencere kapaninca durur).',
    'Gizlilik: Yardimci yalniz yerel agda/Bluetooth ile calisir, internete veri',
    'gondermez. Erisim anahtari scripts klasorunde .pc_clipboard_token dosyasindadir;',
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
