/**
 * play-store-paketi içindeki Markdown belgelerini, telefondan rahat okunacak
 * biçimde stillenmiş HTML dosyalarına çevirir ve bir başlangıç sayfası üretir.
 *
 * Çalıştırmak için: node scripts/md-to-html.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const PAKET = join(ROOT, 'play-store-paketi');
const BELGELER = join(PAKET, 'belgeler');

const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Satır içi biçimlendirme: kalın, eğik ve satır içi kod. */
function inline(text) {
    return esc(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

function renderTable(rows) {
    const cells = (line) =>
        line
            .replace(/^\||\|$/g, '')
            .split('|')
            .map((c) => c.trim());

    const head = cells(rows[0]);
    const body = rows.slice(2).map(cells);

    return `<div class="tablo-sarmal"><table>
<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>
<tbody>${body
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>
</table></div>`;
}

function markdownToHtml(md) {
    const lines = md.split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Kod bloğu
        if (line.trim().startsWith('```')) {
            const buf = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                buf.push(lines[i]);
                i++;
            }
            i++;
            out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
            continue;
        }

        // Tablo
        if (line.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
            const rows = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                rows.push(lines[i].trim());
                i++;
            }
            out.push(renderTable(rows));
            continue;
        }

        // Başlıklar
        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length;
            out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            i++;
            continue;
        }

        // Yatay çizgi
        if (/^---+\s*$/.test(line)) {
            out.push('<hr />');
            i++;
            continue;
        }

        // Alıntı
        if (line.trim().startsWith('>')) {
            const buf = [];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                buf.push(lines[i].replace(/^\s*>\s?/, ''));
                i++;
            }
            out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
            continue;
        }

        // Listeler
        const isUl = /^\s*[-*]\s+/.test(line);
        const isOl = /^\s*\d+\.\s+/.test(line);
        if (isUl || isOl) {
            const tag = isUl ? 'ul' : 'ol';
            const items = [];
            while (
                i < lines.length &&
                (isUl ? /^\s*[-*]\s+/.test(lines[i]) : /^\s*\d+\.\s+/.test(lines[i]))
            ) {
                items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
                i++;
            }
            out.push(
                `<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`
            );
            continue;
        }

        // Boş satır
        if (!line.trim()) {
            i++;
            continue;
        }

        // Paragraf
        const buf = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+\.\s|\||```|---+\s*$)/.test(lines[i])
        ) {
            buf.push(lines[i]);
            i++;
        }
        out.push(`<p>${inline(buf.join(' '))}</p>`);
    }

    return out.join('\n');
}

const STIL = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 20px 16px 64px;
  font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
  font-size: 17px;
  line-height: 1.65;
  color: #2C251D;
  background: #F6F3EE;
  -webkit-text-size-adjust: 100%;
}
.icerik { max-width: 760px; margin: 0 auto; }
h1 { font-size: 26px; line-height: 1.25; margin: 8px 0 20px; color: #1B3A28; }
h2 {
  font-size: 21px; margin: 34px 0 12px; color: #275939;
  border-bottom: 2px solid #DEEDDA; padding-bottom: 6px;
}
h3 { font-size: 18px; margin: 26px 0 10px; color: #306C47; }
h4 { font-size: 17px; margin: 20px 0 8px; }
p { margin: 0 0 14px; }
a { color: #275939; }
ul, ol { margin: 0 0 16px; padding-left: 22px; }
li { margin-bottom: 7px; }
hr { border: 0; border-top: 1px solid #DAD3C9; margin: 30px 0; }
code {
  background: #EAE5DE; padding: 2px 6px; border-radius: 5px;
  font-family: Consolas, Menlo, monospace; font-size: 15px;
}
pre {
  background: #2C251D; color: #F6F3EE; padding: 14px 16px; border-radius: 12px;
  overflow-x: auto; font-size: 14px; line-height: 1.5;
}
pre code { background: none; color: inherit; padding: 0; }
blockquote {
  margin: 0 0 16px; padding: 12px 16px;
  background: #FDF8E9; border-left: 4px solid #E0A632; border-radius: 0 10px 10px 0;
}
blockquote p { margin: 0; }
.tablo-sarmal { overflow-x: auto; margin: 0 0 18px; }
table { border-collapse: collapse; width: 100%; font-size: 15px; }
th, td { border: 1px solid #DAD3C9; padding: 8px 10px; text-align: left; vertical-align: top; }
th { background: #DEEDDA; color: #1B3A28; }
strong { color: #1B3A28; }
.geri {
  display: inline-block; margin-bottom: 18px; font-size: 15px;
  text-decoration: none; color: #275939; font-weight: 600;
}
.kart {
  display: block; padding: 16px 18px; margin-bottom: 12px;
  background: #fff; border: 1px solid #DAD3C9; border-radius: 14px;
  text-decoration: none; color: inherit;
}
.kart strong { display: block; font-size: 17px; margin-bottom: 4px; }
.kart span { font-size: 14px; color: #5B5348; }
@media (prefers-color-scheme: dark) {
  body { background: #1E1813; color: #EAE5DE; }
  h1 { color: #DEEDDA; }
  h2 { color: #BBDCC1; border-bottom-color: #275939; }
  h3 { color: #91C39D; }
  strong { color: #F0F7EF; }
  a, .geri { color: #91C39D; }
  code { background: #2C251D; color: #DEEDDA; }
  .kart { background: #2C251D; border-color: #463F36; }
  .kart span { color: #ADA396; }
  th { background: #275939; color: #F0F7EF; }
  th, td { border-color: #463F36; }
  blockquote { background: #361C09; border-left-color: #C9841B; }
  hr { border-top-color: #463F36; }
}
`;

function sayfa(baslik, govde) {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(baslik)}</title>
<style>${STIL}</style>
</head>
<body>
<div class="icerik">
<a class="geri" href="../basla.html">← Başlangıç sayfası</a>
${govde}
</div>
</body>
</html>`;
}

const dosyalar = (await readdir(BELGELER)).filter((f) => f.endsWith('.md'));
const uretilen = [];

for (const dosya of dosyalar) {
    const md = await readFile(join(BELGELER, dosya), 'utf8');
    const baslik = (md.match(/^#\s+(.*)$/m)?.[1] ?? basename(dosya)).trim();
    const hedef = join(BELGELER, dosya.replace(/\.md$/, '.html'));
    await writeFile(hedef, sayfa(baslik, markdownToHtml(md)), 'utf8');
    uretilen.push({ dosya: dosya.replace(/\.md$/, '.html'), baslik });
}

// Başlangıç sayfası
const aciklamalar = {
    '01-yukleme-rehberi.html': 'Play Console\'da sırayla yapılacaklar',
    '02-kullanim-kilavuzu.html': 'Uygulamayı nasıl kullanacağın',
    '03-magaza-metinleri.html': 'Mağazaya kopyalanacak açıklama metinleri',
    '04-veri-guvenligi.html': 'Veri güvenliği formu cevapları',
    '05-yeni-surum.html': 'Yeni sürüm çıkarırken yapılacaklar'
};

const kartlar = uretilen
    .sort((a, b) => a.dosya.localeCompare(b.dosya))
    .map(
        (u) => `<a class="kart" href="belgeler/${u.dosya}">
<strong>${esc(u.baslik)}</strong>
<span>${esc(aciklamalar[u.dosya] ?? '')}</span>
</a>`
    )
    .join('\n');

const basla = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not Bahçesi — Play Store Paketi</title>
<style>${STIL}</style>
</head>
<body>
<div class="icerik">
<h1>Not Bahçesi — Play Store Paketi</h1>
<p>Sürüm <strong>1.7.0</strong> · Paket adı <strong>com.notbahcesi.app</strong></p>
<p>Aşağıdaki belgelerden başla. Yükleme rehberi sırayla ilerlemen için yazıldı.</p>
${kartlar}
<h2>Klasörde neler var</h2>
<ul>
<li><strong>uygulama/not-bahcesi-1.7.0.aab</strong> — Play Console'a yüklenecek dosya</li>
<li><strong>gorseller/</strong> — mağaza ikonu, öne çıkan görsel ve ekran görüntüleri</li>
<li><strong>belgeler/</strong> — yukarıdaki kılavuzlar (Markdown ve HTML sürümleri)</li>
</ul>
<blockquote>Paket adı ilk yüklemede kilitlenir ve sonradan değiştirilemez. Her yeni
yüklemede sürüm kodunu artırmayı unutma; ayrıntısı "Yeni Sürüm Çıkarma" belgesinde.</blockquote>
</div>
</body>
</html>`;

await writeFile(join(PAKET, 'basla.html'), basla, 'utf8');

console.log(`${uretilen.length} belge HTML'e çevrildi:`);
for (const u of uretilen) console.log('  belgeler/' + u.dosya);
console.log('  basla.html');
