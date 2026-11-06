// Mevcut yayın kılavuzlarındaki sürüm referanslarını mekanik olarak eşitle.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const code = Number(/versionCode\s+(\d+)/.exec(readFileSync('android/app/build.gradle', 'utf8'))[1]);
const files = ['README.md', 'play-store-paketi/OKUBENI.md', 'play-store-paketi/basla.html',
    ...readdirSync('play-store-paketi/belgeler').map(n => 'play-store-paketi/belgeler/' + n)];
for (const file of files) {
    let text = readFileSync(file, 'utf8');
    text = text.replace(/not-bahcesi-\d+\.\d+\.\d+\.(aab|apk)/g, (_, ext) => `not-bahcesi-${version}.${ext}`)
        .replace(/Sürüm:\*\* [\d.]+ \(sürüm kodu \d+\)/g, `Sürüm:** ${version} (sürüm kodu ${code})`)
        .replace(/<strong>1\.0\.8<\/strong> \(kod 90\)/g, `<strong>${version}</strong> (kod ${code})`)
        .replace(/versionCode \d+/g, `versionCode ${code}`)
        .replace(/versionName "[\d.]+"/g, `versionName "${version}"`)
        .replace(/en az 80/g, `en az ${code + 1}`)
        .replace(/sürüm kodu \*\*79\*\*, sürüm adı \*\*1\.0\.1\*\*/g, `sürüm kodu **${code}**, sürüm adı **${version}**`)
        .replace(/sürüm kodu <strong>79<\/strong>, sürüm adı <strong>1\.0\.1<\/strong>/g, `sürüm kodu <strong>${code}</strong>, sürüm adı <strong>${version}</strong>`)
        .replace(/Şu anki sürüm <code>79<\/code> \/ <code>1\.0\.1<\/code>/g, `Şu anki sürüm <code>${code}</code> / <code>${version}</code>`);
    if (file.endsWith('/07-izin-gerekceleri.html')) {
        text = text.replace('Hayır; yalnızca cihazdaki Android konuşma tanıma servisine.', 'Android konuşma tanıma servisi cihazda veya kendi sunucusunda işleyebilir; uygulama ayrı ses kaydı saklamaz.')
            .replace('Notlar cihazda; yedekleme (açılırsa) kullanıcının kendi Google Drive hesabında.', 'Notlar cihazda; yedekleme açılırsa kendi Drive hesabında. Bulut AI seçilen metin/görseli işler; kota özeti 48 saat, onaylı yanıt bildirimleri 30 gün saklanır.');
    }
    writeFileSync(file, text);
}
console.log(`Yayın kılavuzları: ${version} (${code})`);
