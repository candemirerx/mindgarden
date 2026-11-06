/**
 * Ad boş bırakılarak eklenen ağaç, dal ve yaprağın adı.
 *
 * Öncelik: ağacın kendi ayarlarındaki boş ad kuralı (ör. "İş yeri" →
 * "İş yeri 1", "İş yeri 2"... ya da numarasız sabit ad), yoksa Sıralı Ad
 * aracı açıkken seviyedeki sıra numarası, o da yoksa "Yeni Dal" gibi
 * varsayılan ad. Dal ve yaprak kuralları ağaca özeldir; yeni ağaç hiçbir
 * ağacın içinde olmadığından yalnız araç ve varsayılan geçerlidir.
 */
import { siraliAd, siraliAdEtkin } from './tools';
import { agacAyarlari, type AdTuru } from './agacAyarlari';

type AdDugumu = { parent_id: string | null; content?: string | null };

const kacis = (m: string) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Aynı ebeveynin altında "<metin> N" adlı notlara bakarak sıradaki numaralı adı verir. */
export function numaraliAd(metin: string, parentId: string | null, nodes: AdDugumu[]): string {
    const kalip = new RegExp('^' + kacis(metin) + '\\s*(\\d+)$', 'iu');
    let enBuyuk = 0;
    for (const n of nodes) {
        if (n.parent_id !== parentId) continue;
        const ilkSatir = String(n.content ?? '').split('\n')[0].trim();
        const e = kalip.exec(ilkSatir);
        if (e) enBuyuk = Math.max(enBuyuk, Number(e[1]));
    }
    return `${metin} ${enBuyuk + 1}`;
}

/**
 * Ad penceresinin ipucu ve boş ad onaylandığında kullanılacak adı üreten işlev.
 * Ad, onay anındaki notlarla hesaplanır. `agacId` verilirse dal ve yaprak
 * kuralları o ağacın ayarlarından okunur.
 */
export function bosAdPlani(tur: AdTuru, varsayilan: string, agacId?: string | null): {
    ipucu: string;
    uret: (parentId: string | null, nodes: AdDugumu[]) => string;
} {
    const kural = agacId && tur !== 'agac' ? agacAyarlari(agacId)[tur] : undefined;
    const metin = kural?.metin.trim();
    if (metin) {
        return kural!.numarali
            ? { ipucu: `Ad girin (boş bırakılırsa "${metin} 1, 2…" yazılır)...`, uret: (p, n) => numaraliAd(metin, p, n) }
            : { ipucu: `Ad girin (boş bırakılırsa "${metin}" yazılır)...`, uret: () => metin };
    }
    if (siraliAdEtkin()) {
        return { ipucu: 'Ad girin (boş bırakılırsa sıra numarası verilir)...', uret: (p, n) => siraliAd(p, n) };
    }
    return { ipucu: `Ad girin (boş bırakılırsa "${varsayilan}" yazılır)...`, uret: () => varsayilan };
}
