#!/usr/bin/env node
/**
 * Yayın kapısı (release gate).
 *
 * Kaynak kod, Android derlemesi, dağıtım paketi (AAB), imzalama anahtarı ve
 * mağaza belgelerinin AYNI sürümü gösterdiğini doğrular. Play Store'a yükleme
 * öncesi çalıştırılır:
 *
 *   node scripts/yayin-dogrula.mjs
 *
 * Tek bir kontrol bile başarısız olursa çıkış kodu 1 olur; böylece CI ya da
 * elle yükleme öncesi adım olarak kullanılabilir.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const oku = (goreli) => readFileSync(path.join(kok, goreli), 'utf8');
const varMi = (goreli) => existsSync(path.join(kok, goreli));

const sonuclar = [];
const kontrol = (ad, gecti, ayrinti) => {
  sonuclar.push({ ad, gecti: Boolean(gecti), ayrinti: ayrinti ?? '' });
  return Boolean(gecti);
};

/* ------------------------------------------------------------------ *
 * 1. Kaynak sürümü: lib/config.ts, package.json, android/app/build.gradle
 * ------------------------------------------------------------------ */
const configSurum = /APP_VERSION\s*=\s*'([^']+)'/.exec(oku('lib/config.ts'))?.[1] ?? null;
const paketSurum = JSON.parse(oku('package.json')).version ?? null;
const gradle = oku('android/app/build.gradle');
const gradleSurum = /versionName\s+"([^"]+)"/.exec(gradle)?.[1] ?? null;
const gradleKodHam = /(?:^|\s)versionCode\s+(\d+)/m.exec(gradle)?.[1] ?? null;
const gradleKod = gradleKodHam === null ? null : Number(gradleKodHam);

const surum = configSurum;

kontrol(
  'Kaynak sürümleri aynı (lib/config.ts, package.json, build.gradle)',
  configSurum !== null && configSurum === paketSurum && configSurum === gradleSurum,
  `lib/config.ts=${configSurum} · package.json=${paketSurum} · build.gradle=${gradleSurum}`
);

kontrol(
  'versionCode geçerli bir tamsayı ve 1\u2019den büyük',
  Number.isInteger(gradleKod) && gradleKod > 1,
  `versionCode=${gradleKodHam}`
);

/* ------------------------------------------------------------------ *
 * 2. Belgeler ve dağıtım paketi adı aynı sürümü anmalı
 * ------------------------------------------------------------------ */
const belgeDosyalari = [
  'README.md',
  'play-store-paketi/OKUBENI.md',
  'play-store-paketi/basla.html',
  ...readdirSync(path.join(kok, 'play-store-paketi/belgeler')).map((ad) => `play-store-paketi/belgeler/${ad}`),
].filter((goreli) => varMi(goreli));

const eskiAabReferanslari = [];
const aabReferanslari = [];

for (const belge of belgeDosyalari) {
  const icerik = oku(belge);
  for (const eslesme of icerik.matchAll(/not-bahcesi-(\d+\.\d+\.\d+)\.aab/g)) {
    aabReferanslari.push({ belge, surum: eslesme[1] });
    if (surum && eslesme[1] !== surum) eskiAabReferanslari.push(`${belge} \u2192 ${eslesme[0]}`);
  }
}

kontrol(
  surum ? `Belgelerdeki AAB adları güncel sürümü (${surum}) gösteriyor` : 'Belgelerdeki AAB adları güncel sürümü gösteriyor',
  eskiAabReferanslari.length === 0,
  eskiAabReferanslari.length === 0
    ? `${aabReferanslari.length} referans denetlendi`
    : `eski sürüme işaret eden ${eskiAabReferanslari.length} referans: ${eskiAabReferanslari.join(' | ')}`
);

// "Şu anki durum: versionCode X, versionName \"Y\"" biçimindeki ifadeler bayat kalmasın.
const surumBildirimleri = [];
const bayatSurumBildirimleri = [];
for (const belge of belgeDosyalari) {
  for (const eslesme of oku(belge).matchAll(/[Ss]ürüm:\*\*\s*([0-9]+\.[0-9]+\.[0-9]+)/g)) {
    surumBildirimleri.push({ belge, surum: eslesme[1] });
    if (surum && eslesme[1] !== surum) bayatSurumBildirimleri.push(`${belge} \u2192 ${eslesme[1]}`);
  }
  for (const eslesme of oku(belge).matchAll(/[Ss]u anki sürüm[^\n]*?`?(\d{2,})`?\s*\/\s*`?([0-9]+\.[0-9]+\.[0-9]+)/g)) {
    if (surum && eslesme[2] !== surum) bayatSurumBildirimleri.push(`${belge} \u2192 ${eslesme[2]}`);
  }
}

kontrol(
  'Belgelerdeki "Sürüm:" başlıkları güncel sürümü gösteriyor',
  bayatSurumBildirimleri.length === 0,
  bayatSurumBildirimleri.length === 0
    ? `${surumBildirimleri.length} başlık denetlendi`
    : `bayat: ${bayatSurumBildirimleri.join(' | ')}`
);

/* ------------------------------------------------------------------ *
 * 3. Dağıtım paketi dosyası
 * ------------------------------------------------------------------ */
const uygulamaDizini = 'play-store-paketi/uygulama';
const beklenenAab = surum ? `${uygulamaDizini}/not-bahcesi-${surum}.aab` : null;
const aabVar = beklenenAab ? varMi(beklenenAab) : false;
const aabBoyut = aabVar ? readFileSync(path.join(kok, beklenenAab)).length : 0;

kontrol(
  beklenenAab ? `${beklenenAab} mevcut ve boş değil` : 'Dağıtım paketi (AAB) mevcut',
  aabVar && aabBoyut > 100_000,
  aabVar ? `${aabBoyut.toLocaleString('tr-TR')} bayt` : 'bulunamadı'
);

/* ------------------------------------------------------------------ *
 * 4. Play Store web gereksinimleri
 * ------------------------------------------------------------------ */
const assetlinksYolu = 'public/.well-known/assetlinks.json';
let assetlinks = null;
let assetlinksHatasi = '';
try {
  assetlinks = JSON.parse(oku(assetlinksYolu));
} catch (hata) {
  assetlinksHatasi = hata instanceof Error ? hata.message : String(hata);
}

kontrol(
  `${assetlinksYolu} geçerli JSON`,
  assetlinks !== null,
  assetlinksHatasi || 'okundu'
);

const hedef = Array.isArray(assetlinks) ? assetlinks[0] : null;
const parmakIzi = hedef?.target?.sha256_cert_fingerprints?.[0] ?? null;
const parmakIziGecerli = typeof parmakIzi === 'string' && /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(parmakIzi);

kontrol(
  'assetlinks.json paket adı com.notbahcesi.app',
  hedef?.target?.package_name === 'com.notbahcesi.app',
  `package_name=${hedef?.target?.package_name ?? 'yok'}`
);

kontrol(
  'assetlinks.json SHA-256 parmak izi biçimi geçerli',
  parmakIziGecerli,
  parmakIzi ?? 'yok'
);

for (const sayfa of ['app/veri-silme/page.tsx', 'app/gizlilik/page.tsx']) {
  kontrol(`${sayfa} mevcut (Play mağaza bağlantısı)`, varMi(sayfa), varMi(sayfa) ? 'var' : 'yok');
}

/* ------------------------------------------------------------------ *
 * 5. İmzalama anahtarı ve assetlinks parmak izi uyumu
 * ------------------------------------------------------------------ */
const keystoreOzellikleri = 'android/keystore.properties';
const jksYolu = 'android/app/notbahcesi-release.jks';

kontrol(`${keystoreOzellikleri} mevcut (repoya girmemeli)`, varMi(keystoreOzellikleri), varMi(keystoreOzellikleri) ? 'var' : 'yok');
kontrol(`${jksYolu} mevcut`, varMi(jksYolu), varMi(jksYolu) ? 'var' : 'yok');

let imzaKontrolu = 'atlandı (keystore.properties ya da keytool yok)';
let imzaGecti = true;
if (varMi(keystoreOzellikleri) && varMi(jksYolu)) {
  const ozellikler = oku(keystoreOzellikleri);
  const al = (anahtar) => new RegExp(`^\\s*${anahtar}\\s*=\\s*(.+)\\s*$`, 'm').exec(ozellikler)?.[1]?.trim() ?? null;
  const sifre = al('storePassword');
  const alias = al('keyAlias');
  const javaHome = process.env.JAVA_HOME;
  const keytool = javaHome ? path.join(javaHome, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool') : 'keytool';
  try {
    const cikti = execFileSync(keytool, ['-list', '-v', '-keystore', jksYolu, '-alias', alias ?? 'notbahcesi', '-storepass', sifre ?? ''], {
      cwd: kok,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const bulunan = /SHA256:\s*([0-9A-F:]+)/i.exec(cikti)?.[1]?.trim().toUpperCase().replace(/\s+/g, '') ?? null;
    if (!bulunan) {
      imzaKontrolu = 'keytool çıktısında SHA256 bulunamadı';
      imzaGecti = false;
    } else if (parmakIziGecerli && bulunan !== parmakIzi.replace(/\s+/g, '').toUpperCase()) {
      imzaKontrolu = `uyuşmuyor: keystore=${bulunan} · assetlinks=${parmakIzi}`;
      imzaGecti = false;
    } else {
      imzaKontrolu = `uyuşuyor: ${bulunan}`;
    }
  } catch (hata) {
    imzaKontrolu = `keytool çalıştırılamadı: ${hata instanceof Error ? hata.message.split('\n')[0] : String(hata)}`;
  }
}

kontrol('Yükleme anahtarı parmak izi assetlinks.json ile uyuşuyor', imzaGecti, imzaKontrolu);

/* ------------------------------------------------------------------ *
 * Rapor
 * ------------------------------------------------------------------ */
console.log('\nNot Bahçesi \u2014 yayın kapısı denetimi');
console.log(`Sürüm: ${surum ?? '?'} (versionCode ${gradleKodHam ?? '?'})\n`);

let hata = 0;
for (const { ad, gecti, ayrinti } of sonuclar) {
  if (!gecti) hata += 1;
  console.log(`${gecti ? '[ OK ]' : '[HATA]'} ${ad}`);
  if (ayrinti) console.log(`       ${ayrinti}`);
}

console.log(`\n${sonuclar.length - hata}/${sonuclar.length} kontrol geçti.`);
if (hata > 0) {
  console.log('\nYayın kapısı KAPALI: yukarıdaki maddeler giderilmeden yükleme yapılmamalı.');
  process.exit(1);
}
console.log('\nYayın kapısı açık.');
