/**
 * Uygulama ikonlarını uygulamanın kendi görsel diliyle (filizli defter + yosun yeşili
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


function gradientDefs(id) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${MOSS_700}"/>
      <stop offset="100%" stop-color="${MOSS_900}"/>
    </linearGradient>`;
}

/** GardenMark bileşenindeki filizli defteri simge tuvaline yerleştirir. */
function gardenMarkGroup(size, ratio) {
    const scale = (size * ratio) / 40;
    const offset = size / 2 - 20 * scale;
    return `<g transform="translate(${offset},${offset}) scale(${scale})" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 33C15 29 9 29 5 30V13C10 12 16 14 20 18C24 14 30 12 35 13V30C29 29 24 30 20 33Z" fill="${MOSS_50}" fill-opacity=".12"/>
      <path d="M20 33C15 29 9 29 5 30V13C10 12 16 14 20 18C24 14 30 12 35 13V30C29 29 24 30 20 33ZM20 19V33" stroke="${MOSS_50}" stroke-width="2.2"/>
      <path d="M20 21V12C20 7 24 4 30 4C30 10 26 13 20 12Z" fill="#D4E9B5"/>
      <path d="M20 16C13 16 10 12 11 7C16 7 20 10 20 16Z" fill="#9DCB9B"/>
      <path d="M10 22L15 24M25 24L30 22" stroke="${MOSS_50}" stroke-width="1.6" opacity=".6"/>
    </g>`;
}

/** Tam ikon: yuvarlatılmış kare ve filizli defter. */
function fullIconSvg(size, { round = false, ratio = 0.5 } = {}) {
    const radius = round ? size / 2 : size * 0.22;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradientDefs('g')}</defs>
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
    ${gardenMarkGroup(size, ratio)}
  </svg>`;
}

/** Adaptif ikon arka planı: tam kanama gradyan. */
function backgroundSvg(size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradientDefs('g')}</defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
  </svg>`;
}

/** Adaptif ikon ön planı: güvenli alan içinde filizli defter. */
function foregroundSvg(size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${gardenMarkGroup(size, 0.64, 1.8)}
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
          ${gardenMarkGroup(512, 0.62)}
        </svg>`,
        join(ROOT, 'store/play-icon-512.png')
    )
);

console.log(`${written.length} görsel üretildi:`);
for (const file of written) console.log('  ' + file.replace(ROOT + '\\', '').replace(ROOT + '/', ''));
