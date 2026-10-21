/**
 * Kılavuzun "Uygulamalı öğrenim" bölümü: gerçek ekranlarda adım adım görevler.
 *
 * Her adım bir öğeyi vurgular ve ne yapılacağını söyler; kullanıcı o işi
 * yaptığında kendiliğinden sonraki adıma geçilir. Adım, dokunuşun kendisine
 * değil sonucuna bakar; parmak kayıp iş olmadıysa adım da ilerlemez:
 * - { gorunce }: dokunuşun açtığı şey (menü, pencere, kart düğmeleri) ekranda
 *   belirince,
 * - { eylem }: uygulama o işi başarıyla yaptığında (dersTamamla ya da
 *   kilavuzEylemi ile yayınlanan kimlik; örn. 'b-bahce' bahçe oluşturulunca),
 * - 'dokun': vurgulanan öğeye dokunulunca (tıklama); ekran değiştiren düğmeler,
 * - 'ileri': yalnız bilgi veren adım, kartın İleri düğmesiyle.
 *
 * Teorik öğrenimdeki (kilavuzIcerik) dersler `dersler` alanıyla göreve bağlanır;
 * dersin kartı "Adım adım uygulayın" düğmesiyle bu görevi başlatır.
 * Seçiciler: data-tur / data-kilavuz işaretleri ya da kalıcı aria-label'lar.
 */
import type { KilavuzIkonu } from './kilavuzIcerik';

export type GorevEkrani = 'ana' | 'liste' | 'tuval' | 'editor';
export type GorevGecisi = 'dokun' | 'ileri' | { eylem: string } | { gorunce: string };

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
    /** Öğrenme yolu: Liste ya da Tuval yolunun görevi; yoksa iki yolda da ortak. */
    yol?: 'liste' | 'tuval';
    /** Görev bitince "Neler öğrendiniz" listesi. */
    kazanimlar: string[];
    /** Bu görevle uygulanan teorik dersler. */
    dersler: string[];
    adimlar: GorevAdimi[];
}

const ISTEM = '[role="dialog"][aria-labelledby="istem-basligi"]';
const BAHCE_PENCERESI = '[aria-labelledby="create-garden-title"]';
const LISTE_MENU = ['[data-kilavuz-secili] [aria-haspopup="menu"]', '[aria-haspopup="menu"][aria-label$=" seçenekleri"]'];
const KART_DUGMELERI = '[data-kart-aktif] [data-kart-eylem]';
const NOT_YOK = 'Bu bahçede henüz not yok. Önce "Ağaç dikin, dal ekleyin" görevini yapın.';
const KART_YOK = 'Tuvalde henüz kart yok. Önce "Tuvalde ilk ağacı dikin" görevini yapın ya da boş tuvaldeki İlk tohumu ek\'e dokunun.';

export const GOREVLER: KilavuzGorevi[] = [
    {
        id: 'g-bahce',
        ikon: 'Sprout',
        baslik: 'İlk bahçenizi kurun',
        aciklama: 'Bir konu için bahçe açın ve içine girin.',
        sure: 1,
        baslangic: 'ana',
        kazanimlar: ['Her konu için ayrı bir bahçe açılır.', 'Bahçe, Liste ya da Tuval düğmesiyle açılır.', 'İçerideyken üstteki Liste | Tuval seçicisiyle iki ekran arasında geçersiniz.'],
        dersler: ['b-bahce'],
        adimlar: [
            { ekran: 'ana', hedef: ['[data-tur="yeni-bahce"]'], gecis: { gorunce: BAHCE_PENCERESI }, baslik: 'Yeni Bahçe\'ye dokunun', metin: 'İş, okul, kitaplar… Her konu için ayrı bir bahçe açarsınız.' },
            { ekran: 'ana', hedef: [BAHCE_PENCERESI], gecis: { eylem: 'b-bahce' }, baslik: 'Bahçeye bir ad verin', metin: 'Örneğin "Fikirlerim" yazın ve **Oluştur**\'a dokunun.' },
            { ekran: 'ana', hedef: ['[data-kilavuz="bahce-gorunumleri"]'], gecis: 'dokun', baslik: 'Bahçenizi açın', metin: 'Yeni bahçeniz en üstte. **Liste** notları alt alta, **Tuval** kart kart gösterir. Hangisinde çalışmak istiyorsanız ona dokunun; sıradaki görevler o ekranda sürer. İçeride üstteki **Liste | Tuval** seçicisiyle istediğiniz an ötekine geçersiniz.' },
        ],
    },
    {
        id: 'g-iki-ekran',
        ikon: 'Layers',
        baslik: 'Liste ile Tuval arasında geçin',
        aciklama: 'Aynı bahçeyi iki ekranda görün, aralarında gidip gelin.',
        sure: 1,
        baslangic: 'liste',
        kazanimlar: ['Liste ve Tuval aynı notları gösterir.', 'Üstteki Liste | Tuval seçicisi iki ekran arasında geçirir.', 'Seçili olan, şu an bulunduğunuz ekrandır.'],
        dersler: ['b-iki-ekran'],
        adimlar: [
            { ekran: 'liste', hedef: ['nav[aria-label="Bahçe görünümü"]'], gecis: 'ileri', baslik: 'Görünüm seçici', metin: 'Bahçenin iki ekranı vardır. Beyaz olan, şu an bulunduğunuz ekrandır: **Liste**.' },
            { ekran: 'liste', hedef: ['[data-kilavuz="gorunum-tuval"]'], gecis: 'dokun', baslik: 'Tuval\'e geçin', metin: '**Tuval**\'e dokunun. Aynı notlar büyük bir yüzeyde kart kart açılır.' },
            { ekran: 'tuval', hedef: ['[data-kilavuz="gorunum-liste"]'], gecis: 'dokun', baslik: 'Liste\'ye dönün', metin: 'Aynı seçici burada da var. **Liste**\'ye dokunarak geri dönün.' },
            { ekran: 'liste', gecis: 'ileri', baslik: 'İki ekran, aynı notlar', metin: 'Birinde eklediğiniz not ötekinde de görünür. Okumak ve düzenlemek için Liste\'yi, büyük resmi görmek için Tuval\'i kullanın. Sol üstteki geri ok ana ekrana döner.' },
        ],
    },
    {
        id: 'g-agac',
        yol: 'liste',
        ikon: 'TreePine',
        baslik: 'Ağaç dikin, dal ekleyin',
        aciklama: 'Listede bir ağaç açın ve altına ilk dalını ekleyin.',
        sure: 2,
        baslangic: 'liste',
        kazanimlar: ['Ağaç, bahçedeki ana konudur.', 'Dallar ve yapraklar üç nokta menüsünden eklenir.', 'Ok düğmesi dalları açıp kapatır.'],
        dersler: ['b-kavram', 'b-liste'],
        adimlar: [
            { ekran: 'liste', hedef: ['[aria-label="Yeni ağaç ekle"]'], gecis: { gorunce: ISTEM }, baslik: 'Yeni ağaç ekleyin', metin: 'Ağaç, bahçedeki ana konudur. Sağ üstteki **artı** düğmesine dokunun.' },
            { ekran: 'liste', hedef: [ISTEM], gecis: { eylem: 'b-liste' }, baslik: 'Ağaca ad verin', metin: 'Örneğin "Proje fikirleri" yazıp **Tamam**\'a dokunun. Boş bırakırsanız ad kendiliğinden verilir.' },
            { ekran: 'liste', hedef: LISTE_MENU, gecis: { gorunce: '[data-kilavuz="menu-dal-ekle"]' }, baslik: 'Ağacın menüsünü açın', metin: 'Yeni ağacınız seçili. Satırın sonundaki **üç noktaya** dokunun.' },
            { ekran: 'liste', hedef: ['[data-kilavuz="menu-dal-ekle"]'], gecis: { gorunce: ISTEM }, baslik: 'Altına not ekleyin', metin: 'Menüde **Yeni yaprak ekle**\'ye (ağacın zaten dalı varsa **Yeni dal ekle**\'ye) dokunun.', yoksa: 'Menü kapandı. Geri ile bir önceki adıma dönün ya da ağacın üç noktasına yeniden dokunun.' },
            { ekran: 'liste', hedef: [ISTEM], gecis: { eylem: 'b-liste' }, baslik: 'Dala ad verin', metin: 'Bir ad yazıp **Tamam**\'a dokunun.' },
            { ekran: 'liste', hedef: ['[data-kilavuz-secili]'], gecis: 'ileri', baslik: 'Ağacınız dallandı', metin: 'Yeni not, ağacın altında girintili duruyor. Ağacın yanındaki **ok** dalları açıp kapatır; aynı menüyle dallara da yaprak eklersiniz.' },
        ],
    },
    {
        id: 'g-duzen',
        yol: 'liste',
        ikon: 'Palette',
        baslik: 'Renk verin ve budayın',
        aciklama: 'Bir dalı renklendirin, sonra silmeden kenara alın.',
        sure: 2,
        baslangic: 'liste',
        kazanimlar: ['Dal rengi her dokunuşta sıradakine geçer ve kaydedilir.', 'Budama silmez: not soluk ve üstü çizili kalır.', 'Budananlar düğmesi onları gizler ya da gösterir.'],
        dersler: ['t-liste', 't-budama'],
        adimlar: [
            { ekran: 'liste', hedef: LISTE_MENU, gecis: { gorunce: '[aria-label="Dal rengini değiştir"]' }, baslik: 'Bir notun menüsünü açın', metin: 'Satırın sonundaki **üç noktaya** dokunun.', yoksa: NOT_YOK },
            { ekran: 'liste', hedef: ['[aria-label="Dal rengini değiştir"]'], gecis: { eylem: 't-liste' }, baslik: 'Rengini değiştirin', metin: '**Dal rengi**\'ne dokunun. Her dokunuş sıradaki renge geçer.', yoksa: 'Menü kapandı. Geri ile bir önceki adıma dönün.' },
            { ekran: 'liste', hedef: LISTE_MENU, gecis: { gorunce: '[data-kilavuz="menu-buda"]' }, baslik: 'Menüyü yeniden açın', metin: 'Şimdi budamayı deneyelim. Aynı notun **üç noktasına** dokunun.' },
            { ekran: 'liste', hedef: ['[data-kilavuz="menu-buda"]'], gecis: { eylem: 't-budama' }, baslik: 'Notu budayın', metin: '**Buda**\'ya dokunun. Not silinmez; soluk ve üstü çizili görünür.', yoksa: 'Menü kapandı. Geri ile bir önceki adıma dönün.' },
            { ekran: 'liste', hedef: ['[role="tablist"][aria-label="Budanan notlar"]'], gecis: 'ileri', baslik: 'Budananları yönetin', metin: 'Bu düğmeler budanan notları gizler ya da gösterir. Budamayı geri almak için menüdeki **Budamayı geri al**\'a dokunun.' },
        ],
    },
    {
        id: 'g-tuval-agac',
        yol: 'tuval',
        ikon: 'Sprout',
        baslik: 'Tuvalde ilk ağacı dikin',
        aciklama: 'Boş tuvale ilk tohumu ekin, ağacın kökü olsun.',
        sure: 1,
        baslangic: 'tuval',
        kazanimlar: ['Boş tuvalde İlk tohumu ek ilk ağacı açar.', 'Büyük kart ağacın köküdür; dallar onun altına eklenir.'],
        dersler: ['b-tuval'],
        adimlar: [
            { ekran: 'tuval', hedef: ['[data-kilavuz="tuval-ilk-agac"]'], gecis: { gorunce: ISTEM }, baslik: 'İlk tohumu ekin', metin: 'Bahçeniz boş. Ortadaki **İlk tohumu ek**\'e dokunun; ağacın kökü olacak ilk not açılır.', yoksa: 'Bu bahçede zaten ağaç var; bu görevin işi yapılmış. **Adımı geç** ile ilerleyin.' },
            { ekran: 'tuval', hedef: [ISTEM], gecis: { eylem: 'b-tuval' }, baslik: 'Ağaca ad verin', metin: 'Örneğin "Alışveriş" yazıp **Tamam**\'a dokunun.' },
            { ekran: 'tuval', hedef: ['[data-yk-derinlik="0"]'], gecis: 'ileri', baslik: 'Ağacınız tuvalde', metin: 'Bu büyük kart ağacın **köküdür**. Dallar onun altına eklenir; sıradaki görevlerde tuvalde gezinmeyi ve kart düğmeleriyle dal eklemeyi öğrenirsiniz.' },
        ],
    },
    {
        id: 'g-tuval-gezin',
        yol: 'tuval',
        ikon: 'MousePointer2',
        baslik: 'Tuvalde gezinin',
        aciklama: 'Tuvali kaydırın, yakınlaştırın, her şeyi ekrana sığdırın.',
        sure: 1,
        baslangic: 'tuval',
        kazanimlar: ['Boş yerde parmakla sürüklemek tuvali kaydırır.', 'İki parmak ya da artı ve eksi düğmeleri yakınlaştırır.', 'Sığdır düğmesi kaybolduğunuzda tüm notları ekrana getirir.'],
        dersler: ['t-tuval'],
        adimlar: [
            { ekran: 'tuval', gecis: { eylem: 'tuval-kaydir' }, baslik: 'Tuvali kaydırın', metin: 'Parmağınızı kartların dışında **boş bir yere** koyun ve sürükleyin. Tuval büyük bir masa gibidir; istediğiniz yere kaydırırsınız.' },
            { ekran: 'tuval', hedef: ['[aria-label="Yakınlaştır"]'], gecis: { eylem: 'tuval-olcek' }, baslik: 'Yakınlaştırın', metin: '**İki parmağınızı** ekranda açın ya da alttaki **artı** düğmesine dokunun. Eksi uzaklaştırır.' },
            { ekran: 'tuval', hedef: ['[aria-label="Tüm notları ekrana sığdır"]'], gecis: { eylem: 'tuval-sigdir' }, baslik: 'Hepsini ekrana sığdırın', metin: 'Kaybolursanız bu düğme bütün notları ekrana getirir. Şimdi dokunun.' },
            { ekran: 'tuval', gecis: 'ileri', baslik: 'Tuvalde rahatsınız', metin: 'Kaydırma, yakınlaştırma ve sığdırma bu kadar. Sıradaki görevde kartlara not eklemeyi öğrenirsiniz.' },
        ],
    },
    {
        id: 'g-tuval',
        yol: 'tuval',
        ikon: 'LayoutDashboard',
        baslik: 'Tuvalde not ekleyin',
        aciklama: 'Kart düğmeleriyle altına ve yanına not ekleyin.',
        sure: 3,
        baslangic: 'tuval',
        kazanimlar: ['Karta kısa dokunup bırakınca düğmeleri açılır.', 'Altına alt not, Yanına aynı seviyede not ekler.'],
        dersler: ['b-tuval'],
        adimlar: [
            { ekran: 'tuval', hedef: ['[data-yk-id]'], gecis: { gorunce: KART_DUGMELERI }, baslik: 'Bir karta dokunun', metin: 'Her not bir karttır. Karta **kısa dokunup parmağınızı kaldırın**; çevresinde düğmeler açılır. Parmağınızı kaydırırsanız tuval kayar, düğmeler açılmaz.', yoksa: KART_YOK },
            { ekran: 'tuval', hedef: ['[data-kart-aktif] [data-kart-eylem="alt"]'], gecis: { gorunce: ISTEM }, baslik: 'Altına not ekleyin', metin: 'Kartın altındaki **Altına** düğmesine dokunun. Yeni not bu kartın alt notu olur.', yoksa: 'Kart düğmeleri kapandı. Geri ile bir önceki adıma dönüp karta yeniden dokunun.' },
            { ekran: 'tuval', hedef: [ISTEM], gecis: { eylem: 'b-tuval' }, baslik: 'Nota ad verin', metin: 'Örneğin "Ekmek" yazıp **Tamam**\'a dokunun. Yeni kart, dalın ucunda belirir.' },
            { ekran: 'tuval', hedef: ['[data-yk-derinlik="1"]', '[data-yk-id]'], gecis: { gorunce: KART_DUGMELERI }, baslik: 'Bir dal kartına dokunun', metin: 'Şimdi aynı seviyeye bir not ekleyelim. Vurgulanan karta **kısa dokunun**.', yoksa: KART_YOK },
            { ekran: 'tuval', hedef: ['[data-kart-aktif] [data-kart-eylem="yan"]', '[data-kart-aktif] [data-kart-eylem="sol"]'], gecis: { gorunce: ISTEM }, baslik: 'Yanına not ekleyin', metin: '**Yanına** düğmesine dokunun. Yeni not aynı seviyeye, bu kartın kardeşi olarak eklenir.', yoksa: 'Kart düğmeleri kapandı. Geri ile bir önceki adıma dönüp karta yeniden dokunun.' },
            { ekran: 'tuval', hedef: [ISTEM], gecis: { eylem: 'b-tuval' }, baslik: 'Ona da ad verin', metin: 'Örneğin "Süt" yazıp **Tamam**\'a dokunun.' },
            { ekran: 'tuval', gecis: 'ileri', baslik: 'Ağacınız büyüyor', metin: '"Ekmek" ve "Süt" aynı dalda, kardeş kartlar olarak duruyor. **Altına** derinleştirir, **Yanına** genişletir; büyük resmi tuvalde böyle kurarsınız.' },
        ],
    },
    {
        id: 'g-tuval-yaz',
        yol: 'tuval',
        ikon: 'PenLine',
        baslik: 'Tuvalde budayın ve yazın',
        aciklama: 'Kart düğmeleriyle bir notu budayın, sonra içine yazın.',
        sure: 2,
        baslangic: 'tuval',
        kazanimlar: ['Buda notu silmez; kart soluk görünür, aynı düğme geri alır.', 'Düzenle notu tam ekran editörde açar.', 'Geri ile tuvale dönülür; yazdıklarınız kartta durur.'],
        dersler: ['t-budama', 'b-not'],
        adimlar: [
            { ekran: 'tuval', hedef: ['[data-yk-derinlik="1"]', '[data-yk-id]'], gecis: { gorunce: KART_DUGMELERI }, baslik: 'Bir dal kartına dokunun', metin: 'Vurgulanan karta **kısa dokunun**; düğmeleri açılır.', yoksa: KART_YOK },
            { ekran: 'tuval', hedef: ['[data-kart-aktif] [data-kart-eylem="buda"]'], gecis: { eylem: 't-budama' }, baslik: 'Kartı budayın', metin: 'Üstteki **Buda**\'ya dokunun. Not silinmez; kenara alınır.', yoksa: 'Kart düğmeleri kapandı. Geri ile bir önceki adıma dönüp karta yeniden dokunun.' },
            { ekran: 'tuval', gecis: 'ileri', baslik: 'Budanan kart', metin: 'Budanan kart soluk görünür. Geri almak için karta dokunup aynı düğmeye (**Budamayı geri al**) dokunun.' },
            { ekran: 'tuval', hedef: ['[data-yk-id]'], gecis: { gorunce: KART_DUGMELERI }, baslik: 'Yazmak için karta dokunun', metin: 'Şimdi bir notun içine yazalım. Vurgulanan karta **kısa dokunun**.', yoksa: KART_YOK },
            { ekran: 'tuval', hedef: ['[data-kart-aktif] [data-kart-eylem="editor"]'], gecis: 'dokun', baslik: 'Düzenle\'ye dokunun', metin: 'Üstteki **Düzenle** notu tam ekran editörde açar.', yoksa: 'Kart düğmeleri kapandı. Geri ile bir önceki adıma dönüp karta yeniden dokunun.' },
            { ekran: 'editor', hedef: ['[aria-label="Not içeriği"]'], gecis: { eylem: 'b-not' }, baslik: 'Bir şeyler yazın', metin: 'Başlığın altındaki alana birkaç kelime yazın; kendiliğinden kaydedilir.' },
            { ekran: 'editor', hedef: ['[aria-label="Geri dön"]'], gecis: 'dokun', baslik: 'Tuvale dönün', metin: '**Geri** ile tuvale dönün. Yazdıklarınız kartın içinde durur.' },
        ],
    },
    {
        id: 'g-editor',
        yol: 'liste',
        ikon: 'PenLine',
        baslik: 'Notu editörde yazın',
        aciklama: 'Bir notu tam ekran editörde açın, yazın ve dönün.',
        sure: 2,
        baslangic: 'liste',
        kazanimlar: ['Kalem düğmesi notu editörde açar.', 'Yazdıklarınız kendiliğinden kaydedilir.', 'Geri düğmesi bahçeye döndürür.'],
        dersler: ['b-not'],
        adimlar: [
            { ekran: 'liste', hedef: ['[data-kilavuz-secili] [aria-label="Notu editörde aç"]', '[aria-label="Notu editörde aç"]'], gecis: 'dokun', baslik: 'Editörü açın', metin: 'Satırdaki **kalem** düğmesi notu tam ekran editörde açar.', yoksa: NOT_YOK },
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
            { ekran: 'ana', hedef: ['[data-tur="ayarlar"]'], gecis: { gorunce: '[data-ayar="gorunum"]' }, baslik: 'Ayarları açın', metin: 'Uygulamanın tüm ayarları ve bu kılavuz buradadır.' },
            { ekran: 'ana', hedef: ['[data-ayar="gorunum"]'], gecis: { gorunce: '[data-kilavuz="tema-secici"]' }, baslik: 'Görünüm\'e girin', metin: 'Ayarlar konulara göre gruplanmıştır. **Uygulama** grubundaki **Görünüm**\'e dokunun.', yoksa: 'Ayarların ana sayfasında değilsiniz. Geri ile bir önceki adıma dönün.' },
            { ekran: 'ana', hedef: ['[data-kilavuz="tema-secici"]'], gecis: { eylem: 't-gorunum' }, baslik: 'Bir tema seçin', metin: '**Açık**, **Koyu** ya da **Sistem**: şu ankinden farklı birine dokunun. Değişiklik hemen uygulanır.' },
            { ekran: 'ana', gecis: 'ileri', baslik: 'Hepsi bu kadar', metin: 'Sistem seçiliyken tema, telefonunuzun gece moduna göre kendiliğinden değişir. Ayarlardan çıkmak için üstteki geri düğmesini kullanın.' },
        ],
    },
];

/** Teorik dersi uygulayan görev (varsa); birden çoksa kullanıcının öğrenme yolundaki. */
export const derseAitGorev = (dersId: string, yol?: 'liste' | 'tuval') => {
    const adaylar = GOREVLER.filter((g) => g.dersler.includes(dersId));
    return adaylar.find((g) => g.yol === yol) ?? adaylar.find((g) => !g.yol) ?? adaylar[0];
};

/**
 * Yolun görev sırası: önce ortak başlangıç (bahçe kurma), sonra seçilen yolun
 * görevleri, sonra ortak görevler (iki ekran arası geçiş, görünüm). Öteki yolun
 * görevleri bu listede yer almaz.
 */
export function yolGorevleri(yol: 'liste' | 'tuval'): KilavuzGorevi[] {
    const bas = GOREVLER.filter((g) => g.id === 'g-bahce');
    const yolun = GOREVLER.filter((g) => g.yol === yol);
    const son = GOREVLER.filter((g) => !g.yol && g.id !== 'g-bahce');
    return [...bas, ...yolun, ...son];
}

/** Yolda henüz bitmemiş ilk görev. */
export const siradakiGorev = (yol: 'liste' | 'tuval', biten: string[]) => yolGorevleri(yol).find((g) => !biten.includes(g.id));

/**
 * Bir adıma doğrudan geçilecekken (bölüm seçimi) başlanabilecek adım. Önceki adımın
 * açtığı pencereye ya da menüye bağlı adımlar (ad verme, menü öğesi) ve editör
 * adımları kendi başına başlatılamaz; o işi açan adıma dönülür.
 */
export function baslanabilirAdim(gorev: KilavuzGorevi, adim: number): number {
    let n = Math.max(0, Math.min(adim, gorev.adimlar.length - 1));
    while (n > 0) {
        const once = gorev.adimlar[n - 1].gecis;
        const bagli = typeof once === 'object' && 'gorunce' in once;
        if (!bagli && gorev.adimlar[n].ekran !== 'editor') break;
        n--;
    }
    return n;
}
