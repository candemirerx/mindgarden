export const FARE_KONUMLARI = {
    alt: 'Alt tuş sırası', solUst: 'Sol üst', sagUst: 'Sağ üst', solAlt: 'Sol alt', sagAlt: 'Sağ alt'
} as const;
export type FareKonumu = keyof typeof FARE_KONUMLARI;
export type FareDugmesi = { id: string; ad: string; tur: 'fare' | 'kisayol' | 'makro' | 'hiz'; deger: string; konum: FareKonumu };
export const FARE_EYLEMLERI: Record<string, string> = {
    'mc:1': 'Sol tık', 'mc:2': 'Sağ tık', 'ms:3': '↑ Kaydır', 'ms:-3': '↓ Kaydır'
};
export const FARE_DUGME_SINIRI = 20;
export const varsayilanFareDugmeleri = (): FareDugmesi[] => [
    { id: 'sol', ad: 'Sol tık', tur: 'fare', deger: 'mc:1', konum: 'alt' },
    { id: 'yukari', ad: '↑ Kaydır', tur: 'fare', deger: 'ms:3', konum: 'alt' },
    { id: 'sag', ad: 'Sağ tık', tur: 'fare', deger: 'mc:2', konum: 'alt' },
    { id: 'asagi', ad: '↓ Kaydır', tur: 'fare', deger: 'ms:-3', konum: 'alt' }
];
export function fareHiziniDuzelt(v: unknown): number {
    return typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(5, Math.max(0.25, v)) * 100) / 100 : 1;
}
export function fareDugmeleriniDuzelt(v: unknown): FareDugmesi[] {
    if (!Array.isArray(v)) return varsayilanFareDugmeleri();
    const ids = new Set<string>();
    const sonuc: FareDugmesi[] = [];
    for (const d of v) {
        if (!d || typeof d !== 'object' || typeof d.id !== 'string' || !d.id || ids.has(d.id)) continue;
        if (typeof d.ad !== 'string' || !d.ad.trim() || typeof d.deger !== 'string') continue;
        if (!Object.prototype.hasOwnProperty.call(FARE_KONUMLARI, d.konum)) continue;
        if (d.tur === 'fare' ? !Object.prototype.hasOwnProperty.call(FARE_EYLEMLERI, d.deger)
            : d.tur === 'kisayol' ? !/^[A-Za-z0-9+_ -]{1,60}$/.test(d.deger)
                : d.tur === 'makro' ? !d.deger.trim()
                    : d.tur === 'hiz' ? !d.deger.trim() || !Number.isFinite(Number(d.deger)) || Number(d.deger) < 0.25 || Number(d.deger) > 5 : true) continue;
        ids.add(d.id);
        sonuc.push({ id: d.id.slice(0, 100), ad: d.ad.trim().slice(0, 40), tur: d.tur, deger: d.deger.trim(), konum: d.konum });
        if (sonuc.length === FARE_DUGME_SINIRI) break;
    }
    return sonuc;
}
/** Move within a region: order changes do not unexpectedly move other regions. */
export function fareDugmesiniTasi(liste: FareDugmesi[], id: string, yon: -1 | 1): FareDugmesi[] {
    const i = liste.findIndex(d => d.id === id);
    if (i < 0) return liste;
    let j = i + yon;
    while (j >= 0 && j < liste.length && liste[j].konum !== liste[i].konum) j += yon;
    if (j < 0 || j >= liste.length) return liste;
    const yeni = [...liste];
    [yeni[i], yeni[j]] = [yeni[j], yeni[i]];
    return yeni;
}
