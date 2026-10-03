/**
 * Play paketi kullanım kılavuzunu (02-kullanim-kilavuzu.md) uygulama içindeki
 * seviyeli kılavuzun verisinden üretir: lib/kilavuzIcerik.ts tek kaynaktır,
 * böylece uygulama ve mağaza belgesi aynı şeyi anlatır.
 *
 * Çalıştırmak için: node --experimental-strip-types scripts/kilavuz-belgesi.mjs
 * (ardından HTML için: node scripts/md-to-html.mjs)
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { SEVIYELER, SSS } = await import(pathToFileURL(join(ROOT, 'lib/kilavuzIcerik.ts')).href);

const satirlar = [
    '# Not Bahçesi — Kullanım Kılavuzu',
    '',
    'Not Bahçesi, notlarını bir ağaç gibi büyütmen için tasarlandı. Her bahçe bir konu,',
    'her not bir ağaç, her alt not bir dal ya da yaprak.',
    '',
    'Bu kılavuz **beş seviyedir**. Başlangıç yalnız uygulamayı tanıtır; her seviye bir',
    'öncekinin üstüne kurulur. İstediğin kadarını öğren: yalnız not tutacaksan ilk iki',
    'seviye yeter, telefonu bilgisayarla kullanmak istersen İleri ve Uzman seviyelerine geç.',
    'Aynı kılavuz uygulamada **Ayarlar → Kullanım kılavuzu** bölümündedir ve kaldığın yeri hatırlar.',
    '',
    '| Seviye | Dersler |',
    '|---|---|',
    ...SEVIYELER.map((s, i) => `| ${i + 1}. ${s.ad} | ${s.dersler.map((d) => d.title).join(' · ')} |`),
    '',
    '---',
    ''
];

SEVIYELER.forEach((seviye, i) => {
    satirlar.push(`## ${i + 1}. seviye — ${seviye.ad}`, '', seviye.ozet, '');
    seviye.dersler.forEach((ders, j) => {
        satirlar.push(`### ${i + 1}.${j + 1} ${ders.title}`, '', `*${ders.description}*`, '');
        ders.adimlar.forEach((adim, k) => satirlar.push(`${k + 1}. ${adim}`));
        satirlar.push('');
        if (ders.ipucu) satirlar.push(`> **İpucu:** ${ders.ipucu}`, '');
    });
    satirlar.push('---', '');
});

satirlar.push('## Sık sorulanlar', '');
for (const { soru, cevap } of SSS) satirlar.push(`### ${soru}`, '', cevap, '');

await writeFile(join(ROOT, 'play-store-paketi/belgeler/02-kullanim-kilavuzu.md'), satirlar.join('\n'), 'utf8');
console.log('Yazildi: play-store-paketi/belgeler/02-kullanim-kilavuzu.md (' + SEVIYELER.length + ' seviye, '
    + SEVIYELER.reduce((n, s) => n + s.dersler.length, 0) + ' ders)');
