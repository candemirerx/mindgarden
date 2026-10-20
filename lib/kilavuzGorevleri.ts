/**
 * Kılavuzun "Uygulamalı öğrenim" bölümü: gerçek ekranlarda adım adım görevler.
 *
 * Her adım bir öğeyi vurgular ve ne yapılacağını söyler; kullanıcı o işi
 * yaptığında kendiliğinden sonraki adıma geçilir:
 * - 'dokun': vurgulanan öğeye dokunulunca,
 * - { eylem }: uygulama o işi başarıyla yaptığında (dersTamamla ile yayınlanan
 *   ders kimliği; örn. 'b-bahce' bahçe oluşturulunca),
 * - 'ileri': yalnız bilgi veren adım, kartın İleri düğmesiyle.
 *
 * Teorik öğrenimdeki (kilavuzIcerik) dersler `dersler` alanıyla göreve bağlanır;
 * dersin kartı "Adım adım uygulayın" düğmesiyle bu görevi başlatır.
 * Seçiciler: data-tur / data-kilavuz işaretleri ya da kalıcı aria-label'lar.
 */
import type { KilavuzIkonu } from './kilavuzIcerik';

export type GorevEkrani = 'ana' | 'liste' | 'tuval' | 'editor';
export type GorevGecisi = 'dokun' | 'ileri' | { eylem: string };

export interface GorevAdimi {
    ekran: GorevEkrani;
    /** Vurgulanacak öğe; sırayla denenen seçiciler. Yoksa kart ekranın ortasında çıkar. */
    hedef?: string[];
    baslik: string;
    metin: string;
    gecis: GorevGecisi;
    /** Hedef birkaç saniyede bulunamazsa gösterilen yardım. */
    yoksa?: string;
}

export interface KilavuzGorevi {
    id: string;
    ikon: KilavuzIkonu;
    baslik: string;
    aciklama: string;
    sure: number;
    baslangic: 'ana' | 'liste' | 'tuval';
    /** Görev bitince "Neler öğrendiniz" listesi. */
    kazanimlar: string[];
    /** Bu görevle uygulanan teorik dersler. */
    dersler: string[];
    adimlar: GorevAdimi[];
}

const ISTEM = '[role="dialog"][aria-labelledby="istem-basligi"]';
const LISTE_MENU = ['[data-kilavuz-secili] [aria-haspopup="menu"]', '[aria-haspopup="menu"][aria-label$=" seçenekleri"]'];
const NOT_YOK = 'Bu bahçede henüz not yok. Önce "Ağaç dikin, dal ekleyin" görevini yapın.';

export const GOREVLER: KilavuzGorevi[] = [
    {
        id: 'g-bahce',
        ikon: 'Sprout',
        baslik: 'İlk bahçenizi kurun',
        aciklama: 'Bir konu için bahçe açın ve içine girin.',
        sure: 1,
        baslangic: 'ana',
        kazanimlar: ['Her konu için ayrı bir bahçe açılır.', 'Bahçe, Liste ya da Tuval düğmesiyle açılır.'],
        dersler: ['b-bahce', 'b-iki-ekran'],
        adimlar: [
            { ekran: 'ana', hedef: ['[data-tur="yeni-bahce"]'], gecis: 'dokun', baslik: 'Yeni Bahçe\'ye dokunun', metin: 'İş, okul, kitaplar… Her konu için ayrı bir bahçe açarsınız.' },
            { ekran: 'ana', hedef: ['[aria-labelledby="create-garden-title"]'], gecis: { eylem: 'b-bahce' }, baslik: 'Bahçeye bir ad verin', metin: 'Örneğin "Fikirlerim" yazın ve **Oluştur**\'a dokunun.' },
            { ekran: 'ana', hedef: ['[data-kilavuz="bahce-gorunumleri"]'], gecis: 'dokun', baslik: 'Bahçenizi açın', metin: 'Yeni bahçeniz en üstte. **Liste** notları alt alta, **Tuval** kart kart gösterir. Birine dokunun.' },
        ],
    },
    {
        id: 'g-agac',
        ikon: 'TreePine',
        baslik: 'Ağaç dikin, dal ekleyin',
        aciklama: 'Listede bir ağaç açın ve altına ilk dalını ekleyin.',
        sure: 2,
        baslangic: 'liste',
        kazanimlar: ['Ağaç, bahçedeki ana konudur.', 'Dallar ve yapraklar üç nokta menüsünden eklenir.', 'Ok düğmesi dalları açıp kapatır.'],
        dersler: ['b-kavram', 'b-liste'],
        adimlar: [
            { ekran: 'liste', hedef: ['[aria-label="Yeni ağaç ekle"]'], gecis: 'dokun', baslik: 'Yeni ağaç ekleyin', metin: 'Ağaç, bahçedeki ana konudur. Üstteki artı düğmesine dokunun.' },
            { ekran: 'liste', hedef: [ISTEM], gecis: { eylem: 'b-liste' }, baslik: 'Ağaca ad verin', metin: 'Örneğin "Proje fikirleri" yazıp **Tamam**\'a dokunun. Boş bırakırsanız ad kendiliğinden verilir.' },
            { ekran: 'liste', hedef: LISTE_MENU, gecis: 'dokun', baslik: 'Ağacın menüsünü açın', metin: 'Yeni ağacınız seçili. Satırın sonundaki **üç noktaya** dokunun.' },
            { ekran: 'liste', hedef: ['[data-kilavuz="menu-dal-ekle"]'], gecis: 'dokun', baslik: 'Altına not ekleyin', metin: 'Menüde **Yeni yaprak ekle**\'ye (ağacın zaten dalı varsa **Yeni dal ekle**\'ye) dokunun.', yoksa: 'Menü kapandı. Ağacın üç noktasına yeniden dokunun.' },
            { ekran: 'liste', hedef: [ISTEM], gecis: { eylem: 'b-liste' }, baslik: 'Dala ad verin', metin: 'Bir ad yazıp **Tamam**\'a dokunun.' },
            { ekran: 'liste', hedef: ['[data-kilavuz-secili]'], gecis: 'ileri', baslik: 'Ağacınız dallandı', metin: 'Yeni not, ağacın altında girintili duruyor. Ağacın yanındaki **ok** dalları açıp kapatır; aynı menüyle dallara da yaprak eklersiniz.' },
        ],
    },
    {
        id: 'g-duzen',
        ikon: 'Palette',
        baslik: 'Renk verin ve budayın',
        aciklama: 'Bir dalı renklendirin, sonra silmeden kenara alın.',
        sure: 2,
        baslangic: 'liste',
        kazanimlar: ['Dal rengi her dokunuşta sıradakine geçer ve kaydedilir.', 'Budama silmez: not soluk ve üstü çizili kalır.', 'Budananlar düğmesi onları gizler ya da gösterir.'],
        dersler: ['t-liste', 't-budama'],
        adimlar: [
            { ekran: 'liste', hedef: LISTE_MENU, gecis: 'dokun', baslik: 'Bir notun menüsünü açın', metin: 'Satırın sonundaki **üç noktaya** dokunun.', yoksa: NOT_YOK },
            { ekran: 'liste', hedef: ['[aria-label="Dal rengini değiştir"]'], gecis: { eylem: 't-liste' }, baslik: 'Rengini değiştirin', metin: '**Dal rengi**\'ne dokunun. Her dokunuş sıradaki renge geçer.', yoksa: 'Menü kapandı. Notun üç noktasına yeniden dokunun.' },
            { ekran: 'liste', hedef: LISTE_MENU, gecis: 'dokun', baslik: 'Menüyü yeniden açın', metin: 'Şimdi budamayı deneyelim. Aynı notun **üç noktasına** dokunun.' },
            { ekran: 'liste', hedef: ['[data-kilavuz="menu-buda"]'], gecis: { eylem: 't-budama' }, baslik: 'Notu budayın', metin: '**Buda**\'ya dokunun. Not silinmez; soluk ve üstü çizili görünür.', yoksa: 'Menü kapandı. Notun üç noktasına yeniden dokunun.' },
            { ekran: 'liste', hedef: ['[role="tablist"][aria-label="Budanan notlar"]'], gecis: 'ileri', baslik: 'Budananları yönetin', metin: 'Bu düğmeler budanan notları gizler ya da gösterir. Budamayı geri almak için menüdeki **Budamayı geri al**\'a dokunun.' },
        ],
    },
    {
        id: 'g-tuval',
        ikon: 'LayoutDashboard',
        baslik: 'Tuvalde dal ekleyin',
        aciklama: 'Kart düğmeleriyle dal ekleyin, Liste\'de de görün.',
        sure: 2,
        baslangic: 'tuval',
        kazanimlar: ['Karta dokununca düğmeleri açılır.', 'Altına düğmesi dal ya da yaprak ekler.', 'Liste ve Tuval aynı notları gösterir.'],
        dersler: ['b-tuval', 'b-iki-ekran'],
        adimlar: [
            { ekran: 'tuval', hedef: ['[data-yk-id]'], gecis: 'dokun', baslik: 'Bir karta dokunun', metin: 'Tuvalde her not bir karttır. Karta **bir kez** dokunun; çevresinde düğmeler açılır.', yoksa: 'Tuvalde henüz kart yok. Boş tuvalin ortasına dokunup ilk ağacı açın ya da önce "Ağaç dikin, dal ekleyin" görevini yapın.' },
            { ekran: 'tuval', hedef: ['[data-kart-aktif] [data-kart-eylem="alt"]', '[data-kart-aktif] [data-kart-eylem="yan"]'], gecis: 'dokun', baslik: 'Altına dal ekleyin', metin: 'Kartın altındaki **artı** düğmesine dokunun. Karta basılı tutup parmağınızı düğmeye kaydırarak da seçebilirsiniz.', yoksa: 'Kart düğmeleri kapandı. Karta yeniden bir kez dokunun.' },
            { ekran: 'tuval', hedef: [ISTEM], gecis: { eylem: 'b-tuval' }, baslik: 'Dala ad verin', metin: 'Bir ad yazıp **Tamam**\'a dokunun. Yeni kart, dalın ucunda belirir.' },
            { ekran: 'tuval', hedef: ['[aria-label="Liste görünümüne geç"]'], gecis: 'dokun', baslik: 'Liste\'de de görün', metin: 'Tuvalde eklediğiniz not Liste\'de de vardır. Liste düğmesine dokunun.' },
            { ekran: 'liste', gecis: 'ileri', baslik: 'İki ekran, aynı notlar', metin: 'Eklediğiniz dal burada da duruyor. Liste ve Tuval aynı bahçenin iki görünümüdür; hangisi işinize yararsa onu kullanın.' },
        ],
    },
    {
        id: 'g-editor',
        ikon: 'PenLine',
        baslik: 'Notu editörde yazın',
        aciklama: 'Bir notu tam ekran editörde açın, yazın ve dönün.',
        sure: 2,
        baslangic: 'liste',
        kazanimlar: ['Kalem düğmesi notu editörde açar.', 'Yazdıklarınız kendiliğinden kaydedilir.', 'Geri düğmesi bahçeye döndürür.'],
        dersler: ['b-not'],
        adimlar: [
            { ekran: 'liste', hedef: ['[data-kilavuz-secili] [aria-label="Notu editörde aç"]', '[aria-label="Notu editörde aç"]'], gecis: 'dokun', baslik: 'Editörü açın', metin: '**Kalem** düğmesi notu tam ekran editörde açar.', yoksa: NOT_YOK },
            { ekran: 'editor', hedef: ['[aria-label="Not içeriği"]'], gecis: { eylem: 'b-not' }, baslik: 'Bir şeyler yazın', metin: 'Başlığın altındaki alana birkaç kelime yazın. Otomatik kaydetme açıksa kendiliğinden kaydedilir; kapalıysa üstteki **Kaydet**\'e dokunun.' },
            { ekran: 'editor', hedef: ['[aria-label="Geri dön"]'], gecis: 'dokun', baslik: 'Bahçeye dönün', metin: 'İşiniz bitince **Geri** ile dönün. Yazdıklarınız notun içinde durur.' },
        ],
    },
    {
        id: 'g-gorunum',
        ikon: 'Settings',
        baslik: 'Görünümü değiştirin',
        aciklama: 'Ayarları açın ve açık ya da koyu temayı seçin.',
        sure: 1,
        baslangic: 'ana',
        kazanimlar: ['Tüm ayarlar sağ üstteki düğmededir.', 'Sistem teması telefonun gece moduna uyar.'],
        dersler: ['b-ayarlar', 't-gorunum'],
        adimlar: [
            { ekran: 'ana', hedef: ['[data-tur="ayarlar"]'], gecis: 'dokun', baslik: 'Ayarları açın', metin: 'Uygulamanın tüm ayarları ve bu kılavuz buradadır.' },
            { ekran: 'ana', hedef: ['[data-ayar="gorunum"]'], gecis: 'dokun', baslik: 'Görünüm\'e girin', metin: 'Ayarlar konulara göre gruplanmıştır. **Uygulama** grubundaki **Görünüm**\'e dokunun.', yoksa: 'Ayarların ana sayfasında değilsiniz. Üstteki geri düğmesiyle ana sayfaya dönün.' },
            { ekran: 'ana', hedef: ['[data-kilavuz="tema-secici"]'], gecis: { eylem: 't-gorunum' }, baslik: 'Bir tema seçin', metin: '**Açık**, **Koyu** ya da **Sistem**: şu ankinden farklı birine dokunun. Değişiklik hemen uygulanır.' },
            { ekran: 'ana', gecis: 'ileri', baslik: 'Hepsi bu kadar', metin: 'Sistem seçiliyken tema, telefonunuzun gece moduna göre kendiliğinden değişir. Ayarlardan çıkmak için üstteki geri düğmesini kullanın.' },
        ],
    },
];

/** Teorik dersi uygulayan görev (varsa). */
export const derseAitGorev = (dersId: string) => GOREVLER.find((g) => g.dersler.includes(dersId));
