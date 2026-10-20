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
        metin: 'Kartın altındaki Liste ve Tuval düğmeleri bahçeyi iki ayrı ekranda açar. Adına dokunursanız son kullandığınız ekran açılır. Üç nokta menüsünden adını değiştirebilir ya da silebilirsiniz.',
    },
    {
        id: 'iki-ekran',
        baslik: 'Liste ve Tuval',
        metin: 'İki ekran aynı notları gösterir. Liste notları alt alta, iç içe satırlar olarak; Tuval kartlar ve dallar olarak gösterir. Bir ekranda eklediğiniz not ötekinde de vardır.',
    },
    {
        id: 'agac',
        baslik: 'Ağaç ve dallar',
        metin: 'Bahçedeki en üst notlar ağaçtır, altlarına eklediğiniz notlar dal ve yapraktır. Listede artı düğmesiyle, boş Tuval\'de ortadaki alana dokunarak ilk ağacı açarsınız.',
    },
    {
        id: 'kart',
        baslik: 'Kart düğmeleri',
        metin: 'Karta bir kez dokunun, düğmeler açılsın. Karta basılı tutup parmağınızı düğmeye kaydırarak da seçebilirsiniz. Düzenle düğmesi notu metin düzenleyicide açar.',
    },
    {
        id: 'bitis',
        baslik: 'Hazırsınız',
        metin: 'Bu turu ve adım adım görevleri Ayarlar → Kullanım kılavuzu → Uygulamalı öğrenim bölümünde bulursunuz. Okuyarak öğrenmek isterseniz Teorik öğrenim sekmesine geçin.',
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
