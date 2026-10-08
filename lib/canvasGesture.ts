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
/**
 * Basılı tutma sırasında parmağın oynayabileceği en büyük mesafe (CSS pikseli).
 *
 * Gerçek parmaklar tam durmaz; bu eşik hem kartın basılı tutma menüsünü açan
 * hareketi hem de tuvalin kaydırmaya başlamasını yönetir. İkisi ayrı sayı
 * olduğunda arada ölü bölge kalıyordu: menü açılmıyor, tuval de kaymıyordu.
 */
export const KART_BASILI_TUT_KAYMA_ESIGI = 14;

let agacSurukleniyor = false;
let kartMenusuAcik = false;

export function kartMenusunuAyarla(acik: boolean): void {
    kartMenusuAcik = acik;
    if (typeof document !== 'undefined') document.documentElement.toggleAttribute('data-kart-menusu', acik);
}

export function kartMenusuAcikMi(): boolean { return kartMenusuAcik; }

export function agacSuruklemesiBasladi(): void {
    agacSurukleniyor = true;
}

export function agacSuruklemesiBitti(): void {
    agacSurukleniyor = false;
}

export function agacSurukleniyorMu(): boolean {
    return agacSurukleniyor || kartMenusuAcik;
}
