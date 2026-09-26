/**
 * Basit değişim bildirimi.
 *
 * Ayarlar modalı ile editör farklı bileşenler olduğu için, bir yerde yapılan
 * değişikliğin (araç silmek, bölüm gizlemek, makro kapatmak) diğer ekranda
 * anında görünmesi gerekir. Tarayıcı sekmesi içinde küçük bir yayın kanalı
 * yeterlidir; aynı sekmedeki tüm dinleyiciler haberdar olur.
 */
export type DegisimKonusu = 'araclar' | 'makrolar' | 'bolumler';

const dinleyiciler = new Map<DegisimKonusu, Set<() => void>>();

export function bildir(konu: DegisimKonusu): void {
    const grup = dinleyiciler.get(konu);
    if (!grup) return;
    for (const geriCagri of grup) geriCagri();
}

export function dinle(konu: DegisimKonusu, geriCagri: () => void): () => void {
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
