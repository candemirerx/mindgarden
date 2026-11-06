/**
 * Ağacın kendi ayarları (cihaza özel; bahçe verisine yazılmaz).
 *
 * Ağaç Yönetimi → Ağaçlar sekmesindeki kalem düğmesinin açtığı pencereden
 * yönetilir; her ağacın kuralı ayrıdır. Şimdilik tek ayar vardır: ad vermeden
 * eklenen dal ve yaprakların adı. Yeni ağaç (kök) hiçbir ağacın içinde
 * olmadığından kural kapsamı dışındadır.
 */
import { useEffect, useState } from 'react';
import { bildir, dinle } from './degisim';

/** Adı boş bırakılarak eklenen notun türü. */
export type AdTuru = 'agac' | 'dal' | 'yaprak';
/**
 * Boş ad kuralı: metin boşsa uygulamanın varsayılanı (sıra numarası ya da
 * "Yeni Dal") kullanılır. numarali açıkken aynı seviyedeki notlara bakılarak
 * "İş yeri 1", "İş yeri 2"... diye devam edilir; kapalıyken ad hep aynıdır.
 */
export type AdKurali = { metin: string; numarali: boolean };
/** Ağaca özel kurallar; kök dışındaki türler ayarlanabilir. */
export type AgacAyarlari = Partial<Record<'dal' | 'yaprak', AdKurali>>;
export const AD_TURLERI: Record<AdTuru, string> = { agac: 'Ağaç', dal: 'Dal', yaprak: 'Yaprak' };

const ANAHTAR = 'nb-agac-ayarlari-v1';

function ayarlariOku(agacId: string): AgacAyarlari {
    try {
        const tumu = JSON.parse(localStorage.getItem(ANAHTAR) || '{}') as Record<string, unknown>;
        const kayit = tumu[agacId] && typeof tumu[agacId] === 'object' ? tumu[agacId] as Record<string, unknown> : {};
        const cikti: AgacAyarlari = {};
        for (const tur of ['dal', 'yaprak'] as const) {
            const d = kayit[tur] as Partial<AdKurali> | undefined;
            if (!d || typeof d !== 'object' || typeof d.metin !== 'string') continue;
            cikti[tur] = { metin: d.metin.slice(0, 60), numarali: d.numarali !== false };
        }
        return cikti;
    } catch { return {}; }
}

export function agacAyarlari(agacId: string): AgacAyarlari {
    if (typeof window === 'undefined') return {};
    return ayarlariOku(agacId);
}

export function agacAyarlariKaydet(agacId: string, ayarlar: AgacAyarlari): void {
    if (typeof window === 'undefined') return;
    try {
        const tumu = JSON.parse(localStorage.getItem(ANAHTAR) || '{}') as Record<string, unknown>;
        // Boş kural kaydı birikmesin: kural kalmayan ağaç listeden silinir.
        if (ayarlar.dal || ayarlar.yaprak) tumu[agacId] = ayarlar; else delete tumu[agacId];
        localStorage.setItem(ANAHTAR, JSON.stringify(tumu));
    } catch { /* depolama kapalı */ }
    bildir('agac-ayarlari');
}

/** Ağacın ayarlarını okur ve değişince günceller. */
export function useAgacAyarlari(agacId: string): AgacAyarlari {
    const [a, setA] = useState<AgacAyarlari>({});
    useEffect(() => {
        const oku = () => setA(agacAyarlari(agacId));
        oku();
        return dinle('agac-ayarlari', oku);
    }, [agacId]);
    return a;
}
