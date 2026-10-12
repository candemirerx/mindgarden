/**
 * Uygulamalı tur (başlangıç seviyesi): ana ekranda sırayla öğeleri vurgular.
 * Hedefi olmayan adımlar ekran ortasında bir bilgi kartı olarak gösterilir.
 */

export interface TurAdimi {
    id: string;
    /** Vurgulanacak öğenin CSS seçicisi; yoksa ya da bulunamazsa kart ortada çıkar. */
    hedef?: string;
    baslik: string;
    metin: string;
}

export const TUR_ANAHTARI = 'nb-tur-v1';
export const TUR_BEKLIYOR_ANAHTARI = 'nb-tur-bekliyor';
export const TUR_BASLAT_OLAYI = 'nb-tur-baslat';

export const BASLANGIC_TURU: TurAdimi[] = [
    {
        id: 'karsilama',
        baslik: 'Hoş geldiniz',
        metin: 'Birkaç adımda uygulamayı tanıyalım. İstediğiniz an Atla ile çıkabilirsiniz.',
    },
    {
        id: 'ayarlar',
        hedef: '[data-tur="ayarlar"]',
        baslik: 'Ayarlar ve kılavuz',
        metin: 'Görünümü, bağlantıları ve kart düğmelerini buradan ayarlarsınız. Kullanım kılavuzu da burada.',
    },
    {
        id: 'yeni-bahce',
        hedef: '[data-tur="yeni-bahce"]',
        baslik: 'Yeni bahçe',
        metin: 'Her konu için bir bahçe açın. Bahçe, ağaçlarınızı ve notlarınızı bir arada tutar.',
    },
    {
        id: 'bahce-karti',
        hedef: '[data-tur="bahce-karti"]',
        baslik: 'Bahçenizi açın',
        metin: 'Karta dokunarak bahçeye girersiniz. Menüden adını değiştirebilir ya da silebilirsiniz.',
    },
    {
        id: 'agac',
        baslik: 'Ağaç ve dallar',
        metin: 'Bahçenin içinde artı düğmesiyle yeni ağaç eklersiniz. Bir kartın yanından yeni dal çıkararak fikri dallandırın.',
    },
    {
        id: 'kart',
        baslik: 'Kart düğmeleri',
        metin: 'Karta bir kez dokunun, düğmeler açılsın. Karta basılı tutup parmağınızı düğmeye kaydırarak da seçebilirsiniz. Düzenle düğmesi notu metin düzenleyicide açar.',
    },
    {
        id: 'bitis',
        baslik: 'Hazırsınız',
        metin: 'Bu turu ayarlardaki kullanım kılavuzundan Uygulamalı öğren düğmesiyle istediğiniz zaman yeniden başlatabilirsiniz.',
    },
];

/** Turu başlatır: ana ekranda değilsek önce oraya döner. */
export function turuBaslat(): void {
    try { localStorage.setItem(TUR_BEKLIYOR_ANAHTARI, '1'); } catch { /* depolama yoksa olay yine çalışır */ }
    if (!/^\/(index(\.html)?)?\/?$/.test(window.location.pathname)) {
        window.location.assign('/');
        return;
    }
    window.dispatchEvent(new CustomEvent(TUR_BASLAT_OLAYI));
}
