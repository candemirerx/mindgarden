/**
 * Uygulama ikonlarını uygulamanın kendi görsel diliyle (ağaç + yosun yeşili
 * gradyanı) üretir. Çalıştırmak için: node scripts/generate-assets.mjs
 *
 * Üretilenler:
 *  - app/icon.png, app/apple-icon.png  (web favicon / PWA)
 *  - android mipmap-* ic_launcher, ic_launcher_round, ic_launcher_background,
 *    ic_launcher_foreground
 *  - store/play-icon-512.png           (Play Store uygulama ikonu)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();

const MOSS_700 = '#275939';
const MOSS_900 = '#1B3A28';
const MOSS_50 = '#F0F7EF';

/** lucide-react "tree-pine" çizimi (24x24 tuval). */
const TREE_PATHS = [
    'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
    'M12 22v-3'
];

function gradientDefs(id) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${MOSS_700}"/>
      <stop offset="100%" stop-color="${MOSS_900}"/>
    </linearGradient>`;
}

/** Ağaç grubunu tuvalin ortasına, verilen oranda yerleştirir. */
function treeGroup(size, ratio, stroke = 2) {
    const scale = (size * ratio) / 24;
    const offset = size / 2 - 12 * scale;
    return `<g transform="translate(${offset},${offset}) scale(${scale})" fill="none"
        stroke="${MOSS_50}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
      ${TREE_PATHS.map((d) => `<path d="${d}"/>`).join('')}
    </g>`;
}

/** Tam ikon: yuvarlatılmış kare + ağaç. */
function fullIconSvg(size, { round = false, ratio = 0.5 } = {}) {
    const radius = round ? size / 2 : size * 0.22;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradientDefs('g')}</defs>
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
    ${treeGroup(size, ratio)}
  </svg>`;
}

/** Adaptif ikon arka planı: tam kanama gradyan. */
function backgroundSvg(size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradientDefs('g')}</defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
  </svg>`;
}

/** Adaptif ikon ön planı: saydam zemin üzerinde ortalanmış ağaç. */
function foregroundSvg(size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${treeGroup(size, 0.66, 1.8)}
  </svg>`;
}

async function render(svg, outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    // density 72: SVG kullanıcı birimi = piksel. Daha yüksek değer tüm
    // çıktıyı orantılı olarak büyütür ve hedef boyutları bozar.
    const buffer = await sharp(Buffer.from(svg), { density: 72 })
        .png()
        .toBuffer();
    await writeFile(outPath, buffer);
    return outPath;
}

// Android yoğunlukları: [klasör, launcher boyutu, adaptif boyut]
const DENSITIES = [
    ['ldpi', 36, 81],
    ['mdpi', 48, 108],
    ['hdpi', 72, 162],
    ['xhdpi', 96, 216],
    ['xxhdpi', 144, 324],
    ['xxxhdpi', 192, 432]
];

const written = [];

for (const [density, launcher, adaptive] of DENSITIES) {
    const dir = join(ROOT, 'android/app/src/main/res', `mipmap-${density}`);

    written.push(await render(fullIconSvg(launcher, { ratio: 0.62 }), join(dir, 'ic_launcher.png')));
    written.push(
        await render(fullIconSvg(launcher, { round: true, ratio: 0.56 }), join(dir, 'ic_launcher_round.png'))
    );
    written.push(await render(backgroundSvg(adaptive), join(dir, 'ic_launcher_background.png')));
    written.push(await render(foregroundSvg(adaptive), join(dir, 'ic_launcher_foreground.png')));
}

// Web ikonları
written.push(await render(fullIconSvg(512, { ratio: 0.62 }), join(ROOT, 'app/icon.png')));
written.push(await render(fullIconSvg(180, { ratio: 0.62 }), join(ROOT, 'app/apple-icon.png')));

// Play Store uygulama ikonu (512x512, yuvarlatma yok - Play kendisi maskeler)
written.push(
    await render(
        `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
          <defs>${gradientDefs('g')}</defs>
          <rect width="512" height="512" fill="url(#g)"/>
          ${treeGroup(512, 0.62)}
        </svg>`,
        join(ROOT, 'store/play-icon-512.png')
    )
);

console.log(`${written.length} görsel üretildi:`);
for (const file of written) console.log('  ' + file.replace(ROOT + '\\', '').replace(ROOT + '/', ''));
