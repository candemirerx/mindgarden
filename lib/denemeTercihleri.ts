import { useEffect, useState } from 'react';
import { bildir, dinle } from './degisim';
import { KART_ISLEVLERI, type KartIslevi, type TuvalKart } from './tuvalTercihleri';

export const DENEME_ARACLARI: KartIslevi[] = ['yok', 'editor', 'kopya', 'tuvalAyarlari', 'makro', 'pcYaz', 'pcEnter', 'pcPano', 'pcDikte', 'pcKopru', 'pcKlavye', 'pcTelPano', 'aiMakro'];
export type DenemeTercihleri = { kart: TuvalKart | 'varsayilan'; sol: { islev: KartIslevi; kimlik?: string } };
export const VARSAYILAN_DENEME: DenemeTercihleri = { kart: 'varsayilan', sol: { islev: 'pcKlavye' } };
const ANAHTAR = 'nb-deneme-gorunum-v1';

export function denemeTercihleri(): DenemeTercihleri {
    if (typeof window === 'undefined') return VARSAYILAN_DENEME;
    try {
        const k = JSON.parse(localStorage.getItem(ANAHTAR) || '{}');
        return {
            kart: ['bahce', 'sade', 'renkli', 'hap'].includes(k?.kart) ? k.kart : 'varsayilan',
            sol: k?.sol && typeof k.sol.islev === 'string' && Object.hasOwn(KART_ISLEVLERI, k.sol.islev) && DENEME_ARACLARI.includes(k.sol.islev)
                ? { islev: k.sol.islev, kimlik: typeof k.sol.kimlik === 'string' ? k.sol.kimlik : undefined } : VARSAYILAN_DENEME.sol
        };
    } catch { return VARSAYILAN_DENEME; }
}
export function denemeTercihleriniKaydet(t: DenemeTercihleri): void {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(t)); } catch { /* depolama kapalı */ }
    bildir('tuval');
}
export function useDenemeTercihleri(): DenemeTercihleri {
    const [t, setT] = useState(VARSAYILAN_DENEME);
    useEffect(() => { const oku = () => setT(denemeTercihleri()); oku(); return dinle('tuval', oku); }, []);
    return t;
}
