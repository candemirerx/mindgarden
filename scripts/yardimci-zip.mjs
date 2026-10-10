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
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
    '  - Bluetooth klavye/fare ve kartla yazma icin yardimci gerekmez.',
    '  - PC panosu, mini galeriden dosya aktarimi, telefon bellegi ve',
    '    destekleyen kartla USB internet koprusu ayni yardimcinin parcalaridir.',
    '',
    'KLASOR DUZENI',
    '  BASLAT.cmd : onerilen giris; Bluetooth / kart USB.',
    '  WIFI.cmd   : alternatif; dogrudan PC Wi-Fi (mevcut ag izni gerekir).',
    '  scripts    : otomatik yuklenen teknik dosyalar; elle acmayin, silmeyin.',
    '  ileri      : yoneticiye ozel guvenlik duvari araci; admin yoksa acmayin.',
    '',
    'BASLATMA',
    '  1) ZIP\'in tamamini bir klasore cikarin; ana klasorde BASLAT.cmd acin.',
    '     Yonetici izni istemez. Varsayilan: Tailscale, kart USB ve Bluetooth.',
    '     Tailscale kurulu ve oturumu aciksa 8765 portunu yerel yardimciya',
    '     yonlendirir; baska yayinlara ve guvenlik duvarina dokunmaz.',
    '     Ayni agda dogrudan PC Wi-Fi icin BASLAT yerine WIFI.cmd acin.',
    '     Windows Wi-Fi baglantisini engelliyorsa sistem yoneticisinin',
    '     verdigi bir guvenlik duvari izni gerekir; baslatici izin istemez.',
    '     Admin kullanamiyorsaniz Bluetooth veya kart yolunu tercih edin.',
    '     Kurum betik/USB/Bluetooth kullanimini engelliyorsa asmaya calismayin.',
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
    'INDIRME LINKINI YARDIMCI OLMADAN PC\'YE YAZMA',
    '  Uygulamada Paylas / Linki kopyala / Bilgisayara linki yaz secenekleri var.',
    '  Link yazma Bluetooth klavye veya kart yolunu kullanir; PC yardimcisi',
    '  istemez. PC tarayicisinda adres cubuguna tiklayin; link yazilinca Enter.',
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

const stage = await mkdtemp(join(tmpdir(), 'nb-yardimci-zip-'));
await mkdir(join(stage, 'scripts', 'vendor'), { recursive: true });
await mkdir(join(stage, 'ileri'));
for (const dosya of DOSYALAR) {
    const hedef = dosya === 'pc_guvenlik_duvari.ps1' ? 'ileri' : 'scripts';
    await copyFile(join(KOK, 'scripts', dosya), join(stage, hedef, dosya));
}
for (const dosya of ['BASLAT.cmd', 'WIFI.cmd']) await copyFile(join(KOK, 'scripts', 'yardimci-paket', dosya), join(stage, dosya));
await writeFile(join(stage, 'OKUBENI.txt'), OKUBENI, 'utf8');
await mkdir(HEDEF_KLASOR, { recursive: true });
execFileSync('powershell.exe', ['-NoProfile', '-Command',
    'Compress-Archive -Path "' + join(stage, '*') + '" -DestinationPath "' + HEDEF + '" -CompressionLevel Optimal -Force'], { stdio: 'inherit' });
await rm(stage, { recursive: true, force: true });
console.log('Hazir: ' + HEDEF);
