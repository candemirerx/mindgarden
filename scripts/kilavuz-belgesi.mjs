/**
 * Play paketi kullanım kılavuzunu (02-kullanim-kilavuzu.md) uygulama içindeki
 * kılavuzun verisinden üretir: lib/kilavuzIcerik.ts tek kaynaktır, böylece
 * uygulama ve mağaza belgesi aynı şeyi anlatır.
 *
 * Çalıştırmak için: node --experimental-strip-types scripts/kilavuz-belgesi.mjs
 * (ardından HTML için: node scripts/md-to-html.mjs)
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { SEVIYELER, YOLLAR, SOZLUK, SSS, TUM_DERSLER } = await import(pathToFileURL(join(ROOT, 'lib/kilavuzIcerik.ts')).href);
const { GOREVLER } = await import(pathToFileURL(join(ROOT, 'lib/kilavuzGorevleri.ts')).href);
const EKRAN = { ana: 'Ana ekran', liste: 'Liste', tuval: 'Tuval', editor: 'Editör' };

const dakika = (dersler) => dersler.reduce((n, d) => n + d.sure, 0);
/** Belge içi bağlantı: ders başlığına giden çapa. */
const numara = new Map();
SEVIYELER.forEach((s, i) => s.dersler.forEach((d, j) => numara.set(d.id, `${i + 1}.${j + 1}`)));
const dersAdi = (id) => {
    const d = TUM_DERSLER.find((x) => x.id === id);
    return `${numara.get(id)} ${d.title}`;
};

const satirlar = [
    '# Not Bahçesi — Kullanım Kılavuzu',
    '',
    'Not Bahçesi, notlarınızı iç içe tutan bir not uygulamasıdır: büyük bir konuyu başlıklara, başlıkları alt',
    'başlıklara bölersiniz. Telefonda, bilgisayarda ve web sitesinde çalışır; Google ile giriş yaptığınızda notlarınız bütün cihazlarınızda eşitlenir.',
    '',
    'Kılavuz iki bölümden oluşur:',
    '',
    `- **Teorik öğrenim:** beş seviyede **${TUM_DERSLER.length} kısa ders** (toplam yaklaşık ${dakika(TUM_DERSLER)} dakika). Her ders aynı kalıbı izler: **hedef**, adımlar, **Şimdi deneyin**, **Akılda kalsın** (özet) ve çoğunda tek soruluk **Kendinizi sınayın**.`,
    `- **Uygulamalı öğrenim:** **${GOREVLER.length} görev**. Uygulamada bir görevi başlattığınızda yapılacak yer ekranda parlar; siz işi yaptıkça görev kendiliğinden sonraki adıma geçer.`,
    '',
    'Aynı kılavuz uygulamada **Ayarlar → Kullanım kılavuzu** bölümündedir; üstteki sekmelerle iki bölüm arasında geçersiniz.',
    'Kaldığınız yeri hatırlar; uygulamada yaptığınız işler ilgili dersleri kendiliğinden tamamlar.',
    '',
    '## Nereden başlamalı?',
    '',
    'Seviyeleri sırayla izleyebilir ya da amacınıza göre yalnız gereken dersleri okuyabilirsiniz:',
    '',
    '| Amacınız | Okuyacağınız dersler |',
    '|---|---|',
    ...YOLLAR.map((y) => `| **${y.baslik}** — ${y.aciklama} | ${y.dersler.map(dersAdi).join(' · ')} |`),
    '',
    '| Seviye | Dersler | Süre |',
    '|---|---|---|',
    ...SEVIYELER.map((s, i) => `| ${i + 1}. ${s.ad} | ${s.dersler.map((d) => d.title).join(' · ')} | ~${dakika(s.dersler)} dk |`),
    '',
    '---',
    '',
];

const cevaplar = [];

SEVIYELER.forEach((seviye, i) => {
    satirlar.push(`## ${i + 1}. seviye — ${seviye.ad}`, '', `*${seviye.dersler.length} ders · yaklaşık ${dakika(seviye.dersler)} dakika*`, '', seviye.ozet, '');
    seviye.dersler.forEach((ders, j) => {
        const no = `${i + 1}.${j + 1}`;
        satirlar.push(`### ${no} ${ders.title}`, '', `*${ders.description} · ${ders.sure} dk*`, '');
        satirlar.push(`**Bu dersin sonunda:** ${ders.hedef}`, "");
        ders.adimlar.forEach((adim, k) => satirlar.push(`${k + 1}. ${adim}`));
        satirlar.push('');
        if (ders.dene) satirlar.push(`> **Şimdi deneyin:** ${ders.dene}`, '');
        if (ders.ipucu) satirlar.push(`> **İpucu:** ${ders.ipucu}`, '');
        satirlar.push(`**Akılda kalsın:** ${ders.hatirla}`, '');
        if (ders.soru) {
            satirlar.push(`**Kendinizi sınayın:** ${ders.soru.soru}`, '');
            ders.soru.secenekler.forEach((s, k) => satirlar.push(`- ${String.fromCharCode(65 + k)}) ${s}`));
            satirlar.push('', `*Yanıt: kılavuzun sonundaki "Yanıtlar" bölümünde (${no}).*`, '');
            cevaplar.push(`- **${no}** — ${String.fromCharCode(65 + ders.soru.dogru)}) ${ders.soru.secenekler[ders.soru.dogru]}. ${ders.soru.aciklama}`);
        }
    });
    satirlar.push('---', '');
});

satirlar.push('## Uygulamalı öğrenim: adım adım görevler', '', 'Uygulamada **Ayarlar → Kullanım kılavuzu → Uygulamalı öğrenim** sekmesinden bir görevi başlatın. Her adımda yapılacak yer vurgulanır; o işi yaptığınızda sonraki adıma geçilir. Kartın çarpısı görevi istediğiniz an bırakır.', '');
GOREVLER.forEach((g, i) => {
    satirlar.push(`### Görev ${i + 1}: ${g.baslik}`, '', `*${g.aciklama} · ${g.adimlar.length} adım · ${g.sure} dk*`, '');
    g.adimlar.forEach((a, k) => satirlar.push(`${k + 1}. **${a.baslik}** (${EKRAN[a.ekran]}): ${a.metin}`));
    satirlar.push('', `**Öğrendikleriniz:** ${g.kazanimlar.join(' ')}`, '', `*İlgili dersler: ${g.dersler.map(dersAdi).join(' · ')}*`, '');
});
satirlar.push('---', '');

satirlar.push('## Sözlük', '', '| Terim | Anlamı |', '|---|---|');
for (const { terim, tanim } of SOZLUK) satirlar.push(`| **${terim}** | ${tanim} |`);
satirlar.push('', '---', '');

satirlar.push('## Sık sorulanlar', '');
for (const { soru, cevap } of SSS) satirlar.push(`### ${soru}`, '', cevap, '');
satirlar.push('---', '');

satirlar.push('## Yanıtlar', '', '"Kendinizi sınayın" sorularının yanıtları:', '', ...cevaplar, '');

await writeFile(join(ROOT, 'play-store-paketi/belgeler/02-kullanim-kilavuzu.md'), satirlar.join('\n'), 'utf8');
console.log('Yazildi: play-store-paketi/belgeler/02-kullanim-kilavuzu.md (' + SEVIYELER.length + ' seviye, '
    + TUM_DERSLER.length + ' ders, ' + cevaplar.length + ' soru)');
