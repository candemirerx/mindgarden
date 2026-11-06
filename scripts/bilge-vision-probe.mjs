/** One synthetic image, one provider request. No user photos, keys or error bodies logged.
 * node --env-file=.env.production.local scripts/bilge-vision-probe.mjs
 */
import sharp from 'sharp';
const key = process.env.BILGE_AI_API_KEY;
const base = process.env.BILGE_AI_BASE_URL;
const model = process.env.BILGE_AI_MODEL;
if (!key || !base || !model) throw new Error('Görsel testi için sunucu sağlayıcısı yapılandırılmalı.');
const bytes = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#00aa00' } }).png().toBuffer();
const response = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 100, messages: [{ role: 'user', content: [{ type: 'text', text: 'Görseldeki düz zeminin rengini Türkçe tek kelimeyle söyle.' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,' + bytes.toString('base64'), detail: 'low' } }] }] }),
    signal: AbortSignal.timeout(45000), redirect: 'error'
});
if (!response.ok) throw new Error('Görsel sağlayıcı testi başarısız; HTTP ' + response.status + '. Kullanıcı verisi gönderilmedi.');
const data = await response.json();
const answer = data?.choices?.[0]?.message?.content;
if (typeof answer !== 'string' || !/yeşil|yesil/i.test(answer)) throw new Error('Görsel yanıtı beklenen yeşil rengi doğrulamadı.');
console.log('OK: Yapılandırılmış sağlayıcı/model sentetik yeşil görseli doğru tanıdı.');
