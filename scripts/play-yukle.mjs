/**
 * Play Developer API ile AAB yükleme.
 *
 * play-store-paketi/uygulama/not-bahcesi-<sürüm>.aab dosyasını yükler ve verilen
 * kanalda (varsayılan: alpha = kapalı test) sürümü yayınlar. Önce yayın kapısını
 * (scripts/yayin-dogrula.mjs) çalıştırın.
 *
 * Anahtar: %USERPROFILE%\.notbahcesi\play-api.json (git'e girmez, içeriği yazdırılmaz)
 * Kullanım: node scripts/play-yukle.mjs [kanal] [--not "sürüm notu"]
 *   Üretim: node scripts/play-yukle.mjs production --onay [--kademe 0.2] --not "..."
 *   (--onay olmadan üretime yükleme yapılmaz; --kademe verilirse kullanıcıların o oranına açılır)
 */
import { createSign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const PAKET = 'com.notbahcesi.app';
const KOK = resolve(import.meta.dirname, '..');
const ANAHTAR = process.env.PLAY_API_ANAHTARI || join(homedir(), '.notbahcesi', 'play-api.json');
const b64u = b => Buffer.from(b).toString('base64url');

const argumanlar = process.argv.slice(2);
const durum = argumanlar.includes('--durum');
const taslak = argumanlar.includes('--taslak');
const notSirasi = argumanlar.indexOf('--not');
const surumNotu = notSirasi >= 0 ? argumanlar[notSirasi + 1] : '';
const kademeSirasi = argumanlar.indexOf('--kademe');
const kademe = kademeSirasi >= 0 ? Number(argumanlar[kademeSirasi + 1]) : null;
// Değer alan bayrakların (--not, --kademe) değerleri kanal adı sayılmaz.
const degerSiralari = [notSirasi, kademeSirasi].filter(i => i >= 0).map(i => i + 1);
const kanal = argumanlar.find((a, i) => !a.startsWith('--') && !degerSiralari.includes(i)) || 'alpha';
if (kanal !== 'alpha' && kanal !== 'production') throw new Error('Yalnız alpha (kapalı test) ve production kanalları desteklenir.');
if (kanal === 'production' && !argumanlar.includes('--onay')) throw new Error('Üretime yükleme için --onay gerekir (gerçek kullanıcılara yayınlanır).');
if (kademe !== null && !(kademe > 0 && kademe < 1)) throw new Error('--kademe 0 ile 1 arasında olmalı (ör. 0.2).');
if (!durum) execFileSync(process.execPath, [join(KOK, 'scripts/yayin-dogrula.mjs')], { cwd: KOK, stdio: 'inherit' });

const surum = /APP_VERSION\s*=\s*'([^']+)'/.exec(readFileSync(join(KOK, 'lib/config.ts'), 'utf8'))?.[1];
const surumKodu = Number(/(?:^|\s)versionCode\s+(\d+)/m.exec(readFileSync(join(KOK, 'android/app/build.gradle'), 'utf8'))?.[1]);
if (!surum || !surumKodu) { console.error('Sürüm bilgisi okunamadı.'); process.exit(1); }
const aabYolu = join(KOK, 'play-store-paketi', 'uygulama', 'not-bahcesi-' + surum + '.aab');
const aab = durum ? null : readFileSync(aabYolu);

let anahtar;
try { anahtar = JSON.parse(readFileSync(ANAHTAR, 'utf8')); }
catch { console.error('Anahtar okunamadı: ' + ANAHTAR); process.exit(1); }

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
const TABAN = 'https://androidpublisher.googleapis.com';
const api = async (yol, yontem = 'GET', govde, ust = '/androidpublisher/v3/applications/') => {
    const ikili = Buffer.isBuffer(govde);
    const yanit = await fetch(TABAN + ust + PAKET + yol, {
        method: yontem,
        headers: { Authorization: 'Bearer ' + jeton, 'Content-Type': ikili ? 'application/octet-stream' : 'application/json' },
        body: govde === undefined ? undefined : ikili ? govde : JSON.stringify(govde)
    });
    const metin = await yanit.text();
    const j = metin ? JSON.parse(metin) : {};
    if (!yanit.ok) throw new Error(yontem + ' ' + yol + ' → ' + yanit.status + ': ' + (j.error?.message || metin));
    return j;
};

if (!durum) console.log('Yükleniyor: ' + surum + ' (' + surumKodu + ') → kanal "' + kanal + '", ' + aab.length.toLocaleString('tr-TR') + ' bayt');
const duzenleme = await api('/edits', 'POST', {});
const ed = '/edits/' + duzenleme.id;
try {
    if (durum) {
        const tracks = await api(ed + '/tracks');
        const bundles = await api(ed + '/bundles');
        console.log(JSON.stringify({ tracks: tracks.tracks, bundles: bundles.bundles?.map(b => ({ versionCode: b.versionCode, sha256: b.sha256 })) }, null, 2));
        await api(ed, 'DELETE');
        process.exit(0);
    }
    // Aynı kod daha önce (ör. alpha'ya) yüklendiyse yeniden yüklenmez; kanala yalnız atanır.
    const onceki = (await api(ed + '/bundles')).bundles?.find(b => b.versionCode === surumKodu);
    if (onceki) console.log('1) AAB zaten yüklü (kod ' + surumKodu + ', sha256 ' + onceki.sha256 + ')');
    else {
        const paket = await api(ed + '/bundles?uploadType=media', 'POST', aab, '/upload/androidpublisher/v3/applications/');
        if (paket.versionCode !== surumKodu) throw new Error('Yüklenen paketin sürüm kodu ' + paket.versionCode + ', beklenen ' + surumKodu);
        console.log('1) AAB yüklendi (kod ' + paket.versionCode + ', sha256 ' + paket.sha256 + ')');
    }
    const surumBilgisi = { name: surumKodu + ' (' + surum + ')', versionCodes: [String(surumKodu)], status: taslak ? 'draft' : kademe ? 'inProgress' : 'completed' };
    if (kademe && !taslak) surumBilgisi.userFraction = kademe;
    if (surumNotu) surumBilgisi.releaseNotes = [{ language: 'tr-TR', text: surumNotu }];
    const mevcut = await api(ed + '/tracks/' + kanal);
    const korunan = taslak ? (mevcut.releases || []).filter(r => r.status !== 'draft') : [];
    await api(ed + '/tracks/' + kanal, 'PUT', { track: kanal, releases: [...korunan, surumBilgisi] });
    console.log('2) Kanal "' + kanal + '" güncellendi');
    let sonuc;
    try { sonuc = await api(ed + ':commit', 'POST'); }
    catch (h) {
        if (!/changesNotSentForReview/.test(h.message)) throw h;
        sonuc = await api(ed + ':commit?changesNotSentForReview=true', 'POST');
        console.log('   (değişiklikler incelemeye otomatik gönderilmedi; Play Console → Yayın özeti\'nden gönderin)');
    }
    console.log('3) Onaylandı (düzenleme ' + sonuc.id + ')');
    if (taslak) console.log('TASLAK kaydedildi; mevcut test sürümü korundu. Yeni sürüm henüz testçilere dağıtılmaz.');
} catch (h) {
    await api(ed, 'DELETE').catch(() => {});
    console.error('HATA: ' + h.message);
    process.exit(2);
}
