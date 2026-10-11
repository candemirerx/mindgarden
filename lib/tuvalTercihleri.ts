/**
 * Tuval görünüm tercihleri (cihaza özel; bahçe verisine yazılmaz).
 *
 * - gosterim: yalnız dizilim (kart görünümünden bağımsız). Organik: kökten dallar
 *   açılır, yapraklar dalın ortasından asılır; ağaçlar yan yana. Yatay: soldan
 *   sağa kök → dal → yaprak; ağaçlar alt alta. Klasik: üstten alta,
 *   düz bağlantılarla hiyerarşi; ağaçlar yan yana.
 * - gezinme: çok ağaçta hızlı geçiş için kaydırma çubukları ya da üstte ağaç
 *   sekmeleri (yalnız biri) ya da hiçbiri.
 * - onizleme: kartta başlığın altında içeriğin kaç satırı görünsün (0: yalnız başlık).
 * - kart / kartKoyu: kök, dal ve yaprak kartlarının tasarımı; açık ve koyu tema
 *   için ayrı seçilir, tüm düzenlerde geçerlidir.
 */
import { useEffect, useState } from 'react';
import { bildir, dinle } from './degisim';
import { temaAboneGec } from './tema';

export type TuvalGosterim = 'organik' | 'yatay' | 'klasik';
export type TuvalGezinme = 'cubuk' | 'sekme' | 'yok';
export type TuvalOnizleme = 0 | 2 | 3;
/** Kart çevresindeki üç güncel tasarım veya dokunarak açılan panel/yüzen düğme. */
export type TuvalEylem = 'hap' | 'yumusak' | 'panel';
/** Kart düğmelerinin boyutları (px). Boş bırakılan değer varsayılan ölçüyü kullanır. */
export type DugmeSiniri = { ad: string; min: number; max: number; varsayilan: number; otomatik?: boolean };
export const DUGME_BOYUTLARI: Record<'ustSolG' | 'ustSolY' | 'ustOrtaG' | 'ustOrtaY' | 'ustSagG' | 'ustSagY' | 'yanG' | 'yanY' | 'altG' | 'altY' | 'kose', DugmeSiniri> = {
    ustSolG: { ad: 'Üst sol genişliği', min: 32, max: 160, varsayilan: 32, otomatik: true },
    ustSolY: { ad: 'Üst sol yüksekliği', min: 40, max: 84, varsayilan: 54 },
    ustOrtaG: { ad: 'Üst orta genişliği', min: 32, max: 160, varsayilan: 32, otomatik: true },
    ustOrtaY: { ad: 'Üst orta yüksekliği', min: 40, max: 84, varsayilan: 54 },
    ustSagG: { ad: 'Üst sağ genişliği', min: 32, max: 160, varsayilan: 32, otomatik: true },
    ustSagY: { ad: 'Üst sağ yüksekliği', min: 40, max: 84, varsayilan: 54 },
    yanG: { ad: 'Yan düğme genişliği', min: 26, max: 72, varsayilan: 34 },
    yanY: { ad: 'Yan düğme yüksekliği', min: 56, max: 180, varsayilan: 112 },
    altG: { ad: 'Alt düğme genişliği', min: 64, max: 220, varsayilan: 112 },
    altY: { ad: 'Alt düğme yüksekliği', min: 26, max: 72, varsayilan: 34 },
    kose: { ad: 'Köşe düğmesi boyutu', min: 32, max: 72, varsayilan: 44 }
};
export type DugmeBoyutlari = Partial<Record<keyof typeof DUGME_BOYUTLARI, number>>;
/** Not kartlarının tasarımı: bahçe (gölgeli, katmanlı), sade (ince çerçeve), renkli (seviyeye göre dolgu), hap (tek satır, yuvarlak). */
export type TuvalKart = 'bahce' | 'sade' | 'renkli' | 'hap';
export const KART_ISLEVLERI = {
    yok: 'Düğme yok', editor: 'Düzenle', kopya: 'İçeriği kopyala', buda: 'Buda / geri al',
    sol: 'Sol yanına ekle', yan: 'Sağ yanına ekle', alt: 'Altına ekle',
    tasi: 'Ağacı taşı', ayarlar: 'Ağaç ayarları', makro: 'Makro çalıştır',
    pcYaz: 'Bilgisayara yaz', pcEnter: 'Bilgisayarda Enter', pcPano: 'Bilgisayar panosu', aiMakro: 'Yapay zekâ makrosu'
} as const;
export type KartIslevi = keyof typeof KART_ISLEVLERI;
export const KART_YERLERI = {
    ustSol: 'Üst sol', ustOrta: 'Üst orta', ustSag: 'Üst sağ',
    sol: 'Sol kenar', sag: 'Sağ kenar', alt: 'Alt kenar',
    altSol: 'Sol alt köşe', altSag: 'Sağ alt köşe'
} as const;
export type KartDugmeleri = Record<keyof typeof KART_YERLERI, KartIslevi>;
/** Düğmeye bağlı makro: yer -> makro kimliği. Yalnız makro işlevinde okunur. */
export type KartMakrolari = Partial<Record<keyof typeof KART_YERLERI, string>>;
/** Düğmeye bağlı yapay zekâ makrosu: yer -> makro kimliği. */
export type KartAiMakrolari = Partial<Record<keyof typeof KART_YERLERI, string>>;
export const VARSAYILAN_KART_DUGMELERI: KartDugmeleri = {
    ustSol: 'kopya', ustOrta: 'editor', ustSag: 'buda',
    sol: 'sol', sag: 'yan', alt: 'alt', altSol: 'yok', altSag: 'yok'
};
export type TuvalTercihleri = { gosterim: TuvalGosterim; gezinme: TuvalGezinme; onizleme: TuvalOnizleme; eylem: TuvalEylem; kart: TuvalKart; kartKoyu: TuvalKart; dugmeler: KartDugmeleri; kartMakrolari: KartMakrolari; kartAiMakrolari: KartAiMakrolari; boyut: DugmeBoyutlari };

const ANAHTAR = 'nb-tuval-v1';
export const VARSAYILAN_TUVAL: TuvalTercihleri = { gosterim: 'klasik', gezinme: 'sekme', onizleme: 2, eylem: 'hap', kart: 'bahce', kartKoyu: 'bahce', dugmeler: VARSAYILAN_KART_DUGMELERI, kartMakrolari: {}, kartAiMakrolari: {}, boyut: {} };

function dugmeleriOku(v: unknown): KartDugmeleri {
    const k = v && typeof v === 'object' ? v as Partial<KartDugmeleri> : {};
    return Object.fromEntries(Object.keys(KART_YERLERI).map(yer => {
        const deger = k[yer as keyof KartDugmeleri];
        return [yer, typeof deger === 'string' && Object.hasOwn(KART_ISLEVLERI, deger)
            ? deger : VARSAYILAN_KART_DUGMELERI[yer as keyof KartDugmeleri]];
    })) as KartDugmeleri;
}

const kartOku = (v: unknown): TuvalKart => v === 'sade' || v === 'renkli' || v === 'hap' ? v : 'bahce';
function makrolariOku(v: unknown): KartMakrolari {
    const k = v && typeof v === 'object' ? v as Record<string, unknown> : {};
    return Object.fromEntries(Object.keys(KART_YERLERI).filter(yer => typeof k[yer] === 'string' && (k[yer] as string).length <= 80).map(yer => [yer, k[yer] as string]));
}
/** Yapay zekâ makro bağlantıları aynı doğrulamayla okunur. */
const kartAiMakrolariOku = (v: unknown): KartAiMakrolari => makrolariOku(v) as KartAiMakrolari;

function boyutOku(v: unknown): DugmeBoyutlari {
    const k = v && typeof v === 'object' ? v as Record<string, unknown> : {};
    const cikti: DugmeBoyutlari = {};
    // Eski tek üst şerit yüksekliği, üç düğmenin yüksekliğine aktarılır.
    const eskiUst = k.ustY;
    for (const [anahtar, sinir] of Object.entries(DUGME_BOYUTLARI)) {
        let d = k[anahtar];
        if (d === undefined && /^ust(Sol|Orta|Sag)Y$/.test(anahtar)) d = eskiUst;
        if (typeof d === 'number' && Number.isFinite(d) && d !== sinir.varsayilan) cikti[anahtar as keyof DugmeBoyutlari] = Math.min(sinir.max, Math.max(sinir.min, Math.round(d)));
    }
    return cikti;
}

export function tuvalTercihleri(): TuvalTercihleri {
    if (typeof window === 'undefined') return VARSAYILAN_TUVAL;
    try {
        const k = JSON.parse(localStorage.getItem(ANAHTAR) || '{}') as Partial<TuvalTercihleri>;
        return {
            gosterim: k.gosterim === 'yatay' || k.gosterim === 'organik' ? k.gosterim : 'klasik',
            gezinme: k.gezinme === 'cubuk' || k.gezinme === 'yok' ? k.gezinme : 'sekme',
            onizleme: k.onizleme === 0 || k.onizleme === 3 ? k.onizleme : 2,
            eylem: k.eylem === 'panel' || k.eylem === 'yumusak' ? k.eylem : 'hap',
            kart: kartOku(k.kart),
            kartKoyu: kartOku(k.kartKoyu),
            dugmeler: dugmeleriOku(k.dugmeler),
            kartMakrolari: makrolariOku(k.kartMakrolari),
            kartAiMakrolari: kartAiMakrolariOku(k.kartAiMakrolari),
            boyut: boyutOku(k.boyut)
        };
    } catch { return VARSAYILAN_TUVAL; }
}

export function tuvalTercihleriniKaydet(t: TuvalTercihleri): void {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(ANAHTAR, JSON.stringify(t)); } catch { /* depolama kapalı */ }
    bildir('tuval');
}

/** Tercihleri okur ve ayarlardan değişince günceller. */
export function useTuvalTercihleri(): TuvalTercihleri {
    const [t, setT] = useState<TuvalTercihleri>(VARSAYILAN_TUVAL);
    useEffect(() => {
        const oku = () => setT(tuvalTercihleri());
        oku();
        return dinle('tuval', oku);
    }, []);
    return t;
}

/** Koyu tema şu an etkin mi; tema değişince güncellenir. */
export function useKoyuTema(): boolean {
    const [koyu, setKoyu] = useState(false);
    useEffect(() => {
        setKoyu(document.documentElement.classList.contains('dark'));
        return temaAboneGec(setKoyu);
    }, []);
    return koyu;
}
