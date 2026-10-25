/**
 * Gizlilik politikası ve veri silme sayfalarının adresleri.
 * Uygulamadaki tüm "Gizlilik" ve "Veri silme" bağlantıları buradan okur.
 * Google Dokümanlar'da yayımlanan bir adrese geçmek için yalnızca bu iki değeri değiştirin
 * (ör. 'https://docs.google.com/document/d/e/.../pub').
 */
export const GIZLILIK_ADRESI = '/gizlilik';
export const VERI_SILME_ADRESI = '/veri-silme';

/** Adres uygulamanın dışına çıkıyorsa yeni sekmede/sistem tarayıcısında açılmalıdır. */
export function disAdresMi(adres: string): boolean {
    return /^https?:\/\//i.test(adres);
}
