/**
 * Basit değişim bildirimi.
 *
 * Ayarlar modalı ile editör farklı bileşenler olduğu için, bir yerde yapılan
 * değişikliğin (araç silmek, bölüm gizlemek, makro kapatmak) diğer ekranda
 * anında görünmesi gerekir. Tarayıcı sekmesi içinde küçük bir yayın kanalı
 * yeterlidir; aynı sekmedeki tüm dinleyiciler haberdar olur.
 */
export type DegisimKonusu =
    | 'araclar'
    | 'makrolar'
    | 'bolumler'
    | 'remote-prefs'
    /** Sağlayıcı/anahtar/model tercihleri değişti. */
    | 'ai-tercih'
    /** Budanmış notları gösterme tercihi değişti. */
    | 'budananlar'
    /** Bilgisayar bağlantısının canlı durumu yeniden yoklandı. */
    | 'baglanti-durumu'
    /** Tuval görünüm tercihleri (gösterim, gezinme, önizleme) değişti. */
    | 'tuval'
    /** Kart menüsüne bağlı makroların seçim sayfası açıldı (yer bilgisiyle). */
    | 'kart-makro-sec';

const dinleyiciler = new Map<DegisimKonusu, Set<(ayrinti?: unknown) => void>>();

export function bildir(konu: DegisimKonusu): void {
    const grup = dinleyiciler.get(konu);
    if (!grup) return;
    for (const geriCagri of grup) geriCagri();
}
export function bildirAyrintili(konu: DegisimKonusu, ayrinti: unknown): void {
    const grup = dinleyiciler.get(konu);
    if (!grup) return;
    for (const geriCagri of grup) geriCagri(ayrinti);
}

export function dinle(konu: DegisimKonusu, geriCagri: (ayrinti?: unknown) => void): () => void {
    let grup = dinleyiciler.get(konu);
    if (!grup) {
        grup = new Set();
        dinleyiciler.set(konu, grup);
    }
    grup.add(geriCagri);
    return () => {
        grup?.delete(geriCagri);
    };
}
