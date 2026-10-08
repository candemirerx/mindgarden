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
export type TuvalEylem = 'hap' | 'yumusak' | 'kapsul' | 'panel' | 'yuzen';
export type KartKullanim = 'birlikte' | 'dokun' | 'kaydir';
/** Not kartlarının tasarımı: bahçe (gölgeli, katmanlı), sade (ince çerçeve), renkli (seviyeye göre dolgu), hap (tek satır, yuvarlak). */
export type TuvalKart = 'bahce' | 'sade' | 'renkli' | 'hap';
export const KART_ISLEVLERI = {
    yok: 'Düğme yok', editor: 'Düzenle', kopya: 'İçeriği kopyala', buda: 'Buda / geri al',
    sol: 'Sol yanına ekle', yan: 'Sağ yanına ekle', alt: 'Altına ekle',
    tasi: 'Ağacı taşı', ayarlar: 'Ağaç ayarları'
} as const;
export type KartIslevi = keyof typeof KART_ISLEVLERI;
export const KART_YERLERI = {
    ustSol: 'Üst sol', ustOrta: 'Üst orta', ustSag: 'Üst sağ',
    sol: 'Sol kenar', sag: 'Sağ kenar', alt: 'Alt kenar',
    altSol: 'Sol alt köşe', altSag: 'Sağ alt köşe'
} as const;
export type KartDugmeleri = Record<keyof typeof KART_YERLERI, KartIslevi>;
export const VARSAYILAN_KART_DUGMELERI: KartDugmeleri = {
    ustSol: 'kopya', ustOrta: 'editor', ustSag: 'buda',
    sol: 'sol', sag: 'yan', alt: 'alt', altSol: 'yok', altSag: 'yok'
};
export type TuvalTercihleri = { gosterim: TuvalGosterim; gezinme: TuvalGezinme; onizleme: TuvalOnizleme; eylem: TuvalEylem; kullanim: KartKullanim; kart: TuvalKart; kartKoyu: TuvalKart; dugmeler: KartDugmeleri };

const ANAHTAR = 'nb-tuval-v1';
export const VARSAYILAN_TUVAL: TuvalTercihleri = { gosterim: 'klasik', gezinme: 'sekme', onizleme: 2, eylem: 'hap', kullanim: 'birlikte', kart: 'bahce', kartKoyu: 'bahce', dugmeler: VARSAYILAN_KART_DUGMELERI };

function dugmeleriOku(v: unknown): KartDugmeleri {
    const k = v && typeof v === 'object' ? v as Partial<KartDugmeleri> : {};
    return Object.fromEntries(Object.keys(KART_YERLERI).map(yer => {
        const deger = k[yer as keyof KartDugmeleri];
        return [yer, typeof deger === 'string' && Object.hasOwn(KART_ISLEVLERI, deger)
            ? deger : VARSAYILAN_KART_DUGMELERI[yer as keyof KartDugmeleri]];
    })) as KartDugmeleri;
}

const kartOku = (v: unknown): TuvalKart => v === 'sade' || v === 'renkli' || v === 'hap' ? v : 'bahce';

export function tuvalTercihleri(): TuvalTercihleri {
    if (typeof window === 'undefined') return VARSAYILAN_TUVAL;
    try {
        const k = JSON.parse(localStorage.getItem(ANAHTAR) || '{}') as Partial<TuvalTercihleri>;
        return {
            gosterim: k.gosterim === 'yatay' || k.gosterim === 'organik' ? k.gosterim : 'klasik',
            gezinme: k.gezinme === 'cubuk' || k.gezinme === 'yok' ? k.gezinme : 'sekme',
            onizleme: k.onizleme === 0 || k.onizleme === 3 ? k.onizleme : 2,
            eylem: ['panel', 'yuzen', 'yumusak', 'kapsul'].includes(k.eylem ?? '') ? k.eylem! : 'hap',
            kullanim: k.kullanim === 'dokun' || k.kullanim === 'kaydir' ? k.kullanim : 'birlikte',
            kart: kartOku(k.kart),
            kartKoyu: kartOku(k.kartKoyu),
            dugmeler: dugmeleriOku(k.dugmeler)
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
