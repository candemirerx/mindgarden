/**
 * Tuval ile ağaç taşıma arasındaki anlık el sıkışması.
 *
 * Ağaç uzun basılıp taşınırken tuvalin de kaymaması gerekir. İki bileşen
 * (GardenCanvas ve SuruklenebilirAgac) aynı anda çalıştığı için, o anki
 * durumu bu tek bayrak üzerinden paylaşırlar.
 *
 * Bayrak yalnızca sürükleme sürerken doğrudur; parmak kalkınca, hareket
 * iptal edilince veya ağaç bileşeni ekrandan kalkınca sıfırlanır.
 */
let agacSurukleniyor = false;

export function agacSuruklemesiBasladi(): void {
    agacSurukleniyor = true;
}

export function agacSuruklemesiBitti(): void {
    agacSurukleniyor = false;
}

export function agacSurukleniyorMu(): boolean {
    return agacSurukleniyor;
}
