/**
 * Play Developer API bağlantı denetimi (YALNIZ OKUMA).
 *
 * Hizmet hesabı anahtarını okuyup Google'dan erişim jetonu alır, uygulamanın
 * test kanallarını listeler. Hiçbir şey yüklemez ya da yayınlamaz; geçici
 * "düzenleme" oturumu açıp sonunda siler.
 *
 * Anahtar: %USERPROFILE%\.notbahcesi\play-api.json (git'e girmez, içeriği yazdırılmaz)
 * Kullanım: node scripts/play-kontrol.mjs
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PAKET = 'com.notbahcesi.app';
const ANAHTAR = process.env.PLAY_API_ANAHTARI || join(homedir(), '.notbahcesi', 'play-api.json');
const b64u = b => Buffer.from(b).toString('base64url');

let anahtar;
try { anahtar = JSON.parse(readFileSync(ANAHTAR, 'utf8')); }
catch { console.error('Anahtar okunamadı: ' + ANAHTAR); process.exit(1); }
if (!anahtar.client_email || !anahtar.private_key) { console.error('Bu dosya bir hizmet hesabı anahtarına benzemiyor.'); process.exit(1); }

async function jetonAl() {
    const simdi = Math.floor(Date.now() / 1000);
    const baslik = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const govde = b64u(JSON.stringify({ iss: anahtar.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: simdi, exp: simdi + 3000 }));
    const imza = createSign('RSA-SHA256').update(baslik + '.' + govde).sign(anahtar.private_key, 'base64url');
    const yanit = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: baslik + '.' + govde + '.' + imza })
    });
    const j = await yanit.json();
    if (!j.access_token) throw new Error('Jeton alınamadı: ' + (j.error_description || j.error || yanit.status));
    return j.access_token;
}

const jeton = await jetonAl();
console.log('1) Anahtar geçerli, Google jeton verdi (' + anahtar.client_email + ')');
const api = (yol, yontem = 'GET', govde) => fetch('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PAKET + yol, {
    method: yontem, headers: { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' }, body: govde ? JSON.stringify(govde) : undefined
});

const ekle = await api('/edits', 'POST', {});
const duzenleme = await ekle.json();
if (!ekle.ok) {
    const ileti = duzenleme.error?.message || ekle.status;
    console.error('2) Play erişimi YOK: ' + ileti);
    if (ekle.status === 403 || ekle.status === 401) console.error('   Hizmet hesabı Play Console\'da davet edilmemiş ya da izinler henüz etkinleşmemiş olabilir (birkaç saat sürebilir).');
    if (ekle.status === 404) console.error('   Paket adı bulunamadı ya da uygulama için izin verilmemiş: ' + PAKET);
    process.exit(2);
}
console.log('2) Play erişimi var: ' + PAKET + ' için geçici düzenleme oturumu açıldı');
try {
    const kanallar = await (await api('/edits/' + duzenleme.id + '/tracks')).json();
    for (const k of kanallar.tracks || []) {
        const surumler = (k.releases || []).map(s => (s.name || '?') + ' [' + s.status + '] kodlar=' + (s.versionCodes || []).join(',')).join(' | ');
        console.log('   kanal "' + k.track + '": ' + (surumler || 'sürüm yok'));
    }
} finally {
    await api('/edits/' + duzenleme.id, 'DELETE');
    console.log('3) Geçici oturum silindi; hiçbir değişiklik yapılmadı.');
}
