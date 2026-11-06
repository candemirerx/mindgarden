/** Live synthetic OCR test. One paid request per selected path; no user photos.
 * node --env-file=.env.bilge-vision-check.local scripts/bilge-vision-live.mjs --hosted
 * node --env-file=.env.bilge-vision-check.local scripts/bilge-vision-live.mjs --personal
 * Never logs keys, provider error bodies or user data.
 */
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import sharp from 'sharp';
const base = process.env.BILGE_TEST_BASE || 'https://mindgarden-neon.vercel.app';
const personal = process.argv.includes('--personal');
const digits = String(randomInt(1000, 10000));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="white"/><text x="320" y="220" text-anchor="middle" font-family="sans-serif" font-size="170" font-weight="bold" fill="black">${digits}</text></svg>`;
const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
const image = 'data:image/png;base64,' + bytes.toString('base64');
const text = 'Fotoğraftaki dört rakamı sırayla yaz. Yalnız rakamları yaz; başka bir şey ekleme.';
const endpoint = personal ? '/api/spellcheck' : '/api/ai';
if (personal) assert.ok(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== '[SENSITIVE]', 'Kişisel sağlayıcı testi için geçerli test anahtarı gerekir.');
else {
    const status = await fetch(base + '/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'status' }), signal: AbortSignal.timeout(15000) }).then(r => r.json());
    assert.ok(status.available && status.supportsImages, 'Canlı sunucu görsel desteğini bildirmeli.');
}
const body = personal ? { text, image, macro: 'Görseldeki rakamları oku. Yalnız dört rakamı yanıtla.', provider: 'gemini', customModel: 'gemini-2.5-flash', clientApiKey: process.env.GEMINI_API_KEY } : { kind: 'chat', messages: [{ role: 'user', content: text, image }], answerLength: 'short' };
const response = await fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://localhost' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
const data = await response.json();
if (response.status === 429) {
    const scope = String(data.error).includes('ortak') ? 'ortak günlük kapasite' : String(data.error).includes('ağın') ? 'ağ günlük kotası' : String(data.error).includes('dakika') ? 'dakikalık hız sınırı' : 'sağlayıcı sınırı';
    console.log('BLOKE: ' + scope + '; kota değiştirilmedi. Retry-After: ' + response.headers.get('retry-after'));
}
assert.equal(response.status, 200, `${personal ? 'Kişisel' : 'Hazır'} görsel isteği HTTP ${response.status}; sır/hata gövdesi kaydedilmedi.`);
const answer = personal ? data.correctedText : data.text;
assert.ok(typeof answer === 'string' && answer.replace(/\D/g, '') === digits, 'Görseldeki rastgele rakamlar doğru okunmalı; metinde rakamlar verilmedi.');
assert.equal(response.headers.get('access-control-allow-origin'), 'https://localhost', 'Samsung CORS');
console.log(`OK: ${personal ? 'Kişisel Gemini' : 'Hazır AI'} gerçek fotoğraftaki rastgele dört rakamı doğru okudu; Samsung CORS geçti. Kullanıcı fotoğrafı/anahtarı kaydedilmedi.`);
