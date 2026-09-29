/**
 * Play "one cikan gorsel" (1024x500) ureticisi.
 *
 * Marka renklerini ve fontlari uygulamanin kendi derlemesinden (out/) alir; bu
 * yuzden once derleme gerekir:
 *
 *   $env:CAPACITOR_BUILD='1'; npm run build
 *   node scripts/play-one-cikan-uret.mjs
 *
 * Cikti: store/feature-graphic.png ve
 *        play-store-paketi/gorseller/one-cikan-gorsel-1024x500.png
 * Ara dosyalar gecici klasorde tutulur, depoya yazilmaz.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const kok = resolve(import.meta.dirname, '..');
const b64 = (yol, tur) => 'data:' + tur + ';base64,' + readFileSync(resolve(kok, yol)).toString('base64');

const fraunces = b64('out/_next/static/media/af4bf8399d1aacdf-s.p.woff2', 'font/woff2');
const inter = b64('out/_next/static/media/e4af272ccee01ff0-s.p.woff2', 'font/woff2');
const amblem = b64('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png', 'image/png');
const simge = b64('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', 'image/png');

const baslik = 'Not Bah\u00e7esi';
const alt = 'Fikirlerinizi topra\u011fa ekin, a\u011faca d\u00f6n\u00fc\u015fs\u00fcn.';
const rozetler = [
  'A\u011fa\u00e7 yap\u0131l\u0131 notlar',
  'Tuval ve liste g\u00f6r\u00fcn\u00fcm\u00fc',
  'Google Drive yedekleme',
  'Yapay zek\u00e2 makrolar\u0131'
];

const html = [
  '<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>',
  "@font-face{font-family:'Fraunces';font-weight:100 900;font-display:block;src:url(" + fraunces + ") format('woff2')}",
  "@font-face{font-family:'Inter';font-weight:100 900;font-display:block;src:url(" + inter + ") format('woff2')}",
  '*{margin:0;padding:0;box-sizing:border-box}html,body{width:1024px;height:500px;overflow:hidden}',
  'body{font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}',
  '.kap{position:relative;width:1024px;height:500px;display:flex;align-items:center;gap:36px;padding:0 60px;',
  'background:radial-gradient(120% 150% at 88% 20%,#2E6444 0%,#20472F 42%,#16301F 100%);overflow:hidden}',
  '.parlak{position:absolute;right:-70px;top:-120px;width:560px;height:560px;border-radius:50%;',
  'background:radial-gradient(circle,rgba(145,195,157,.28) 0%,rgba(145,195,157,0) 68%)}',
  '.cizgi{position:absolute;left:0;bottom:0;width:1024px;height:6px;background:linear-gradient(90deg,#E0A632,#91C39D 55%,#2E6444)}',
  '.sol{position:relative;display:flex;align-items:center;gap:24px;flex:1;min-width:0}',
  '.ikon{width:120px;height:120px;flex:none;display:flex;align-items:center;justify-content:center}',
  '.ikon img{width:120px;height:120px;border-radius:30px;box-shadow:0 18px 40px -16px rgba(0,0,0,.8)}',
  '.yazi h1{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:56px;line-height:1.02;letter-spacing:-.02em;color:#FBF9F6}',
  '.yazi p{margin-top:10px;font-size:22px;line-height:1.35;color:rgba(251,249,246,.84);max-width:520px}',
  '.rozetler{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;max-width:520px}',
  '.rozet{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;font-size:16px;font-weight:600;',
  'background:rgba(251,249,246,.13);border:1px solid rgba(251,249,246,.22);color:#F6F3EE}',
  '.rozet.vurgu{background:rgba(224,166,50,.2);border-color:rgba(224,166,50,.55);color:#F6E3B8}',
  '.sag{position:relative;width:280px;height:280px;flex:none;display:flex;align-items:center;justify-content:center}',
  '.sag img{width:260px;height:260px;filter:drop-shadow(0 24px 48px rgba(0,0,0,.45))}',
  '</style></head><body><div class="kap"><div class="parlak"></div><div class="cizgi"></div>',
  '<div class="sol"><div class="ikon"><img src="' + simge + '" alt=""></div><div class="yazi">',
  '<h1>' + baslik + '</h1><p>' + alt + '</p><div class="rozetler">',
  rozetler.map((r, i) => '<span class="rozet' + (i === 3 ? ' vurgu' : '') + '">' + r + '</span>').join(''),
  '</div></div></div><div class="sag"><img src="' + amblem + '" alt=""></div></div></body></html>'
].join('\n');

const geciciKlasor = join(tmpdir(), 'nb-one-cikan-' + Date.now());
const { mkdirSync } = await import('node:fs');
mkdirSync(geciciKlasor, { recursive: true });

const htmlYolu = join(geciciKlasor, 'one-cikan.html');
writeFileSync(htmlYolu, html, 'utf8');

const chromeAdaylar = [
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const chrome = chromeAdaylar.find((a) => existsSync(a));
if (!chrome) throw new Error('Chrome/Edge bulunamadi. CHROME_BIN ortam degiskenini ayarlayin.');

const png = join(geciciKlasor, 'one-cikan.png');
execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1024,500',
  '--screenshot=' + png,
  'file:///' + htmlYolu.replace(/\\/g, '/')
], { stdio: 'inherit' });

for (const hedef of ['store/feature-graphic.png', 'play-store-paketi/gorseller/one-cikan-gorsel-1024x500.png']) {
  copyFileSync(png, resolve(kok, hedef));
  console.log('yazildi: ' + hedef);
}

