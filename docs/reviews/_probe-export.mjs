/**
 * Statik dışa aktarım (out/) bütünlük testi.
 * - Her HTML sayfasındaki yerel varlık referanslarının (script/link/img) diskte var olduğunu doğrular.
 * - Mağaza/politika sayfalarının üretildiğini ve assetlinks.json içeriğini doğrular.
 * - Paket içinde API anahtarı sızıntısı olup olmadığını arar.
 * Çalıştırma: node docs/reviews/_probe-export.mjs
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const OUT = 'out';
const hatalar = [];
let refSayisi = 0;

function dosyalariTopla(dir) {
  const sonuc = [];
  for (const ad of readdirSync(dir)) {
    const tam = join(dir, ad);
    if (statSync(tam).isDirectory()) sonuc.push(...dosyalariTopla(tam));
    else sonuc.push(tam);
  }
  return sonuc;
}

const yerelYol = (ref) => {
  const yol = ref.split('#')[0].split('?')[0];
  if (!yol.startsWith('/')) return null;
  return join(OUT, yol.replace(/^\/+/, ''));
};

for (const html of dosyalariTopla(OUT).filter((f) => f.endsWith('.html'))) {
  const icerik = readFileSync(html, 'utf8');
  const refs = [...icerik.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    const yerel = yerelYol(ref);
    if (!yerel) continue;
    refSayisi += 1;
    if (!existsSync(yerel) && !existsSync(yerel + '.html') && !existsSync(join(yerel, 'index.html'))) {
      hatalar.push(relative('.', html) + ' -> eksik varlik: ' + ref);
    }
  }
}

console.log('HTML sayfasi sayisi:', dosyalariTopla(OUT).filter((f) => f.endsWith('.html')).length);
console.log('Kontrol edilen yerel referans sayisi:', refSayisi);
console.log('Eksik varlik hatasi:', hatalar.length);
for (const h of hatalar.slice(0, 20)) console.log('  ! ' + h);

const beklenenSayfalar = ['index.html', 'editor.html', 'projeler.html', 'bahce_view.html', 'gizlilik.html', 'veri-silme.html', '404.html'];
for (const sayfa of beklenenSayfalar) {
  console.log('SAYFA ' + sayfa + ':', existsSync(join(OUT, sayfa)) ? 'VAR' : 'YOK');
}

const assetlinksYolu = join(OUT, '.well-known', 'assetlinks.json');
if (existsSync(assetlinksYolu)) {
  try {
    const veri = JSON.parse(readFileSync(assetlinksYolu, 'utf8'));
    const hedef = veri?.[0]?.target ?? {};
    console.log('ASSETLINKS: gecerli JSON, paket=' + hedef.package_name + ', parmakizi sayisi=' + (hedef.sha256_cert_fingerprints?.length ?? 0));
  } catch (e) {
    console.log('ASSETLINKS: BOZUK JSON - ' + e.message);
  }
} else {
  console.log('ASSETLINKS: YOK');
}

const desenler = [/AIza[0-9A-Za-z_\-]{10,}/, /sk-[A-Za-z0-9]{20,}/, /eyJhbGciOi[A-Za-z0-9_\-]{10,}/, /GEMINI_API_KEY/];
let sizinti = 0;
for (const dosya of dosyalariTopla(OUT)) {
  if (!/\.(js|json|html|txt|css)$/.test(dosya)) continue;
  const icerik = readFileSync(dosya, 'utf8');
  for (const d of desenler) {
    if (d.test(icerik)) {
      sizinti += 1;
      console.log('OLASI SIZINTI: ' + dosya + ' (' + d + ')');
    }
  }
}
console.log('Sizinti bulgusu:', sizinti);
