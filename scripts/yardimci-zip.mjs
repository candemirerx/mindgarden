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
    'pc_clipboard_helper.ps1',
    'RemoteInput.cs',
    'vendor/InTheHand.Net.Personal.dll',
    'vendor/32feet-LICENSE.txt',
    'vendor/README.md'
];
const OKUBENI = [
    'NOT BAHCESI - PC YARDIMCISI',
    '',
    'Telefondaki Not Bahcesi uygulamasiyla bu bilgisayara yazmak, fareyi',
    've kisayollari kullanmak, metni panoya gondermek icin gerekir.',
    'Tek programdir: yazma, fare, kisayol ve PANO ayni programla calisir.',
    '',
    'KURULUM',
    '  1) Zip dosyasini bir klasore cikarin (ornek: Belgeler\\Not Bahcesi PC).',
    '  2) "scripts" klasorundeki pc_yardimcisi_baslat.cmd dosyasina cift tiklayin.',
    '  3) Windows yonetici izni ister; "Evet" deyin (guvenlik duvarina yalniz',
    '     yerel ag icin TCP 8765 izni eklenir).',
    '  4) Pencere 6 haneli ESLESTIRME KODU gosterir. Pencere acik kalsin.',
    '  5) Telefonda: Ayarlar > Bilgisayar baglantisi > Bilgisayar - Wi-Fi',
    '     (ya da Bluetooth) > "Agda bilgisayar ara" > kodu yazin > Eslestir.',
    '',
    'Kod tek kullanimliktir; eslesen telefon bir daha kod sormaz. Bilgisayar her',
    'acildiginda yardimciyi yeniden calistirin (pencere kapaninca durur).',
    'Telefon ve bilgisayar ayni guvenilir Wi-Fi aginda olmali. Bluetooth icin',
    'bilgisayarda Bluetooth acik olmali ve telefonla eslestirilmis olmalidir.',
    '',
    'Gizlilik: Yardimci yalniz yerel agda calisir, internete veri gondermez.',
    'Erisim anahtari bu klasorde .pc_clipboard_token dosyasinda saklanir;',
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
