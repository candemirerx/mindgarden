'use client';

/**
 * Mini galerinin Google Drive ile cihazlar arası eşitlenmesi.
 *
 * Her galeri öğesi kullanıcının Drive'ındaki gizli uygulama alanına
 * (appDataFolder) ayrı bir dosya olarak yüklenir; dosyanın appProperties
 * alanı notun ve öğenin kimliğini taşır. Bir notun galerisi açıldığında ya da
 * değiştiğinde iki yönlü eşitlenir:
 * - yerelde olup Drive'da olmayan öğe yüklenir,
 * - Drive'da olup yerelde olmayan öğe indirilir,
 * - daha önce eşitlenmiş ama Drive'dan kalkmış öğe başka cihazda silinmiştir,
 *   yerelden de silinir (yalnız aynı Drive hesabındaysa),
 * - yerelde silinen öğe Drive'dan da silinir (çevrimdışıysa sıraya alınır).
 *
 * Anahtar sessizce alınamıyorsa (tarayıcıda Google penceresi yalnız bir
 * dokunuşla açılabilir) durum 'izin' olur ve galeri "Drive ile eşitle" düğmesini
 * gösterir. Kullanıcı eşitlemeyi kapatabilir; öğeler o zaman yalnız cihazda kalır.
 */
import { useCallback, useEffect, useState } from 'react';
import { getDriveToken, sessizDriveToken } from './driveSync';
import { galeriEsitlemeYaz, galeriListele, type GaleriOgesi } from './miniGaleri';

export type GaleriEsitlemeDurumu =
    | { tur: 'bekliyor' }
    | { tur: 'kapali' }
    | { tur: 'izin' }
    | { tur: 'esitleniyor' }
    | { tur: 'tamam'; zaman: number; yuklenen: number; indirilen: number }
    | { tur: 'hata'; ileti: string };

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const ACIK_ANAHTARI = 'nb-galeri-drive';
const SILINECEK_ANAHTARI = 'nb-galeri-drive-silinecek';
/** Bu boyuta kadar tek istekle (multipart), büyükler parça parça (resumable) yüklenir. */
const TEK_ISTEK_SINIRI = 5 * 1024 * 1024;
const BEKLEME_MS = 1200;

type DriveDosyasi = { id: string; name: string; mimeType?: string; appProperties?: Record<string, string> };
type Silinecek = { driveId: string; hesap: string };

const durumlar = new Map<string, GaleriEsitlemeDurumu>();
const durumDinleyicileri = new Set<(notId: string) => void>();
const zamanlayicilar = new Map<string, ReturnType<typeof setTimeout>>();
const calisanlar = new Map<string, Promise<void>>();
const yenidenIstendi = new Set<string>();
let hesapOnbellegi: { token: string; hesap: string } | null = null;

function durumYaz(notId: string, durum: GaleriEsitlemeDurumu) {
    durumlar.set(notId, durum);
    durumDinleyicileri.forEach((f) => f(notId));
}

/** Eşitleme açık mı? Kullanıcı kapatmadıkça açıktır. */
export function galeriEsitlemeAcik(): boolean {
    try { return localStorage.getItem(ACIK_ANAHTARI) !== '0'; } catch { return true; }
}

export function galeriEsitlemeAyarla(acik: boolean): void {
    try { localStorage.setItem(ACIK_ANAHTARI, acik ? '1' : '0'); } catch { /* yalnız bu oturumda geçerli */ }
}

function silinecekler(): Silinecek[] {
    try {
        const ham = JSON.parse(localStorage.getItem(SILINECEK_ANAHTARI) || '[]');
        return Array.isArray(ham) ? ham.filter((x) => x && typeof x.driveId === 'string') : [];
    } catch {
        return [];
    }
}
function silinecekleriYaz(liste: Silinecek[]) {
    try { localStorage.setItem(SILINECEK_ANAHTARI, JSON.stringify(liste.slice(-500))); } catch { /* sonraki silmede yeniden denenir */ }
}

/** Yerelde silinen ve Drive'da kopyası olan öğeleri sıraya alır. */
export function driveSilinecekEkle(ogeler: Silinecek[]): void {
    if (!ogeler.length) return;
    const mevcut = silinecekler();
    silinecekleriYaz([...mevcut, ...ogeler.filter((o) => !mevcut.some((m) => m.driveId === o.driveId))]);
}

async function istek(token: string, url: string, init: RequestInit = {}): Promise<Response> {
    const yanit = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    if (yanit.status === 401) {
        hesapOnbellegi = null;
        throw new Error('Google Drive izninin süresi doldu. Eşitle\'ye yeniden dokunun.');
    }
    return yanit;
}

async function hataMetni(yanit: Response, ne: string): Promise<Error> {
    const govde = await yanit.text().catch(() => '');
    if (yanit.status === 403 && /storageQuotaExceeded|quota/i.test(govde)) return new Error('Google Drive alanınız dolu; galeri eşitlenemedi.');
    return new Error(`${ne} (${yanit.status})`);
}

/** Drive hesabının kalıcı kimliği (permissionId): hesap değişince yanlış silmeyi önler. */
async function hesapKimligi(token: string): Promise<string> {
    if (hesapOnbellegi?.token === token) return hesapOnbellegi.hesap;
    const yanit = await istek(token, `${API}/about?fields=user(permissionId)`);
    if (!yanit.ok) throw await hataMetni(yanit, 'Drive hesabı okunamadı');
    const hesap = String((await yanit.json())?.user?.permissionId || '');
    if (!hesap) throw new Error('Drive hesabı okunamadı.');
    hesapOnbellegi = { token, hesap };
    return hesap;
}

const kacis = (deger: string) => deger.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function uzaktakiler(token: string, notId: string): Promise<DriveDosyasi[]> {
    const q = `appProperties has { key='nbNot' and value='${kacis(notId)}' } and trashed=false`;
    const dosyalar: DriveDosyasi[] = [];
    let sayfa = '';
    do {
        const url = `${API}/files?spaces=appDataFolder&pageSize=1000&fields=${encodeURIComponent('nextPageToken,files(id,name,mimeType,appProperties)')}&q=${encodeURIComponent(q)}${sayfa ? '&pageToken=' + encodeURIComponent(sayfa) : ''}`;
        const yanit = await istek(token, url);
        if (!yanit.ok) throw await hataMetni(yanit, 'Drive listesi alınamadı');
        const veri = await yanit.json();
        dosyalar.push(...(veri.files ?? []));
        sayfa = veri.nextPageToken ?? '';
    } while (sayfa);
    return dosyalar;
}

async function yukle(token: string, oge: GaleriOgesi): Promise<string> {
    const icerik = oge.veri ?? new Blob([oge.metin ?? ''], { type: 'text/plain;charset=utf-8' });
    const tur = icerik.type || 'application/octet-stream';
    const ust = {
        name: oge.ad,
        parents: ['appDataFolder'],
        mimeType: tur,
        appProperties: { nbNot: oge.notId, nbOge: oge.id, nbTur: oge.tur, nbZaman: String(oge.olusturma) },
    };
    if (icerik.size <= TEK_ISTEK_SINIRI) {
        const sinir = 'nbgaleri' + Math.random().toString(36).slice(2);
        const govde = new Blob([
            `--${sinir}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`, JSON.stringify(ust),
            `\r\n--${sinir}\r\nContent-Type: ${tur}\r\n\r\n`, icerik, `\r\n--${sinir}--`,
        ]);
        const yanit = await istek(token, `${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
            method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${sinir}` }, body: govde,
        });
        if (!yanit.ok) throw await hataMetni(yanit, 'Görsel Drive\'a yüklenemedi');
        return (await yanit.json()).id;
    }
    const oturum = await istek(token, `${UPLOAD_API}/files?uploadType=resumable&fields=id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': tur, 'X-Upload-Content-Length': String(icerik.size) },
        body: JSON.stringify(ust),
    });
    const adres = oturum.headers.get('Location');
    if (!oturum.ok || !adres) throw await hataMetni(oturum, 'Drive yüklemesi başlatılamadı');
    const yanit = await fetch(adres, { method: 'PUT', headers: { 'Content-Type': tur }, body: icerik });
    if (!yanit.ok) throw await hataMetni(yanit, 'Dosya Drive\'a yüklenemedi');
    return (await yanit.json()).id;
}

async function indir(token: string, dosya: DriveDosyasi, notId: string, hesap: string): Promise<GaleriOgesi | null> {
    const p = dosya.appProperties ?? {};
    const tur = p.nbTur === 'metin' || p.nbTur === 'dosya' ? p.nbTur : 'gorsel';
    const yanit = await istek(token, `${API}/files/${encodeURIComponent(dosya.id)}?alt=media`);
    if (yanit.status === 404) return null;
    if (!yanit.ok) throw await hataMetni(yanit, 'Görsel Drive\'dan indirilemedi');
    const temel = { id: p.nbOge, notId, tur, ad: dosya.name || 'not-bahcesi', olusturma: Number(p.nbZaman) || Date.now(), driveId: dosya.id, driveHesap: hesap } as const;
    if (tur === 'metin') return { ...temel, metin: await yanit.text() };
    const veri = await yanit.blob();
    return { ...temel, veri: dosya.mimeType && veri.type !== dosya.mimeType ? new Blob([veri], { type: dosya.mimeType }) : veri };
}

async function bekleyenSilmeleriUygula(token: string, hesap: string) {
    const kalan: Silinecek[] = [];
    for (const s of silinecekler()) {
        // Başka hesapta yüklenmiş kopya bu anahtarla silinemez; o hesaba dönülünce silinir.
        if (s.hesap && s.hesap !== hesap) { kalan.push(s); continue; }
        try {
            const yanit = await istek(token, `${API}/files/${encodeURIComponent(s.driveId)}`, { method: 'DELETE' });
            if (!yanit.ok && yanit.status !== 404) kalan.push(s);
        } catch { kalan.push(s); }
    }
    silinecekleriYaz(kalan);
}

/** Bir notun galerisini Drive ile iki yönlü eşitler. */
async function esitle(notId: string, token: string): Promise<void> {
    durumYaz(notId, { tur: 'esitleniyor' });
    const hesap = await hesapKimligi(token);
    await bekleyenSilmeleriUygula(token, hesap);
    const bekleyenSilme = new Set(silinecekler().map((s) => s.driveId));
    const [yereldekiler, uzak] = await Promise.all([galeriListele(notId), uzaktakiler(token, notId)]);
    const uzakKimlik = new Map(uzak.map((d) => [d.id, d]));
    const uzakOge = new Map(uzak.filter((d) => d.appProperties?.nbOge).map((d) => [d.appProperties!.nbOge, d]));
    const yerelKimlik = new Set(yereldekiler.map((o) => o.id));

    const yazilacak: GaleriOgesi[] = [];
    const silinecekYerel: string[] = [];
    let yuklenen = 0;
    for (const oge of yereldekiler) {
        const ayniHesap = !!oge.driveId && oge.driveHesap === hesap;
        if (ayniHesap && uzakKimlik.has(oge.driveId!)) continue;
        // Daha önce bu hesapta eşitlenmiş ama Drive'da yok: başka cihazda silinmiş.
        if (ayniHesap && !uzakOge.has(oge.id)) { silinecekYerel.push(oge.id); continue; }
        // Yüklendi ama kimliği kaydedilemedi (ya da başka cihaz aynı öğeyi yükledi): yeniden yükleme, bağla.
        const varolan = uzakOge.get(oge.id);
        if (varolan) { yazilacak.push({ ...oge, driveId: varolan.id, driveHesap: hesap }); continue; }
        yazilacak.push({ ...oge, driveId: await yukle(token, oge), driveHesap: hesap });
        yuklenen++;
    }
    let indirilen = 0;
    for (const dosya of uzak) {
        const ogeId = dosya.appProperties?.nbOge;
        if (!ogeId || yerelKimlik.has(ogeId) || bekleyenSilme.has(dosya.id)) continue;
        const oge = await indir(token, dosya, notId, hesap);
        if (oge) { yazilacak.push(oge); indirilen++; }
    }
    await galeriEsitlemeYaz(notId, yazilacak, silinecekYerel);
    durumYaz(notId, { tur: 'tamam', zaman: Date.now(), yuklenen, indirilen });
}

/** Sırayla çalıştırır: aynı not için ikinci istek, birincisi bitince bir kez daha çalışır. */
function calistir(notId: string, token: string): Promise<void> {
    const suren = calisanlar.get(notId);
    if (suren) { yenidenIstendi.add(notId); return suren; }
    const is = esitle(notId, token)
        .catch((hata) => durumYaz(notId, { tur: 'hata', ileti: hata instanceof Error ? hata.message : 'Galeri eşitlenemedi.' }))
        .finally(() => {
            calisanlar.delete(notId);
            if (yenidenIstendi.delete(notId)) galeriEsitlemeIste(notId, 0);
        });
    calisanlar.set(notId, is);
    return is;
}

/**
 * Arka planda eşitleme ister (galeri açıldı, öğe eklendi ya da silindi).
 * Anahtar pencere açmadan alınamıyorsa durum 'izin' olur.
 */
export function galeriEsitlemeIste(notId: string, gecikme = BEKLEME_MS): void {
    if (typeof window === 'undefined' || !notId) return;
    if (!galeriEsitlemeAcik()) { durumYaz(notId, { tur: 'kapali' }); return; }
    const onceki = zamanlayicilar.get(notId);
    if (onceki) clearTimeout(onceki);
    zamanlayicilar.set(notId, setTimeout(async () => {
        zamanlayicilar.delete(notId);
        if (!navigator.onLine) return;
        const token = await sessizDriveToken();
        if (!token) { durumYaz(notId, { tur: 'izin' }); return; }
        await calistir(notId, token);
    }, gecikme));
}

/** Kullanıcı dokunuşuyla eşitler: gerekirse Google izin penceresini açar. */
export async function galeriyiSimdiEsitle(notId: string): Promise<void> {
    galeriEsitlemeAyarla(true);
    try {
        const token = (await sessizDriveToken()) ?? (await getDriveToken());
        await calistir(notId, token);
    } catch (hata) {
        durumYaz(notId, { tur: 'hata', ileti: hata instanceof Error ? hata.message : 'Google Drive izni alınamadı.' });
    }
}

export function galeriEsitlemeyiKapat(notId: string): void {
    galeriEsitlemeAyarla(false);
    durumYaz(notId, { tur: 'kapali' });
}

/** Notun galeri eşitleme durumu. */
export function useGaleriEsitleme(notId: string) {
    const [durum, setDurum] = useState<GaleriEsitlemeDurumu>(() => durumlar.get(notId) ?? { tur: 'bekliyor' });
    useEffect(() => {
        setDurum(durumlar.get(notId) ?? { tur: 'bekliyor' });
        const dinle = (degisen: string) => { if (degisen === notId) setDurum(durumlar.get(notId) ?? { tur: 'bekliyor' }); };
        durumDinleyicileri.add(dinle);
        return () => { durumDinleyicileri.delete(dinle); };
    }, [notId]);
    const simdiEsitle = useCallback(() => galeriyiSimdiEsitle(notId), [notId]);
    const kapat = useCallback(() => galeriEsitlemeyiKapat(notId), [notId]);
    return { durum, simdiEsitle, kapat };
}
