/**
 * Editöre özel mini galeri.
 *
 * Her notun kendi galerisi vardır: kameradan çekilen, telefon galerisinden
 * aktarılan ya da panodan yapıştırılan görseller ve küçük metin kartları.
 * Öğeler yalnız bu cihazda, IndexedDB'de durur (bahçe verisine, dışa aktarmaya
 * ve Drive yedeğine girmez). Deneme notunun galerisi yalnız bellektedir; çıkınca
 * kaybolur.
 */
import { useCallback, useEffect, useState } from 'react';

export type GaleriOgesi = {
    id: string;
    notId: string;
    tur: 'gorsel' | 'metin';
    /** Görselin kendisi (tur 'gorsel'). */
    veri?: Blob;
    /** Metin kartının içeriği (tur 'metin'). */
    metin?: string;
    /** Bilgisayara gönderilirken kullanılan dosya adı. */
    ad: string;
    olusturma: number;
};

const VT_ADI = 'nb-mini-galeri';
const DEPO = 'ogeler';
const bellek = new Map<string, GaleriOgesi[]>();
const bellekte = (notId: string) => notId.startsWith('deneme-');
const dinleyiciler = new Set<(notId: string) => void>();
const degisti = (notId: string) => dinleyiciler.forEach(f => f(notId));

let vtSozu: Promise<IDBDatabase> | null = null;
function vt(): Promise<IDBDatabase> {
    if (vtSozu) return vtSozu;
    vtSozu = new Promise((coz, red) => {
        if (typeof indexedDB === 'undefined') { red(new Error('Bu tarayıcı yerel depolamayı desteklemiyor.')); return; }
        const istek = indexedDB.open(VT_ADI, 1);
        istek.onupgradeneeded = () => {
            const depo = istek.result.createObjectStore(DEPO, { keyPath: 'id' });
            depo.createIndex('notId', 'notId');
        };
        istek.onsuccess = () => coz(istek.result);
        istek.onerror = () => { vtSozu = null; red(istek.error ?? new Error('Galeri açılamadı.')); };
    });
    return vtSozu;
}
function islem<T>(kip: IDBTransactionMode, is: (depo: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
    return vt().then(db => new Promise((coz, red) => {
        const tx = db.transaction(DEPO, kip);
        const istek = is(tx.objectStore(DEPO));
        tx.oncomplete = () => coz(istek ? istek.result : undefined);
        tx.onerror = () => red(tx.error ?? new Error('Galeri işlemi başarısız.'));
        tx.onabort = () => red(tx.error ?? new Error('Galeri işlemi yarıda kaldı (depolama dolu olabilir).'));
    }));
}

export async function galeriListele(notId: string): Promise<GaleriOgesi[]> {
    if (!notId) return [];
    const liste = bellekte(notId)
        ? [...(bellek.get(notId) ?? [])]
        : (await islem<GaleriOgesi[]>('readonly', depo => depo.index('notId').getAll(notId) as IDBRequest<GaleriOgesi[]>)) ?? [];
    return liste.sort((a, b) => b.olusturma - a.olusturma);
}

export async function galeriyeEkle(notId: string, ogeler: Omit<GaleriOgesi, 'id' | 'notId' | 'olusturma'>[]): Promise<number> {
    if (!notId || !ogeler.length) return 0;
    const simdi = Date.now();
    const kayitlar: GaleriOgesi[] = ogeler.map((o, i) => ({
        ...o, notId, olusturma: simdi + i,
        id: simdi.toString(36) + '-' + i + '-' + Math.random().toString(36).slice(2, 8)
    }));
    if (bellekte(notId)) bellek.set(notId, [...(bellek.get(notId) ?? []), ...kayitlar]);
    else await islem('readwrite', depo => { kayitlar.forEach(k => depo.put(k)); });
    degisti(notId);
    return kayitlar.length;
}

export async function galeridenSil(notId: string, idler: string[]): Promise<void> {
    if (!idler.length) return;
    if (bellekte(notId)) bellek.set(notId, (bellek.get(notId) ?? []).filter(o => !idler.includes(o.id)));
    else await islem('readwrite', depo => { idler.forEach(id => depo.delete(id)); });
    degisti(notId);
}

/** Dosya adı için zaman damgası: 20261004-153012. */
const damga = (t = new Date()) => t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0') + '-' + String(t.getHours()).padStart(2, '0') + String(t.getMinutes()).padStart(2, '0') + String(t.getSeconds()).padStart(2, '0');

/**
 * Görseli galeriye uygun hâle getirir: uzun kenarı 2560 pikseli aşan
 * fotoğraflar küçültülüp JPEG'e çevrilir (telefon fotoğrafları 5-10 MB
 * olabiliyor; bilgisayara aktarımı da hızlandırır). GIF ve küçük görseller
 * olduğu gibi kalır.
 */
export async function gorseliHazirla(dosya: Blob, sira = 0): Promise<Omit<GaleriOgesi, 'id' | 'notId' | 'olusturma'>> {
    const ad = (uzanti: string) => 'not-bahcesi-' + damga() + (sira ? '-' + (sira + 1) : '') + '.' + uzanti;
    const ozgunUzanti = dosya.type.includes('png') ? 'png' : dosya.type.includes('webp') ? 'webp' : dosya.type.includes('gif') ? 'gif' : 'jpg';
    if (dosya.type === 'image/gif' || typeof createImageBitmap === 'undefined') return { tur: 'gorsel', veri: dosya, ad: ad(ozgunUzanti) };
    try {
        const bit = await createImageBitmap(dosya);
        const EN_COK = 2560;
        const oran = Math.min(1, EN_COK / Math.max(bit.width, bit.height));
        if (oran === 1 && dosya.size <= 3 * 1024 * 1024) { bit.close(); return { tur: 'gorsel', veri: dosya, ad: ad(ozgunUzanti) }; }
        const tuval = document.createElement('canvas');
        tuval.width = Math.round(bit.width * oran); tuval.height = Math.round(bit.height * oran);
        tuval.getContext('2d')!.drawImage(bit, 0, 0, tuval.width, tuval.height);
        bit.close();
        const jpeg = await new Promise<Blob | null>(coz => tuval.toBlob(coz, 'image/jpeg', 0.88));
        if (!jpeg || jpeg.size >= dosya.size) return { tur: 'gorsel', veri: dosya, ad: ad(ozgunUzanti) };
        return { tur: 'gorsel', veri: jpeg, ad: ad('jpg') };
    } catch {
        return { tur: 'gorsel', veri: dosya, ad: ad(ozgunUzanti) };
    }
}

export const metinKarti = (metin: string): Omit<GaleriOgesi, 'id' | 'notId' | 'olusturma'> =>
    ({ tur: 'metin', metin, ad: 'not-bahcesi-metin-' + damga() + '.txt' });

/** Seçilen dosyalardan (kamera, telefon galerisi, yapıştırma) galeriye ekler; eklenen sayıyı döndürür. */
export async function dosyalariGaleriyeEkle(notId: string, dosyalar: Iterable<Blob>): Promise<number> {
    const gorseller = [...dosyalar].filter(d => d.type.startsWith('image/'));
    if (!gorseller.length) return 0;
    return galeriyeEkle(notId, await Promise.all(gorseller.map((d, i) => gorseliHazirla(d, i))));
}

/** Notun galerisini izler. */
export function useMiniGaleri(notId: string) {
    const [ogeler, setOgeler] = useState<GaleriOgesi[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const yenile = useCallback(async () => {
        try { setOgeler(await galeriListele(notId)); }
        catch { setOgeler([]); }
        finally { setYukleniyor(false); }
    }, [notId]);
    useEffect(() => {
        void yenile();
        const dinle = (degisen: string) => { if (degisen === notId) void yenile(); };
        dinleyiciler.add(dinle);
        return () => { dinleyiciler.delete(dinle); };
    }, [notId, yenile]);
    return { ogeler, yukleniyor };
}
