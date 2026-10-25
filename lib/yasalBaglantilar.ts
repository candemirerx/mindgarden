/**
 * Gizlilik politikası ve veri silme sayfalarının adresleri.
 * Uygulamadaki tüm "Gizlilik" ve "Veri silme" bağlantıları buradan okur.
 * Tam adres kullanılır: Android uygulaması sayfaları yerel dosyadan sunar ve
 * "/gizlilik" gibi yolları tanımayıp ana sayfaya düşer. Tam adres sistem
 * tarayıcısında açılır ve her zaman yayındaki güncel metni gösterir.
 * Google Dokümanlar'a geçmek için yalnızca bu iki değeri değiştirin.
 */
export const GIZLILIK_ADRESI = 'https://mindgarden-neon.vercel.app/gizlilik';
export const VERI_SILME_ADRESI = 'https://mindgarden-neon.vercel.app/veri-silme';

/** Adres uygulamanın dışına çıkıyorsa yeni sekmede/sistem tarayıcısında açılmalıdır. */
export function disAdresMi(adres: string): boolean {
    return /^https?:\/\//i.test(adres);
}

/**
 * Bağlantı tıklamasında çağrılır. Android uygulamasında adresi sistem
 * tarayıcısında (Capacitor Browser) açar; web'de tarayıcının kendi davranışına bırakır.
 */
export async function yasalAdresiAc(olay: { preventDefault: () => void }, adres: string): Promise<void> {
    if (!disAdresMi(adres)) return;
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        olay.preventDefault();
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: adres });
    } catch {
        window.open(adres, '_blank');
    }
}
