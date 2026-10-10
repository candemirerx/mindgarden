/**
 * Not Bahcesi - Play Store paketini masaustune zip olarak hazirlar.
 *
 * Kullanim:
 *   node scripts/paket-zip.mjs                (masaustunde "Not Bahcesi Play Store" klasoru)
 *   node scripts/paket-zip.mjs --zip          (ayrica masaustune zip)
 *   node scripts/paket-zip.mjs --zip <hedef.zip>
 *   NB_ZIP_HEDEF=<yol> ile de zip hedefi verilebilir.
 *
 * Yaptigi isler:
 *   1) Surum bilgisini kaynaktan okur (lib/config.ts + android/app/build.gradle).
 *   2) play-store-paketi/uygulama icindeki AAB ve APK'nin boyut/ozet bilgisini
 *      play-store-paketi/SURUM-BILGILERI.txt dosyasina yazar.
 *   3) Belgeleri, gorselleri, iki paketi ve PC yardimcisini gecici klasore
 *      kopyalar; varsa eski zip'i yedekleyip yenisini olusturur.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

const KOK = resolve(import.meta.dirname, '..');
const PAKET = join(KOK, 'play-store-paketi');

const surum = /APP_VERSION\s*=\s*'([^']+)'/.exec(await readFile(join(KOK, 'lib/config.ts'), 'utf8'))?.[1];
const surumKodu = /(?:^|\s)versionCode\s+(\d+)/m.exec(await readFile(join(KOK, 'android/app/build.gradle'), 'utf8'))?.[1];
const androidDegiskenler = await readFile(join(KOK, 'android/variables.gradle'), 'utf8');
const minSdk = /minSdkVersion\s*=\s*(\d+)/.exec(androidDegiskenler)?.[1];
const targetSdk = /targetSdkVersion\s*=\s*(\d+)/.exec(androidDegiskenler)?.[1];
if (!minSdk || !targetSdk) throw new Error('Android SDK seviyeleri okunamadi.');
if (!surum || !surumKodu) throw new Error('Surum bilgisi okunamadi (lib/config.ts, android/app/build.gradle).');

const aab = join(PAKET, 'uygulama', 'not-bahcesi-' + surum + '.aab');
const apk = join(PAKET, 'uygulama', 'not-bahcesi-' + surum + '.apk');
for (const dosya of [aab, apk]) {
    if (!existsSync(dosya)) {
        throw new Error('Paket bulunamadi: ' + dosya + '\nOnce derleyin: npm run build:android, sonra android klasorunde: gradlew assembleRelease bundleRelease');
    }
}

const ozet = async (yol) => {
    const veri = await readFile(yol);
    return { boyut: veri.length, sha256: createHash('sha256').update(veri).digest('hex').toUpperCase() };
};
const aabBilgi = await ozet(aab);
const apkBilgi = await ozet(apk);

let parmakIzi = '(assetlinks.json okunamadi)';
try {
    const link = JSON.parse(await readFile(join(KOK, 'public/.well-known/assetlinks.json'), 'utf8'));
    parmakIzi = link[0].target.sha256_cert_fingerprints.join(', ');
} catch { /* yalniz bilgi amacli */ }

const bugun = new Date().toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
const bilgi = [
    'NOT BAHCESI - SURUM BILGILERI',
    'Olusturma: ' + bugun,
    '',
    'Surum      : ' + surum + ' (surum kodu ' + surumKodu + ')',
    'Paket adi  : com.notbahcesi.app',
    'Hedef API  : ' + targetSdk + '   (minSdk ' + minSdk + ')',
    'Imza SHA-256: ' + parmakIzi,
    '',
    'Play Console\'a yuklenecek dosya:',
    '  uygulama/not-bahcesi-' + surum + '.aab',
    '    Boyut  : ' + aabBilgi.boyut.toLocaleString('tr-TR') + ' bayt',
    '    SHA-256: ' + aabBilgi.sha256,
    '',
    'Telefonda denemek icin imzali APK:',
    '  uygulama/not-bahcesi-' + surum + '.apk',
    '    Boyut  : ' + apkBilgi.boyut.toLocaleString('tr-TR') + ' bayt',
    '    SHA-256: ' + apkBilgi.sha256,
    '',
    'Not: Her yeni yuklemede android/app/build.gradle icindeki versionCode artirilmalidir.',
    'Yayin adresleri:',
    '  Gizlilik    : https://mindgarden-neon.vercel.app/gizlilik',
    '  Veri silme  : https://mindgarden-neon.vercel.app/veri-silme',
    '  assetlinks  : https://mindgarden-neon.vercel.app/.well-known/assetlinks.json',
    ''
].join('\n');
await writeFile(join(PAKET, 'SURUM-BILGILERI.txt'), bilgi, 'utf8');
console.log('Yazildi: play-store-paketi/SURUM-BILGILERI.txt');

const yardimciOkU = [
    'NOT BAHCESI - PC YARDIMCISI',
    '',
    'NE ZAMAN GEREKIR?',
    '  - Bilgisayar Wi-Fi ve Tailscale: yazma, fare, kisayol ve pano icin.',
    '  - Kart Wi-Fi, Kart AP, Kart Bluetooth ve Bilgisayar Bluetooth yollarinda',
    '    yazma ve fare programsiz calisir; yalniz PANOYA GONDERMEK icin gerekir.',
    '',
    'BASLATMA',
    '  1) pc_yardimcisi_baslat.cmd dosyasina cift tiklayin.',
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
    '  - Tailscale: iki cihazda ayni hesapla Tailscale acik olsun. Bilgisayarda',
    '    pc_tailscale_izni.cmd ile guvenlik duvari iznini bir kez verin;',
    '    telefonda bilgisayarin 100.x adresini/adini ve ilk eslesme kodunu girin.',
    '  - Kart yollarinda pano, kartin bilgisayara bagli USB kablosundan yardimciya',
    '    iletilir; ayrica bilgisayar eslesmesi gerekmez.',
    '  Eslesen telefon bir daha kod sormaz. Sonraki kullanimlarda yalniz bu',
    '  programi calistirmaniz yeterlidir.',
    '',
    'Bilgisayar her acildiginda yardimciyi yeniden calistirin (pencere kapaninca durur).',
    'Gizlilik: Yardimci kullanicinin kendi bilgisayarina yerel ag/Bluetooth veya',
    'kendi Tailscale agi uzerinden ulasir. Erisim anahtari .pc_clipboard_token dosyasindadir;',
    'kimseyle paylasmayin. Kapatmak icin pencerede Ctrl+C.',
    'Ayrintili anlatim: bilgisayar-araclari.md',
    ''
].join('\n');

const geciciKok = resolve(tmpdir());
const stage = resolve(geciciKok, 'nb-play-staging');
if (dirname(stage) !== geciciKok || basename(stage) !== 'nb-play-staging') throw new Error('Gecici klasor yolu beklenmedik: ' + stage);
await rm(stage, { recursive: true, force: true });
await mkdir(join(stage, 'belgeler'), { recursive: true });
await mkdir(join(stage, 'gorseller'), { recursive: true });
await mkdir(join(stage, 'uygulama'), { recursive: true });
await mkdir(join(stage, 'bilgisayar-yardimcisi'), { recursive: true });

const kopyala = async (kaynak, hedefKlasor) => copyFile(kaynak, join(hedefKlasor, kaynak.split(/[\\/]/).pop()));

await kopyala(join(PAKET, 'OKUBENI.md'), stage);
await kopyala(join(PAKET, 'basla.html'), stage);
await kopyala(join(PAKET, 'SURUM-BILGILERI.txt'), stage);

for (const dosya of await readdir(join(PAKET, 'belgeler'))) {
    await copyFile(join(PAKET, 'belgeler', dosya), join(stage, 'belgeler', dosya));
}
for (const dosya of await readdir(join(PAKET, 'gorseller'))) {
    await copyFile(join(PAKET, 'gorseller', dosya), join(stage, 'gorseller', dosya));
}
await kopyala(aab, join(stage, 'uygulama'));
await kopyala(apk, join(stage, 'uygulama'));

const yardimciDosyalar = [
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
for (const dosya of yardimciDosyalar) {
    const kaynak = join(KOK, 'scripts', dosya);
    if (existsSync(kaynak)) {
        const hedefDosya = join(stage, 'bilgisayar-yardimcisi', dosya);
        await mkdir(resolve(hedefDosya, '..'), { recursive: true });
        await copyFile(kaynak, hedefDosya);
    }
}
await writeFile(join(stage, 'bilgisayar-yardimcisi', 'OKU.txt'), yardimciOkU, 'utf8');
const yardimciBelge = join(KOK, 'docs/bilgisayar-araclari.md');
if (existsSync(yardimciBelge)) await copyFile(yardimciBelge, join(stage, 'bilgisayar-yardimcisi/bilgisayar-araclari.md'));

const masaustu = ['Masaüstü', 'Desktop']
    .map((ad) => join(process.env.USERPROFILE || '', ad))
    .find((yol) => existsSync(yol)) || process.env.USERPROFILE;
const arsiv = join(masaustu, 'Not Bahçesi Arşiv');
const damga = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const klasor = join(masaustu, 'Not Bahcesi Play Store');
const zipIstendi = process.argv.includes('--zip') || !!process.env.NB_ZIP_HEDEF;
const hedef = process.env.NB_ZIP_HEDEF
    || process.argv.slice(2).find((a) => a.toLowerCase().endsWith('.zip'))
    || join(masaustu, 'Not Bahcesi Guncel.zip');
const izinliHedefler = new Set([resolve(klasor), resolve(hedef)]);

/** Var olan hedefi masaüstünü doldurmasın diye "Not Bahçesi Arşiv" klasörüne taşır. */
async function arsivle(yol) {
    if (!izinliHedefler.has(resolve(yol))) throw new Error('Arsiv hedefi beklenmedik: ' + yol);
    if (!existsSync(yol)) return;
    const ad = yol.split(/[\\/]/).pop();
    let yeni = join(arsiv, ad.replace(/(\.zip)?$/i, ' - onceki ' + damga + '$1'));
    for (let sayac = 2; existsSync(yeni); sayac++) yeni = join(arsiv, ad.replace(/(\.zip)?$/i, ' - onceki ' + damga + '-' + sayac + '$1'));
    const altYol = relative(resolve(arsiv), resolve(yeni));
    if (!altYol || altYol.startsWith('..') || isAbsolute(altYol)) throw new Error('Arsiv yolu klasor disinda: ' + yeni);
    await mkdir(arsiv, { recursive: true });
    await rename(yol, yeni);
    console.log('Onceki surum arsivlendi: ' + yeni);
}

// 1) Açık klasör: Play Console'a yüklerken dosyalar doğrudan seçilir.
await arsivle(klasor);
await cp(stage, klasor, { recursive: true, force: false, errorOnExist: true });
console.log('Hazir: ' + klasor);

// 2) İstenirse zip (paylaşmak için).
if (zipIstendi) {
    await arsivle(hedef);
    execFileSync('powershell.exe', [
        '-NoProfile',
        '-Command',
        'Compress-Archive -Path (Join-Path $env:NB_PAKET_STAGE "*") -DestinationPath $env:NB_PAKET_ZIP -CompressionLevel Optimal -Force'
    ], { stdio: 'inherit', env: { ...process.env, NB_PAKET_STAGE: stage, NB_PAKET_ZIP: resolve(hedef) } });
    console.log('Zip: ' + hedef + '  (' + ((await stat(hedef)).size / 1048576).toFixed(2) + ' MB)');
}
console.log('Surum: ' + surum + ' (' + surumKodu + ') - AAB ' + aabBilgi.sha256.slice(0, 16) + '...');
