/**
 * Canlı /api/spellcheck uç noktası davranış sondası.
 * Çalıştırma: node docs/reviews/_probe-api.mjs
 * Yalnızca okuma amaçlı istekler yapar; hiçbir şey dosyaya yazmaz.
 */
const BASE = process.env.NB_BASE || 'https://mindgarden-neon.vercel.app';
const URL_SPELLCHECK = BASE + '/api/spellcheck';

const senaryolar = [
  { ad: 'anonim + gemini', basliklar: {}, govde: { provider: 'gemini', text: 'merhaba dunya' } },
  { ad: 'anonim + bos govde', basliklar: {}, govde: {} },
  { ad: 'anonim + bozuk json', basliklar: {}, hamGovde: '{' },
  { ad: 'anonim + cok buyuk govde', basliklar: {}, hamGovde: JSON.stringify({ provider: 'gemini', text: 'a'.repeat(70000) }) },
  { ad: 'anonim + sahte bearer', basliklar: { authorization: 'Bearer sahte-token' }, govde: { provider: 'gemini', text: 'merhaba' } },
  { ad: 'anonim + custom ozel adres (SSRF)', basliklar: { authorization: 'Bearer sahte-token' }, govde: { provider: 'custom', text: 'x', customUrl: 'http://127.0.0.1:8080/v1/chat' } },
];

for (const s of senaryolar) {
  const govde = s.hamGovde ?? JSON.stringify(s.govde);
  try {
    const yanit = await fetch(URL_SPELLCHECK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...s.basliklar },
      body: govde,
    });
    const metin = (await yanit.text()).replace(/\s+/g, ' ');
    console.log([s.ad, 'STATUS=' + yanit.status, 'BODY=' + metin.slice(0, 200)].join(' | '));
  } catch (e) {
    console.log([s.ad, 'AG HATASI', e.message].join(' | '));
  }
}

for (const yol of ['/', '/gizlilik', '/veri-silme', '/.well-known/assetlinks.json', '/auth/callback', '/projeler', '/editor', '/bahce_view']) {
  try {
    const yanit = await fetch(BASE + yol, { redirect: 'follow' });
    console.log(['SAYFA ' + yol, 'STATUS=' + yanit.status, 'CT=' + (yanit.headers.get('content-type') || '-')].join(' | '));
  } catch (e) {
    console.log(['SAYFA ' + yol, 'AG HATASI', e.message].join(' | '));
  }
}
