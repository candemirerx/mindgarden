/**
 * Tuval görünüm tercihleri (cihaza özel; bahçe verisine yazılmaz).
 *
 * - gosterim: yalnız dizilim (kart görünümünden bağımsız). Organik: kökten dallar
 *   açılır, yapraklar dalın ortasından asılır; ağaçlar yan yana. Yatay: soldan
 *   sağa kök → dal → yaprak; ağaçlar alt alta.
 * - gezinme: çok ağaçta hızlı geçiş için kaydırma çubukları ya da üstte ağaç
 *   sekmeleri (yalnız biri) ya da hiçbiri.
 * - onizleme: kartta başlığın altında içeriğin kaç satırı görünsün (0: yalnız başlık).
 * - kart / kartKoyu: kök, dal ve yaprak kartlarının tasarımı; açık ve koyu tema
 *   için ayrı seçilir (Organik ve Yatay akışta).
 */
import { useEffect, useState } from 'react';
import { bildir, dinle } from './degisim';
import { temaAboneGec } from './tema';

export type TuvalGosterim = 'organik' | 'yatay';
export type TuvalGezinme = 'cubuk' | 'sekme' | 'yok';
export type TuvalOnizleme = 0 | 2 | 3;
/** Seçili notun eylem düğmeleri: kart üstünde hap + kenar artıları, alttan panel ya da yüzen düğme. */
export type TuvalEylem = 'hap' | 'panel' | 'yuzen';
/** Not kartlarının tasarımı: bahçe (gölgeli, katmanlı), sade (ince çerçeve), renkli (seviyeye göre dolgu), hap (tek satır, yuvarlak). */
export type TuvalKart = 'bahce' | 'sade' | 'renkli' | 'hap';
export type TuvalTercihleri = { gosterim: TuvalGosterim; gezinme: TuvalGezinme; onizleme: TuvalOnizleme; eylem: TuvalEylem; kart: TuvalKart; kartKoyu: TuvalKart };

const ANAHTAR = 'nb-tuval-v1';
export const VARSAYILAN_TUVAL: TuvalTercihleri = { gosterim: 'organik', gezinme: 'sekme', onizleme: 2, eylem: 'hap', kart: 'bahce', kartKoyu: 'bahce' };

const kartOku = (v: unknown): TuvalKart => v === 'sade' || v === 'renkli' || v === 'hap' ? v : 'bahce';

export function tuvalTercihleri(): TuvalTercihleri {
    if (typeof window === 'undefined') return VARSAYILAN_TUVAL;
    try {
        const k = JSON.parse(localStorage.getItem(ANAHTAR) || '{}') as Partial<TuvalTercihleri>;
        return {
            // Eski 'klasik' düzen kalktı (kendi kart görünümüne bağlıydı); kayıtlı olan organiğe döner
            gosterim: k.gosterim === 'yatay' ? 'yatay' : 'organik',
            gezinme: k.gezinme === 'cubuk' || k.gezinme === 'yok' ? k.gezinme : 'sekme',
            onizleme: k.onizleme === 0 || k.onizleme === 3 ? k.onizleme : 2,
            eylem: k.eylem === 'panel' || k.eylem === 'yuzen' ? k.eylem : 'hap',
            kart: kartOku(k.kart),
            kartKoyu: kartOku(k.kartKoyu)
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
