/**
 * Tuval görünüm tercihleri (cihaza özel; bahçe verisine yazılmaz).
 *
 * - gosterim: ağaçların dizilişi. Organik: kökten dallar açılır, yapraklar
 *   dalın ortasından asılır; ağaçlar yan yana. Yatay: soldan sağa kök → dal →
 *   yaprak; ağaçlar alt alta. Klasik: önceki düzen.
 * - gezinme: çok ağaçta hızlı geçiş için kaydırma çubukları ya da üstte ağaç
 *   sekmeleri (yalnız biri) ya da hiçbiri.
 * - onizleme: kartta başlığın altında içeriğin kaç satırı görünsün (0: yalnız başlık).
 */
import { useEffect, useState } from 'react';
import { bildir, dinle } from './degisim';

export type TuvalGosterim = 'organik' | 'yatay' | 'klasik';
export type TuvalGezinme = 'cubuk' | 'sekme' | 'yok';
export type TuvalOnizleme = 0 | 2 | 3;
/** Seçili notun eylem düğmeleri: kart üstünde hap + kenar artıları, alttan panel ya da yüzen düğme. */
export type TuvalEylem = 'hap' | 'panel' | 'yuzen';
export type TuvalTercihleri = { gosterim: TuvalGosterim; gezinme: TuvalGezinme; onizleme: TuvalOnizleme; eylem: TuvalEylem };

const ANAHTAR = 'nb-tuval-v1';
export const VARSAYILAN_TUVAL: TuvalTercihleri = { gosterim: 'organik', gezinme: 'sekme', onizleme: 2, eylem: 'hap' };

export function tuvalTercihleri(): TuvalTercihleri {
    if (typeof window === 'undefined') return VARSAYILAN_TUVAL;
    try {
        const k = JSON.parse(localStorage.getItem(ANAHTAR) || '{}') as Partial<TuvalTercihleri>;
        return {
            gosterim: k.gosterim === 'yatay' || k.gosterim === 'klasik' ? k.gosterim : 'organik',
            gezinme: k.gezinme === 'cubuk' || k.gezinme === 'yok' ? k.gezinme : 'sekme',
            onizleme: k.onizleme === 0 || k.onizleme === 3 ? k.onizleme : 2,
            eylem: k.eylem === 'panel' || k.eylem === 'yuzen' ? k.eylem : 'hap'
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
