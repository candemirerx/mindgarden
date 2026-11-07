/**
 * Play mağaza sayfası: ekran görüntüleri ve açıklamalar.
 *
 * --durum       : mevcut dilleri, metinleri ve ekran görüntüsü sayısını yazar (değişiklik yapmaz)
 * --gorseller   : play-store-paketi/gorseller/ekran-*.png karelerini telefon ekran görüntüsü olarak yükler
 *                 (o dildeki eski telefon kareleri silinir)
 * --metin       : 03-magaza-metinleri.md'deki kısa ve tam açıklamayı yazar
 * --dil tr-TR   : dil (varsayılan tr-TR)
 *
 * Anahtar: %USERPROFILE%\.notbahcesi\play-api.json (git'e girmez, içeriği yazdırılmaz)
 */
import { createSign } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const PAKET = 'com.notbahcesi.app';
const KOK = resolve(import.meta.dirname, '..');
const ANAHTAR = process.env.PLAY_API_ANAHTARI || join(homedir(), '.notbahcesi', 'play-api.json');
const b64u = b => Buffer.from(b).toString('base64url');
const arg = process.argv.slice(2);
const durum = arg.includes('--durum') || (!arg.includes('--gorseller') && !arg.includes('--metin'));
const dil = arg.includes('--dil') ? arg[arg.indexOf('--dil') + 1] : 'tr-TR';

const anahtar = JSON.parse(readFileSync(ANAHTAR, 'utf8'));
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
const api = async (yol, yontem = 'GET', govde, tur, ust = '/androidpublisher/v3/applications/') => {
    const ikili = Buffer.isBuffer(govde);
    const yanit = await fetch('https://androidpublisher.googleapis.com' + ust + PAKET + yol, {
        method: yontem,
        headers: { Authorization: 'Bearer ' + jeton, 'Content-Type': ikili ? (tur || 'application/octet-stream') : 'application/json' },
        body: govde === undefined ? undefined : ikili ? govde : JSON.stringify(govde)
    });
    const metin = await yanit.text();
    const j = metin ? JSON.parse(metin) : {};
    if (!yanit.ok) throw new Error(yontem + ' ' + yol + ' → ' + yanit.status + ': ' + (j.error?.message || metin));
    return j;
};

/** 03-magaza-metinleri.md içindeki bir başlığın altındaki ilk kod bloğu. */
function blok(baslik) {
    const s = readFileSync(join(KOK, 'play-store-paketi/belgeler/03-magaza-metinleri.md'), 'utf8').replace(/\r\n/g, '\n');
    const a = s.indexOf(baslik); if (a < 0) throw new Error('Başlık yok: ' + baslik);
    const b = s.indexOf('```', a), c = s.indexOf('```', b + 3);
    return s.slice(s.indexOf('\n', b) + 1, c).trim();
}

const ed = '/edits/' + (await api('/edits', 'POST', {})).id;
let onay = false;
try {
    if (durum) {
        const l = await api(ed + '/listings');
        for (const x of l.listings ?? []) {
            const g = await api(ed + '/listings/' + x.language + '/phoneScreenshots');
            console.log(`[${x.language}] başlık: ${x.title}\n  kısa (${x.shortDescription?.length}): ${x.shortDescription}\n  tam: ${x.fullDescription?.length} karakter\n  telefon ekran görüntüsü: ${(g.images ?? []).length}`);
        }
    }
    if (arg.includes('--metin')) {
        const kisa = blok('## Kısa açıklama'), tam = blok('## Tam açıklama');
        if (kisa.length > 80 || tam.length > 4000) throw new Error(`Sınır aşıldı: kısa ${kisa.length}/80, tam ${tam.length}/4000`);
        await api(ed + '/listings/' + dil, 'PATCH', { shortDescription: kisa, fullDescription: tam });
        console.log(`Metin güncellendi (${dil}): kısa ${kisa.length}, tam ${tam.length} karakter`);
        onay = true;
    }
    if (arg.includes('--gorseller')) {
        const klasor = join(KOK, 'play-store-paketi/gorseller');
        const kareler = readdirSync(klasor).filter(f => /^ekran-\d+-.*\.png$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6)));
        if (kareler.length < 2 || kareler.length > 8) throw new Error('Telefon için 2–8 kare gerekir; bulunan: ' + kareler.length);
        await api(ed + '/listings/' + dil + '/phoneScreenshots', 'DELETE');
        for (const k of kareler) {
            await api(ed + '/listings/' + dil + '/phoneScreenshots?uploadType=media', 'POST', readFileSync(join(klasor, k)), 'image/png', '/upload/androidpublisher/v3/applications/');
            console.log('  ✓ ' + k);
        }
        onay = true;
    }
    if (onay) { await api(ed + ':commit', 'POST'); console.log('Onaylandı: mağaza sayfası güncellendi.'); }
    else await api(ed, 'DELETE');
} catch (e) {
    try { await api(ed, 'DELETE'); } catch { /* düzenleme zaten kapanmış olabilir */ }
    throw e;
}
