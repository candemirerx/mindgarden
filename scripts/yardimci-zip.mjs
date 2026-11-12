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
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const KOK = resolve(import.meta.dirname, '..');
const HEDEF_KLASOR = join(KOK, 'public', 'indir');
const HEDEF = join(HEDEF_KLASOR, 'not-bahcesi-pc-yardimcisi.zip');
// Both apps use the same reviewed USB bridge; do not fork its protocol or tokens.
const ORTAK_PROJE = resolve(KOK, '..', 'kablosuzbellek');
const ORTAK_SURUM = JSON.parse(await readFile(join(ORTAK_PROJE, 'tools', 'helper-version.json'), 'utf8')).version;
const ORTAK_KOK = join(ORTAK_PROJE, 'tools', 'cep-kopru-paket-' + ORTAK_SURUM, 'CepKopru-Yardimcisi', 'Ortak');
const ORTAK_DOSYALAR = ['HttpIngress.cs', 'RemoteInput.cs', 'PhoneDrive.cs', 'UsbInternetRelay.cs',
    'PairApproval.cs', 'PcKeyboard.cs', 'MousePositionCapture.cs', 'PcAudio.cs', 'PcMic.cs',
    'usb_baglanti.ps1', 'yazdir.ps1'];
// Generate both branded receivers from one engine; preserve Not Bahcesi's local
// token filename and default port, including when scripts are run from source.
let helper = await readFile(join(ORTAK_KOK, 'pc_clipboard_helper.ps1'), 'utf8');
if (!helper.includes("$script:helperVersion = '" + ORTAK_SURUM + "'")) throw new Error('Once guncel ortak yardimci paketini derleyin.');
helper = helper.replace('[int]$Port = 8775', '[int]$Port = 8765')
    .replace("$script:helperApp = 'cep-kopru-pc'", "$script:helperApp = 'not-bahcesi-clipboard'");
await writeFile(join(KOK, 'scripts', 'pc_clipboard_helper.ps1'), helper, 'utf8');
for (const file of ORTAK_DOSYALAR) await copyFile(join(ORTAK_KOK, file), join(KOK, 'scripts', file));
await cp(join(ORTAK_KOK, 'vendor'), join(KOK, 'scripts', 'vendor'), { recursive: true });
const DOSYALAR = [
    'pc_yardimcisi_baslat.cmd',
    'pc_yardimcisi_baslat.ps1',
    'pc_yardimcisi_wifi.cmd',
    'pc_guvenlik_duvari.ps1',
    'pc_tailscale_izni.cmd',
    'pc_tailscale_izin.ps1',
    'pc_clipboard_helper.ps1',
    ...ORTAK_DOSYALAR
];
const OKUBENI = [
    'NOT BAHCESI - PC YARDIMCISI',
    'Surum ' + ORTAK_SURUM + ' - Cep Kopru ile ayni guncel motor.',
    'Iki uygulama icin tek yardimci yeterlidir; 8765 ve 8775 ayni programdadir.',
    'Ilk baglantida her uygulamadan istek gonderin ve bilgisayardan onaylayin.',
    'Guncellerken eski yardimci penceresini kapatin; mevcut anahtarlar korunur.',
    '',
    'TELEFON USB BAGLANTISI - ORTAK YARDIMCI ' + ORTAK_SURUM,
    '  1) ZIP\'in tamamini cikarin. TELEFON-USB-OTOMATIK-KUR.cmd acin.',
    '     Yonetici istemez; kullanicinin Windows baslangicina USB koprusu ekler.',
    '  2) Telefonda USB hata ayiklamayi acin, guvendiginiz bilgisayari onaylayin.',
    '  3) Not Bahcesi > Ayarlar > Bilgisayar baglantisi > Bilgisayar - USB:',
    '     Baglanti istegi gonder; bilgisayarda Izin ver secin.',
    '  Wi-Fi ve Tailscale gerekmez. Cep Kopru de ayni USB koprusunu kullanir.',
    '  USB icin BASLAT.cmd veya WIFI.cmd acmaniz gerekmez.',
    '  Ortak-USB klasorunu silmeyin; erisim anahtarlari pakete dahil degildir.',
    '  Kurum USB/hata ayiklama kullanimini engelliyorsa kisitlari asmayin.',
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
await cp(join(ORTAK_KOK, 'vendor'), join(stage, 'scripts', 'vendor'), {
    recursive: true,
    filter: source => !basename(source).startsWith('.') && !/^(logs|tip-onbellek)$/i.test(basename(source)),
});
for (const dosya of ['BASLAT.cmd', 'WIFI.cmd']) await copyFile(join(KOK, 'scripts', 'yardimci-paket', dosya), join(stage, dosya));
await copyFile(join(KOK, 'scripts', 'yardimci-paket', 'TELEFON-USB-OTOMATIK-KUR.cmd'), join(stage, 'TELEFON-USB-OTOMATIK-KUR.cmd'));
await cp(ORTAK_KOK, join(stage, 'Ortak-USB'), {
    recursive: true,
    filter: source => !basename(source).startsWith('.') && !/^(logs|tip-onbellek)$/i.test(basename(source)),
});
await writeFile(join(stage, 'OKUBENI.txt'), OKUBENI, 'utf8');
await mkdir(HEDEF_KLASOR, { recursive: true });
execFileSync('powershell.exe', ['-NoProfile', '-Command',
    'Compress-Archive -Path "' + join(stage, '*') + '" -DestinationPath "' + HEDEF + '" -CompressionLevel Optimal -Force'], { stdio: 'inherit' });
if (!stage.startsWith(join(tmpdir(), 'nb-yardimci-zip-'))) throw new Error('Geçici paket yolu güvenli değil.');
await rm(stage, { recursive: true, force: true });
console.log('Hazir: ' + HEDEF);
