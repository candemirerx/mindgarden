/**
 * Kullanım kılavuzunun içeriği (seviyeler, dersler, hedef yolları, sözlük, sık sorulanlar).
 *
 * Tek kaynaktır: uygulama içindeki kılavuz (components/editor/UsageGuide) ve
 * Play paketi belgesi (scripts/kilavuz-belgesi.mjs → 02-kullanim-kilavuzu.md)
 * buradan üretilir; metni yalnız burada değiştirin. **kalın** yazım desteklenir.
 *
 * Her ders aynı öğrenme kalıbını izler: hedef (ne kazanacağınız) → görsel şema →
 * adımlar → "Şimdi deneyin" (uygulama) → "Akılda kalsın" (özet) → tek soruluk
 * "Kendinizi sınayın" (hatırlama alıştırması). Ders kimlikleri (id) cihazda
 * saklanan ilerlemenin anahtarıdır; değiştirmeyin.
 */
import type { SettingsSectionId } from '@/components/editor/SettingsHome';
import type { KilavuzGoster } from './kilavuzIlerleme';

/** Derslerde kullanılan simgelerin adları (lucide-react). */
export type KilavuzIkonu = 'Award' | 'Cloud' | 'Cpu' | 'Download' | 'HelpCircle' | 'Keyboard' | 'Layers' | 'LayoutDashboard' | 'Link2' | 'ListOrdered' | 'ListTree' | 'LogIn' | 'MonitorSmartphone' | 'MousePointer2' | 'Palette' | 'PenLine' | 'Settings' | 'Sparkles' | 'Sprout' | 'TreePine' | 'Wand2' | 'Wrench';

/** Derste gösterilen şematik çizim (components/editor/KilavuzGorseli). */
export type KilavuzGorseli = 'kavram' | 'giris' | 'anaEkran' | 'ikiEkran' | 'liste' | 'kart' | 'editor' | 'yedek' | 'yollar';

export interface KilavuzSorusu {
    soru: string;
    secenekler: string[];
    /** Doğru seçeneğin sırası (0'dan başlar). */
    dogru: number;
    /** Yanıttan sonra gösterilen kısa açıklama. */
    aciklama: string;
}

export interface KilavuzDersi {
    id: string;
    ikon: KilavuzIkonu;
    title: string;
    description: string;
    /** "Bu dersin sonunda …" cümlesinin devamı. */
    hedef: string;
    /** Tahmini süre (dakika). */
    sure: number;
    gorsel?: KilavuzGorseli;
    adimlar: string[];
    /** Okuduktan hemen sonra uygulamada yapılacak küçük görev. */
    dene?: string;
    /** Adımların altında gösterilen kısa ipucu. */
    ipucu?: string;
    /** Dersin tek cümlelik özeti. */
    hatirla: string;
    soru?: KilavuzSorusu;
    /** Ders nasıl kendiliğinden tamamlanır (yaparak öğrenme). */
    tamamlanma?: string;
    /** "Bana göster": ilgili ekranı açıp öğeyi vurgular. */
    goster?: KilavuzGoster;
    ayarId?: SettingsSectionId;
    ayarEtiketi?: string;
}

export interface KilavuzSeviyesi {
    id: string;
    ad: string;
    ikon: KilavuzIkonu;
    /** Seviyenin kime uygun olduğu ve sonunda ne yapabileceği. */
    ozet: string;
    dersler: KilavuzDersi[];
}

/** "Ne yapmak istiyorsunuz?" kısayolları: amaca göre seçilmiş ders sırası. */
export interface KilavuzYolu {
    id: string;
    baslik: string;
    aciklama: string;
    ikon: KilavuzIkonu;
    dersler: string[];
}

export const SEVIYELER: KilavuzSeviyesi[] = [
    {
        id: 'baslangic',
        ad: 'Başlangıç',
        ikon: 'Sprout',
        ozet: 'Uygulamayı ilk kez açtıysanız buradan başlayın. Önce uygulamanın ne olduğunu, sonra notlarınızı her cihazda nasıl aynı tutacağınızı ve iki temel ekranı, Liste ile Tuval\'i öğrenirsiniz. Sonunda ilk bahçenizi kurmuş, iki ekranda da not eklemiş ve ilk notunuzu yazmış olursunuz.',
        dersler: [
            {
                id: 'b-fikir',
                ikon: 'TreePine',
                title: 'Not Bahçesi nedir?',
                description: 'Önce uygulamanın ne işe yaradığını görün.',
                hedef: 'Not Bahçesi\'nin ne işe yaradığını ve hangi cihazlarda çalıştığını bilirsiniz.',
                sure: 2,
                gorsel: 'kavram',
                adimlar: [
                    'Not Bahçesi, notlarınızı **iç içe** tutan bir not uygulamasıdır. Bir konuyu başlıklara, başlıkları alt başlıklara bölersiniz; sonunda konu bir **ağaç** gibi dallanır.',
                    'Ders notu, kitap özeti, proje planı, toplantı notu ya da dağınık fikirleri toplamak için uygundur: büyük bir konuyu küçük, yönetilebilir parçalara ayırır.',
                    'Aynı notları **iki ekranda** görürsünüz: **Liste** (alt alta, iç içe satırlar) ve **Tuval** (büyük bir yüzeyde kartlar ve aralarındaki bağlar). Bu iki ekran uygulamanın temelidir.',
                    'Not Bahçesi **telefonda**, **bilgisayarda** ve **web sitesinde** çalışır. Google ile giriş yaptığınızda notlarınız bütün cihazlarınızda **eşitlenir**: telefonda yazdığınızı bilgisayarda, bilgisayarda yazdığınızı telefonda görürsünüz.',
                    'İnternet yokken de yazmaya devam edersiniz; eşitleme internet geldikten sonra uygulamayı açtığınızda ya da bir sonraki değişikliğinizde tamamlanır. Yapay zekâ ve telefonu bilgisayarın klavyesi gibi kullanmak isterseniz kullanacağınız eklerdir.',
                ],
                dene: 'Üstteki **Uygulamalı öğrenim** sekmesinde **Hızlı tur**\'a dokunun: uygulama sizi ana ekranda bir dakikada gezdirir. İstediğiniz an atlayabilirsiniz.',
                hatirla: 'Not Bahçesi, büyük konuları iç içe notlara bölen ve Google ile giriş yaptığınızda telefon, bilgisayar ve web\'de aynı notları gösteren bir not uygulamasıdır.',
                soru: {
                    soru: 'Telefonda yazdığınız notu bilgisayarda da görmek için ne gerekir?',
                    secenekler: ['İki cihazda da aynı Google hesabıyla giriş yapmak', 'Notu kendinize e-postayla göndermek', 'Bu mümkün değil; notlar yalnız telefonda kalır'],
                    dogru: 0,
                    aciklama: 'Google ile giriş yaptığınız her cihazda notlarınız eşitlenir; telefon, bilgisayar ve web sitesi aynı bahçeleri gösterir.',
                },
                tamamlanma: 'Uygulamalı öğrenim sekmesindeki Hızlı turu sonuna kadar izlediğinizde ya da soruyu doğru yanıtladığınızda tamamlanır.',
            },
            {
                id: 'b-kavram',
                ikon: 'ListTree',
                title: 'Bahçe, ağaç, dal, yaprak',
                description: 'Dört kelime, tek fikir: her şey bir nottur.',
                hedef: 'Uygulamanın dört temel kelimesini ve aralarındaki ilişkiyi bilirsiniz.',
                sure: 2,
                gorsel: 'kavram',
                adimlar: [
                    '**Bahçe** bir konu ya da projedir: "Ders notları", "Kitaplar", "İş" gibi. Ana ekranda bahçeleriniz kart kart sıralanır.',
                    'Bahçenin içindeki en üst düzey notlara **ağaç** denir. "Ders notları" bahçesinde "Matematik" ve "Tarih" birer ağaçtır.',
                    'Bir notun altına başka notlar eklersiniz. Altında not olan nota **dal**, altında not olmayana **yaprak** denir: "Matematik → Türev → Örnek sorular" gibi.',
                    'Aslında hepsi aynı şeydir: bir **başlığı** ve isterseniz bir **içeriği** olan not. Bir yaprağın altına not eklediğinizde o yaprak kendiliğinden dala dönüşür; önceden karar vermeniz gerekmez.',
                ],
                dene: 'Aklınızdaki bir konuyu üç düzeyde düşünün: konu (bahçe), ana başlıklar (ağaçlar), alt başlıklar (dallar). Sonraki derslerde bunu uygulamada kuracaksınız.',
                ipucu: 'Kararsızsanız düz başlayın: önce birkaç ağaç açın, notlar çoğaldıkça altlarına dal ekleyerek düzenleyin.',
                hatirla: 'Bahçe konudur, ağaç ana başlıktır; altında not olan dal, olmayan yapraktır. Hepsi birer nottur.',
                soru: {
                    soru: '"Tarih" ağacındaki "Osmanlı" notunun altına "Kuruluş" notunu eklediniz. "Osmanlı" artık nedir?',
                    secenekler: ['Yaprak', 'Dal', 'Bahçe'],
                    dogru: 1,
                    aciklama: 'Altında not olan her not daldır. "Osmanlı" bir alt not kazandığı için yapraktan dala dönüştü; "Kuruluş" ise yapraktır.',
                },
                tamamlanma: 'Soruyu doğru yanıtladığınızda tamamlanır.',
            },
            {
                id: 'b-giris',
                ikon: 'LogIn',
                title: 'İlk açılış: giriş yapın ya da hemen başlayın',
                description: 'Hoş geldiniz ekranında ne seçmeli?',
                hedef: 'İlk ekrandaki iki seçeneğin farkını bilir ve size uyanı seçersiniz.',
                sure: 1,
                gorsel: 'giris',
                adimlar: [
                    'Uygulamayı ilk açtığınızda **Hoş geldiniz** ekranı çıkar.',
                    '**Giriş Yap**: Google hesabınızla oturum açarsınız. Notlarınız Google Drive\'ınıza yedeklenir ve aynı hesapla girdiğiniz **telefon, bilgisayar ve web sitesinde** görünür. Notlarınızı birden çok cihazda kullanacaksanız bunu seçin.',
                    '**Yerel Modda Gir**: hesap ve şifre gerekmez; notlarınız yalnız **bu cihazda** saklanır. Uygulamayı hızlıca denemek için uygundur.',
                    'Bu seçim kalıcı değildir. Yerel modda başlayıp sonradan **Ayarlar → Hesap ve giriş** bölümünden Google ile giriş yaparsanız bu cihazda yazdığınız bahçeler hesabınıza taşınır.',
                ],
                ipucu: 'Yerel modda uygulamayı kaldırırsanız notlar da silinir. Önemli notlarınız için Google ile giriş yapın.',
                hatirla: 'Bütün cihazlarda aynı notlar için Google ile giriş yapın; yalnız denemek için Yerel Modda Gir yeterlidir, notlarınız sonradan hesaba taşınır.',
                soru: {
                    soru: 'Yerel modda bir hafta not tuttunuz, şimdi Google ile giriş yapmak istiyorsunuz. Notlarınıza ne olur?',
                    secenekler: ['Silinir, baştan başlarsınız', 'Hesabınıza taşınır', 'Yalnız yerel modda görünür'],
                    dogru: 1,
                    aciklama: 'Bu telefonda yerel modda oluşturduğunuz bahçeler, Google ile giriş yaptığınızda hesabınıza taşınır.',
                },
                ayarId: 'account',
                ayarEtiketi: 'Hesap ve girişi aç',
                tamamlanma: 'Uygulamaya giriş yaptığınızda (Google ile ya da yerel modda) kendiliğinden tamamlanır.',
            },
            {
                id: 'b-cihazlar',
                ikon: 'Cloud',
                title: 'Telefon, bilgisayar, web: her yerde aynı notlar',
                description: 'Google ile giriş ve eşitleme.',
                hedef: 'Notlarınızı telefonda, bilgisayarda ve web sitesinde aynı tutarsınız.',
                sure: 2,
                gorsel: 'yedek',
                adimlar: [
                    'Telefonda **Ayarlar → Hesap ve giriş** bölümünden **Google ile giriş yap**\'a dokunun. Giriş yapınca otomatik eşitleme kendiliğinden açılır.',
                    'Bilgisayarda tarayıcıdan **mindgarden-neon.vercel.app** adresini açın ve aynı Google hesabıyla giriş yapın. Bahçeleriniz birkaç saniye içinde orada da görünür.',
                    'Bundan sonra hangi cihazda yazarsanız yazın, değişiklik birkaç saniye içinde Drive\'a yazılır; öteki cihaz uygulamayı açtığınızda ya da orada bir değişiklik yaptığınızda güncellenir. İki cihazda aynı not değiştirildiyse **en son değiştirilen** sürüm geçerli olur.',
                    'Notlarınız Google Drive\'ınızın **uygulamaya özel gizli klasöründe** durur; başka uygulamalar göremez.',
                ],
                dene: 'Telefonda bir not ekleyin, birkaç saniye bekleyin; sonra bilgisayarda web sitesini açıp (ya da sayfayı yenileyip) aynı notun orada olduğunu görün.',
                ipucu: 'Her cihazda **aynı Google hesabını** kullanın; farklı hesaplar farklı bahçeler demektir.',
                hatirla: 'Her cihazda aynı Google hesabıyla giriş yapın; notlarınız telefon, bilgisayar ve web arasında kendiliğinden eşitlenir.',
                soru: {
                    soru: 'Telefonda ve bilgisayarda aynı notu değiştirdiniz. Eşitlemede hangisi geçerli olur?',
                    secenekler: ['Telefondaki', 'En son değiştirilen', 'İkisi de silinir'],
                    dogru: 1,
                    aciklama: 'Çakışmada en son değiştirilen sürüm geçerli olur; hangi cihazda değiştirildiği önemli değildir.',
                },
                ayarId: 'account',
                ayarEtiketi: 'Google ile giriş yap',
                tamamlanma: 'Google ile giriş yapıp eşitleme çalıştığında kendiliğinden tamamlanır.',
            },
            {
                id: 'b-bahce',
                ikon: 'Sprout',
                title: 'İlk bahçenizi kurun',
                description: 'Ana ekran ve bahçe kartı.',
                hedef: 'Bir bahçe oluşturur, adını değiştirir ve onu istediğiniz ekranda açarsınız.',
                sure: 1,
                gorsel: 'anaEkran',
                adimlar: [
                    'Ana ekranda **Yeni Bahçe** düğmesine dokunun (hiç bahçeniz yoksa **İlk Bahçemi Oluştur**) ve bahçeye bir ad verin.',
                    'Bahçe bir **kart** olarak görünür. Kartta bahçenin adı, oluşturulma tarihi ve içindeki ağaç sayısı yazar.',
                    'Kartın altında iki düğme vardır: **Liste** ve **Tuval**. Bahçeyi hangi ekranda açmak istiyorsanız ona dokunun.',
                    'Kartın adına dokunursanız bahçe **en son kullandığınız** ekranda açılır; ilk seferde Tuval açılır.',
                    'Kartın sağ üstündeki **üç nokta** menüsünden bahçeyi **yeniden adlandırabilir** ya da **silebilirsiniz**. Silmeden önce onay sorulur.',
                ],
                dene: '"Deneme" adında bir bahçe açın. Bu bahçeyi kılavuz boyunca alıştırma alanı olarak kullanabilir, sonra silebilirsiniz.',
                hatirla: 'Yeni Bahçe ile açın; kartın altındaki Liste ve Tuval düğmeleri aynı bahçeyi iki farklı ekranda açar.',
                soru: {
                    soru: 'Bahçe kartında bahçenin adına dokunduğunuzda ne açılır?',
                    secenekler: ['Her zaman Liste', 'En son kullandığınız ekran', 'Bahçe ayarları'],
                    dogru: 1,
                    aciklama: 'Ada dokunmak, o bahçede en son kullandığınız ekranı açar. Belirli bir ekranı istiyorsanız Liste ya da Tuval düğmesine dokunun.',
                },
                tamamlanma: 'Bir bahçe oluşturduğunuzda kendiliğinden tamamlanır.',
                goster: { ekran: 'ana', hedef: '[data-tur="yeni-bahce"]', baslik: 'Yeni Bahçe', metin: 'Buraya dokunup bahçenize bir ad verin. Bahçe, ana ekranda kart olarak görünür.' },
            },
            {
                id: 'b-iki-ekran',
                ikon: 'Layers',
                title: 'İki ekran: Liste ve Tuval',
                description: 'Aynı notlar, iki farklı bakış.',
                hedef: 'Liste ile Tuval\'in farkını, ne zaman hangisini kullanacağınızı ve aralarında nasıl geçileceğini bilirsiniz.',
                sure: 2,
                gorsel: 'ikiEkran',
                adimlar: [
                    '**Liste** notlarınızı bir içindekiler tablosu gibi alt alta, iç içe gösterir. Okumak, aramak, adlandırmak ve hızlıca düzenlemek için uygundur.',
                    '**Tuval** notlarınızı büyük bir yüzeyde **kartlar** olarak gösterir; her ağaç dallarıyla birlikte görünür. Büyük resmi görmek ve fikirleri yana, alta doğru büyütmek için uygundur.',
                    'İki ekran **aynı notları** gösterir. Listede eklediğiniz not Tuval\'de, Tuval\'de eklediğiniz not Listede de vardır; ayrı kopya yoktur.',
                    'Geçmek için: Listede sağ üstteki **Tuval** simgesine, Tuval\'de sağ üstteki **Liste** simgesine dokunun. Sol üstteki geri ok ana ekrana döner.',
                    'Uygulama her bahçe için en son hangi ekranı kullandığınızı hatırlar. Hangisini seveceğinizden emin değilseniz ikisini de deneyin.',
                ],
                dene: 'Deneme bahçenizi Liste\'de açın, sonra sağ üstteki simgeyle Tuval\'e geçip geri dönün.',
                hatirla: 'Liste okumak ve düzenlemek, Tuval büyük resmi görmek içindir; ikisi aynı notları gösterir.',
                soru: {
                    soru: 'Tuval\'de yeni bir not eklediniz. Liste ekranına geçince ne görürsünüz?',
                    secenekler: ['Not orada da vardır', 'Not yalnız Tuval\'dedir', 'Notun bir kopyası oluşur'],
                    dogru: 0,
                    aciklama: 'Liste ve Tuval aynı notları farklı biçimde gösterir. Bir ekranda yaptığınız her değişiklik ötekinde de görünür.',
                },
                tamamlanma: 'Bir bahçeyi hem Liste\'de hem Tuval\'de açtığınızda kendiliğinden tamamlanır.',
                goster: { ekran: 'ana', hedef: '[data-kilavuz="bahce-gorunumleri"]', baslik: 'Liste ve Tuval', metin: 'Bu iki düğme aynı bahçeyi iki farklı ekranda açar. Birini açın, sonra ekranın sağ üstündeki simgeyle ötekine geçin.' },
            },
            {
                id: 'b-liste',
                ikon: 'ListTree',
                title: 'Liste ekranında not ekleyin',
                description: 'Satırlarla iç içe notlar.',
                hedef: 'Liste ekranında ağaç açar, altına not ekler ve notu editörde açarsınız.',
                sure: 3,
                gorsel: 'liste',
                adimlar: [
                    'Bahçe kartında **Liste**\'ye dokunun. Bahçe boşsa **İlk Ağacı Dik**\'e, değilse sağ üstteki **artı** simgesine dokunup ağaca bir ad verin. Adı boş bırakırsanız uygulama bir ad koyar.',
                    'Her satır bir nottur. Satırdaki **ok** o notun altındaki notları açar ve kapatır.',
                    'Bir notun altına not eklemek için satırdaki **üç nokta** menüsünden **Yeni yaprak ekle**\'ye (notun altında zaten not varsa **Yeni dal ekle**\'ye) dokunun.',
                    'Notun içeriğini yazmak için satırdaki **Editörde aç** simgesine dokunun.',
                    'Üstteki **arama kutusu** bahçedeki not **başlıklarında** arar; bulunan notlar bağlı oldukları dallarla birlikte açılır.',
                ],
                dene: 'Deneme bahçesinde "Alışveriş" adında bir ağaç açın ve altına "Meyve" ile "Sebze" notlarını ekleyin.',
                ipucu: 'Tablet gibi geniş ekranlarda Liste iki bölmeli açılır: solda ağaçlar, sağda seçtiğiniz notun içeriği.',
                hatirla: 'Listede ağacı artı ile açın, alt notu üç nokta menüsünden ekleyin, içeriği Editörde aç ile yazın.',
                soru: {
                    soru: 'Listede bir notun altına yeni not eklemek için nereye dokunursunuz?',
                    secenekler: ['Sağ üstteki artı simgesine', 'Satırdaki üç nokta menüsüne', 'Arama kutusuna'],
                    dogru: 1,
                    aciklama: 'Satırdaki üç nokta menüsü o notun altına yaprak ya da dal ekler. Sağ üstteki artı ise bahçeye yeni bir ağaç ekler.',
                },
                tamamlanma: 'Liste ekranında bir not eklediğinizde kendiliğinden tamamlanır.',
                goster: { ekran: 'liste', hedef: '[aria-label="Yeni ağaç ekle"]', baslik: 'Yeni ağaç', metin: 'Artı bahçeye yeni bir ağaç ekler. Bir notun altına not eklemek için satırındaki üç noktaya dokunun.' },
            },
            {
                id: 'b-tuval',
                ikon: 'Layers',
                title: 'Tuval ekranında not ekleyin',
                description: 'Kartlarla düşünce haritası.',
                hedef: 'Tuvalde gezinir, karta dokunarak düğmelerini açar ve yanına ya da altına not eklersiniz.',
                sure: 3,
                gorsel: 'kart',
                adimlar: [
                    'Bahçe kartında **Tuval**\'e dokunun. Bahçe boşsa ortadaki **Düşünce ağacını başlatmak için tıkla** alanına dokunup ilk ağaca ad verin.',
                    'Yüzeyde gezinmek için parmağınızla **sürükleyin**; yakınlaştırıp uzaklaştırmak için **iki parmak** kullanın.',
                    'Her kart bir nottur. Karta **kısa dokunup bırakın**: kartın çevresinde düğmeler belirir.',
                    '**Altına** düğmesi seçili notun altına yeni not ekler. **Yanına** düğmeleri aynı seviyeye, notun önüne ya da arkasına not ekler; ağacın en üstündeki kartta bu yeni bir ağaç demektir. **Düzenle** notu editörde açar.',
                    'Düğmeleri kapatmak için boş bir alana dokunun.',
                ],
                dene: 'Deneme bahçesini Tuval\'de açın. "Alışveriş" kartına dokunup **Altına** ile "Ekmek" notunu ekleyin; sonra Listeye geçip notun orada da olduğunu görün.',
                ipucu: 'Kart düğmeleri, kart görünümü ve düzen sağ üstteki **Tuval ve ağaç ayarları** simgesinden değiştirilir; ayrıntılar Temel seviyesindedir.',
                hatirla: 'Karta kısa dokunun: Altına alt not, Yanına aynı seviyede not ekler, Düzenle editörü açar.',
                soru: {
                    soru: 'Tuvalde "Meyve" kartıyla aynı seviyeye "Sebze" notunu eklemek istiyorsunuz. Hangi düğme?',
                    secenekler: ['Altına', 'Yanına', 'Düzenle'],
                    dogru: 1,
                    aciklama: 'Yanına aynı seviyeye not ekler. Altına ise "Meyve"nin altına, onun alt notu olarak ekler.',
                },
                tamamlanma: 'Tuval\'de bir not eklediğinizde kendiliğinden tamamlanır.',
                goster: { ekran: 'tuval', hedef: '[data-yk-id]', baslik: 'Bir karta dokunun', metin: 'Karta kısa dokunup bırakın: çevresinde Altına, Yanına ve Düzenle düğmeleri açılır.' },
            },
            {
                id: 'b-not',
                ikon: 'PenLine',
                title: 'İlk notunuzu yazın',
                description: 'Yazın, kaydetmeyi uygulamaya bırakın.',
                hedef: 'Editörde başlık ve içerik yazar, kaydın nasıl yapıldığını bilirsiniz.',
                sure: 2,
                gorsel: 'editor',
                adimlar: [
                    'Listede **Editörde aç** simgesine, Tuval\'de kartın **Düzenle** düğmesine dokunun; metin editörü açılır.',
                    'Üstteki satır notun **başlığıdır**; listede ve kartta görünen ad budur. Altındaki geniş alana notun **içeriğini** yazın.',
                    'Editörün altında **Otomatik** işaretliyse yazdıklarınız kendiliğinden kaydedilir; ayrıca bir şey yapmanız gerekmez.',
                    'Sol üstteki **geri okuyla** geldiğiniz ekrana, Listeye ya da Tuval\'e dönersiniz.',
                ],
                dene: '"Meyve" notunu editörde açın ve içeriğine "elma, armut, muz" yazın. Geri dönüp Tuval\'de kartın önizlemesine bakın.',
                ipucu: 'Otomatik kaydetme kapalıysa sağ üstteki disket simgesiyle kendiniz kaydedin.',
                hatirla: 'Başlık notun adıdır, içerik notun gövdesidir; Otomatik açıkken her şey kendiliğinden kaydedilir.',
                soru: {
                    soru: 'Editörde "Otomatik" işaretli. Yazdıktan sonra ne yapmalısınız?',
                    secenekler: ['Disket simgesine dokunmalısınız', 'Hiçbir şey; yazılanlar kendiliğinden kaydedilir', 'Notu dışa aktarmalısınız'],
                    dogru: 1,
                    aciklama: 'Otomatik kaydetme açıkken yazdıklarınız kendiliğinden kaydedilir. Disket simgesi yalnız Otomatik kapalıyken gerekir.',
                },
                tamamlanma: 'Editörde bir notu değiştirdiğinizde kendiliğinden tamamlanır.',
                goster: { ekran: 'liste', hedef: '[aria-label="Notu editörde aç"]', baslik: 'Editörde aç', metin: 'Bu simge notu editörde açar. Üstte başlığı, altta içeriği yazarsınız.' },
            },
            {
                id: 'b-ayarlar',
                ikon: 'Settings',
                title: 'Ayarları ve bu kılavuzu bulun',
                description: 'Kaybolursanız buraya dönün.',
                hedef: 'Ayarları, kılavuzu ve geri dönüş yollarını her ekrandan bulursunuz.',
                sure: 1,
                adimlar: [
                    'Ana ekranın sol üstündeki **ağaç simgesi** ayarları açar. Editörde aynı ekranı **dişli** simgesi açar.',
                    'Ayarlarda üstteki arama kutusuna "tema", "yedek", "bilgisayar" gibi bir kelime yazarak ilgili bölümü bulabilirsiniz.',
                    'Ayarlardaki değişiklikler **anında kaydedilir**; ayrıca Kaydet düğmesi yoktur.',
                    'Bu kılavuz her zaman **Ayarlar → Kullanım kılavuzu**\'ndadır ve kaldığınız yeri hatırlar.',
                    'Tuvale özgü kart ve düğme seçenekleri tuvaldeki **Tuval ve ağaçlar → Görünüm** bölümündedir.',
                    'Telefonunuzun **geri tuşu** her zaman bir önceki ekrana döndürür. Açık bir pencere, kart menüsü ya da **Araç ekle** sayfası varsa önce onu kapatır; ana ekranda uygulamadan çıkar.',
                ],
                hatirla: 'Ayarlar ana ekranda ağaç simgesinde, editörde dişlidedir; değişiklikler anında kaydedilir.',
                soru: {
                    soru: 'Ayarlarda temayı değiştirdiniz. Kaydetmek için ne yaparsınız?',
                    secenekler: ['Kaydet düğmesine dokunursunuz', 'Hiçbir şey; değişiklik anında kaydedilir', 'Uygulamayı yeniden başlatırsınız'],
                    dogru: 1,
                    aciklama: 'Ayarlarda Kaydet düğmesi yoktur; her değişiklik anında kaydedilir.',
                },
                tamamlanma: 'Ayarları açtığınızda kendiliğinden tamamlanır.',
                goster: { ekran: 'ana', hedef: '[data-tur="ayarlar"]', baslik: 'Ayarlar', metin: 'Ayarlar ve bu kılavuz her zaman buradadır.' },
            },
            {
                id: 'b-deneme',
                ikon: 'Wrench',
                title: 'Deneme ağacında araçları deneyin',
                description: 'Kendi notlarınızı değiştirmeden tanıyın.',
                hedef: 'Araçları kendi notlarınıza dokunmadan güvenle denersiniz.',
                sure: 2,
                adimlar: [
                    'Ana ayarlardaki **Deneme ağacı** düğmesine dokunun; örnek içerikle editör açılır.',
                    'Yazmayı, yerel araçları ve görünür araçları bu geçici notta deneyin. Önceki editör notunuz geçişten önce kaydedilir.',
                    'Deneme notu bahçelerinize, dışa aktarıma veya Drive yedeğine eklenmez; çıkınca kaldırılır.',
                    'Bilgisayar araçları için bağlantı, yapay zekâ için etkin bir model gerekir; deneme ağacı bu işlemleri gerçek ayarlarınızla çalıştırır.',
                ],
                hatirla: 'Deneme ağacı geçicidir: istediğinizi deneyin, çıkınca kaybolur ve notlarınıza karışmaz.',
                soru: {
                    soru: 'Deneme ağacında yazdığınız metin Drive yedeğine girer mi?',
                    secenekler: ['Evet, otomatik yedeklenir', 'Hayır; deneme notu yedeğe ve bahçelere eklenmez'],
                    dogru: 1,
                    aciklama: 'Deneme notu geçicidir: bahçelerinize, dışa aktarıma ve Drive yedeğine eklenmez, çıkınca kaldırılır.',
                },
                tamamlanma: 'Deneme ağacını açtığınızda kendiliğinden tamamlanır.',
            },
        ],
    },
    {
        id: 'temel',
        ad: 'Temel',
        ikon: 'Layers',
        ozet: 'Başlangıç\'ta Liste ve Tuval\'in temelini gördünüz; burada ikisinin bütün düğmelerini öğrenirsiniz: düzenleme, renkler, kart menüsü, budama, editör ve yerel araçlar. Sonunda büyük bir konuyu düzenli bir ağaç hâlinde tutabilirsiniz.',
        dersler: [
            {
                id: 't-liste',
                ikon: 'ListTree',
                title: 'Listede düzenleyin',
                description: 'Ad, renk, kopyalama, silme.',
                hedef: 'Listede notları yeniden adlandırır, renklendirir, kopyalar ve güvenle silersiniz.',
                sure: 3,
                gorsel: 'liste',
                adimlar: [
                    'Satırdaki **üç nokta** menüsünde **Yeniden adlandır**, alt not ekleme, **Başlığı kopyala** ve **Sil** bulunur.',
                    'Satırdaki simgelerle notun **içeriğini kopyalayabilir** ya da notu **editörde açabilirsiniz**.',
                    '**Dal rengi** noktasına dokunarak konu başlıklarını görsel olarak ayırın; her dokunuş sıradaki rengi verir.',
                    'Ağaç listesinin üstündeki **Tümünü Aç** ve **Kapat** düğmeleri bütün dalları birden açar ya da kapatır.',
                    '**Sil** notu **ve altındaki bütün notları** kalıcı olarak siler; işlem geri alınamaz. Notu yalnız gözden kaldırmak istiyorsanız **Buda** kullanın (bu seviyede).',
                ],
                dene: 'Deneme bahçesindeki "Alışveriş" ağacına bir renk verin, sonra Tümünü Kapat ve Tümünü Aç ile farkı görün.',
                ipucu: 'Geniş ekranlarda üstteki **Bölmeli** ve **Pano** düğmeleriyle görünümü değiştirebilirsiniz: Bölmeli\'de sağda seçili notun içeriği okunur, Pano bütün ağaçları yan yana kartlar olarak gösterir.',
                hatirla: 'Üç nokta menüsü adlandırır, ekler, kopyalar ve siler; Sil alt notları da götürür, emin değilseniz budayın.',
                soru: {
                    soru: 'Altında beş not olan bir dalı Sil ile silerseniz ne olur?',
                    secenekler: ['Yalnız dal silinir, alt notlar yukarı taşınır', 'Dal ve altındaki beş not birlikte silinir', 'Dal budanır, geri alınabilir'],
                    dogru: 1,
                    aciklama: 'Sil, notu altındaki bütün notlarla birlikte kalıcı olarak siler. Geri alınabilir bir gizleme için Buda\'yı kullanın.',
                },
                tamamlanma: 'Listede bir dalın rengini değiştirdiğinizde kendiliğinden tamamlanır.',
                goster: { ekran: 'liste', hedef: '[aria-label="Dal rengini değiştir"]', baslik: 'Dal rengi', metin: 'Bu noktaya dokunarak dalın rengini değiştirin. Adlandırma, kopyalama ve silme satırın üç nokta menüsündedir.' },
            },
            {
                id: 't-tuval',
                ikon: 'Layers',
                title: 'Tuvalde ustalaşın',
                description: 'Hareketler, kart düğmeleri ve ağaç yönetimi.',
                hedef: 'Tuvalde hızlı gezinir, kart düğmelerini ve kaydırma hareketini kullanır, ağaçları yönetirsiniz.',
                sure: 3,
                gorsel: 'kart',
                adimlar: [
                    '**İki parmakla** yakınlaştırıp uzaklaştırın, **parmağınızla sürükleyerek** gezinin. Tuvaldeki ağaç sekmeleri ağaçlar arasında hızlıca atlamanızı sağlar.',
                    'Karta **kısa dokunup bırakın**; menü açık kalır. Varsayılan üst düğmeler soldan sağa **Kopyala**, **Düzenle** ve **Buda**dır.',
                    'Soldaki ve sağdaki **Yanına** düğmeleri aynı seviyeye, seçilen notun önüne veya arkasına not ekler; kökte yeni ağaç oluşturur. Alttaki **Altına** düğmesi alt not ekler.',
                    'Hızlı yol: karta ilk dokunuşta **basılı tutup bir düğmeye kaydırarak bırakmak** da o işlevi seçer. Bitişik ve Yumuşak modellerde bu hareket yerleşiktir.',
                    'Kart menüsü açıkken diğer kartlar ve bağlantılar gizlenir; boş alana dokununca menü kapanır.',
                    'Sağ üstteki **Tuval ve ağaç ayarları** iki sekmelidir: **Görünüm** tuvalin düzenini ve kartlarını, **Ağaçlar** ağaçları ve notları (yeniden adlandırma, renk, başlığı kopyalama, budama, silme) yönetir.',
                ],
                dene: 'Bir karta basılı tutup parmağınızı **Altına** düğmesine kaydırarak bırakın; tek hareketle alt not eklemiş olursunuz.',
                hatirla: 'Kısa dokunuş menüyü açar, basılı tutup kaydırmak düğmeyi tek hareketle seçer; ağaç yönetimi sağ üstteki ayarlardadır.',
                soru: {
                    soru: 'Tuvalde kart menüsünü kapatmak için ne yaparsınız?',
                    secenekler: ['Boş bir alana dokunursunuz', 'Kartı silersiniz', 'Uygulamayı kapatırsınız'],
                    dogru: 0,
                    aciklama: 'Boş alana dokunmak (ya da telefonun geri tuşu) açık kart menüsünü kapatır.',
                },
                tamamlanma: 'Tuval ve ağaç ayarlarını açtığınızda kendiliğinden tamamlanır.',
                goster: { ekran: 'tuval', hedef: '[aria-label="Tuval ve ağaç ayarları"]', baslik: 'Tuval ve ağaç ayarları', metin: 'Görünüm ve Ağaçlar sekmeleri buradadır: düzen, kartlar ve ağaç yönetimi.' },
            },
            {
                id: 't-kart-gorunum',
                ikon: 'Palette',
                title: 'Tuval, kart ve not düğmeleri',
                description: 'Düzeni, kartı ve düğmeleri ayrı seçin.',
                hedef: 'Tuvalin düzenini, kart tasarımını ve düğme modelini zevkinize göre seçersiniz.',
                sure: 3,
                adimlar: [
                    '**Tuval ve ağaçlar → Görünüm** bölümünde düzeni **Klasik**, **Organik** veya **Yatay akış** olarak seçin.',
                    '**Kart tasarımı** seçenekleri **Bahçe**, **Sade**, **Renkli** ve **Hap**tır. Önizlemeler etkin açık veya koyu temaya göre gösterilir; iki temanın tercihleri ayrı saklanır.',
                    '**Not düğmeleri** bölümünde **Bitişik**, **Yumuşak** veya **Alttan panel** seçin. Panel modelde karta dokunduktan sonra yazılı seçeneklere dokunun.',
                    'Bitişik ve Yumuşak seçiliyken **Düğme boyutu** bölümü açılır: üst şeritteki üç düğmenin, yan ve alt düğmelerin ve köşe düğmesinin boyutunu kaydırıcılarla ayarlarsınız; önizleme anında güncellenir.',
                    'Kart içeriği önizlemesini **Başlık**, **2 satır** veya **3 satır**; tuval gezinmesini **Çubuklar**, **Sekmeler** veya **Hiçbiri** olarak seçebilirsiniz.',
                    'Başlangıç seçimleri **Klasik düzen**, **Bahçe kartı**, **Bitişik düğmeler**, **2 satır** önizleme ve **Sekmeler**dir. Görünüm tercihleri bu cihazda saklanır.',
                ],
                hatirla: 'Düzen, kart tasarımı ve düğme modeli ayrı ayrı seçilir; hepsi Tuval ve ağaçlar → Görünüm\'dedir.',
                soru: {
                    soru: 'Düğmelerin büyük ve yazılı olmasını istiyorsunuz. Hangi düğme modelini seçersiniz?',
                    secenekler: ['Bitişik', 'Yumuşak', 'Alttan panel'],
                    dogru: 2,
                    aciklama: 'Alttan panel, karta dokununca alttan büyük ve yazılı düğmeler açar.',
                },
                tamamlanma: 'Tuvalin düzenini, kart tasarımını ya da düğme modelini değiştirdiğinizde kendiliğinden tamamlanır.',
                goster: { ekran: 'tuval', hedef: '[aria-label="Tuval ve ağaç ayarları"]', baslik: 'Görünüm', metin: 'Buraya dokunun; Görünüm sekmesinde düzeni, kart tasarımını ve not düğmelerini seçin.' },
            },
            {
                id: 't-kart-menu',
                ikon: 'Settings',
                title: 'Kart menüsünü ve ağaç konumunu ayarlayın',
                description: 'Düğmelere işlev verin, ağacı taşıyın.',
                hedef: 'Kart düğmelerine istediğiniz işlevi atar ve ağaçları tuvalde istediğiniz yere taşırsınız.',
                sure: 4,
                adimlar: [
                    'Bitişik veya Yumuşak seçiliyken **Tuval ve ağaçlar → Görünüm → Kart menüsü** bölümünden her konumun işlevini seçin.',
                    'Konumun yanındaki düğmeye dokunun: **Araç ekle** sayfası açılır. Dört sekme vardır: **Hazır** (düzenle, kopyala, buda, yanına ve altına ekle, taşı, ayarlar, **Yok**), **Bilgisayar**, **Makrolar** ve **Yapay zekâ**.',
                    '**Bilgisayar** sekmesinde **Dikte** (konuşulanlar kartın içeriğine eklenir), **Köprü dikte** (konuşulanlar doğrudan bilgisayara yazılır), telefon klavyesiyle yazma, notu bilgisayara yazma, panoya gönderme ve bilgisayarda Enter bulunur. Dikte sürerken kartın sol üstünde **Yazıyor · durdur** düğmesi kalır.',
                    'Dokunduğunuz öğe o düğmeye bağlanır ve sayfa kapanır; yeni seçim öncekinin yerini alır. Üst üç düğme, yan, alt ve köşe konumlarının hepsine istediğinizi ekleyebilirsiniz.',
                    'Ağacın tuvaldeki yerini değiştirmek için önce karta **kısa dokunup bırakın**. Menü açıkken karta yeniden **basılı tutup sürükleyin**; yeni konum kaydedilir. Menüye **Ağacı taşı** işlevini de atayabilirsiniz.',
                ],
                dene: 'Sağ alt köşe konumuna **Düzenle**\'yi atayın ve bir kartta deneyin; sonra **Yok** seçerek geri alın.',
                ipucu: 'Bilgisayar araçları için bilgisayar bağlantısı kurulu olmalıdır (İleri seviye); yapay zekâ düğmesi için etkin bir model gerekir (Orta seviye).',
                hatirla: 'Her kart konumuna Araç ekle sayfasından bir işlev atanır; ağaç, menü açıkken basılı tutup sürüklenerek taşınır.',
                soru: {
                    soru: 'Bir ağacı tuvalde başka bir yere taşımak için ilk adım nedir?',
                    secenekler: ['Karta kısa dokunup menüyü açmak', 'Ağacı silip yeniden oluşturmak', 'Liste ekranına geçmek'],
                    dogru: 0,
                    aciklama: 'Önce karta kısa dokunup menüyü açarsınız; menü açıkken karta basılı tutup sürükleyince ağaç taşınır.',
                },
                tamamlanma: 'Bir kart konumuna yeni bir işlev atadığınızda kendiliğinden tamamlanır.',
                goster: { ekran: 'tuval', hedef: '[aria-label="Tuval ve ağaç ayarları"]', baslik: 'Kart menüsü', metin: 'Buraya dokunun; Görünüm sekmesindeki Kart menüsü bölümünden her düğmeye işlev atayın.' },
            },
            {
                id: 't-budama',
                ikon: 'TreePine',
                title: 'Budanan notları gösterin veya gizleyin',
                description: 'Tamamlanan notları görünümden ayırın.',
                hedef: 'Biten notları silmeden görünümden ayırır, istediğinizde geri getirirsiniz.',
                sure: 2,
                adimlar: [
                    'Kart menüsündeki **Buda** ile notu budanmış olarak işaretleyin. Budama notu silmez; aynı işlevle geri alabilirsiniz.',
                    'Budanmış not soluk ve üstü çizili görünür.',
                    '**Budanan notlar** seçeneklerinde **Tümü**, **Gizle** veya **Sadece budanan** seçin.',
                    'Bu tercih liste ve tuvalde birlikte kullanılır.',
                ],
                dene: 'Deneme bahçesinde bir notu budayın, sonra **Gizle** ile gözden kaldırıp **Tümü** ile geri getirin.',
                hatirla: 'Buda silmez, işaretler; budananları istediğiniz an gizleyip gösterebilirsiniz.',
                soru: {
                    soru: 'Bitirdiğiniz bir görevi listeden kaldırmak ama kaybetmemek istiyorsunuz. Ne yaparsınız?',
                    secenekler: ['Silerim', 'Budarım ve budananları gizlerim', 'Yeniden adlandırırım'],
                    dogru: 1,
                    aciklama: 'Budama notu silmez; budananları gizleyerek görünümü sadeleştirir, istediğinizde geri getirirsiniz.',
                },
                tamamlanma: 'Bir notu budadığınızda kendiliğinden tamamlanır.',
                goster: { ekran: 'tuval', hedef: '[data-yk-id]', baslik: 'Buda', metin: 'Karta kısa dokunun; üst şeritteki Buda düğmesi notu silmeden budar.' },
            },
            {
                id: 't-editor',
                ikon: 'PenLine',
                title: 'Editörü tanıyın',
                description: 'Kopyala, dışa aktar, tam ekran.',
                hedef: 'Editörde içeriği kopyalar, PDF ya da Word olarak dışa aktarır ve tam ekran yazarsınız.',
                sure: 2,
                gorsel: 'editor',
                adimlar: [
                    'Üst şeritteki simgelerle içeriği **kopyalayabilir**, **PDF** ya da **Word** olarak dışa aktarabilirsiniz.',
                    'Sağ alttaki çapraz oklar editörü **tam ekran** yapar; dikkat dağıtan her şey gizlenir.',
                    'Alt bilgi satırında kayıt durumu ve **kelime sayısı** görünür.',
                ],
                dene: 'Bir notu tam ekran açın, birkaç cümle yazın ve kelime sayısının değiştiğini görün.',
                hatirla: 'Editör düz metin yazar; biçimli bir belge gerekirse notu PDF ya da Word olarak dışa aktarın.',
                soru: {
                    soru: 'Notunuzu öğretmeninize Word belgesi olarak göndermek istiyorsunuz. Nereden?',
                    secenekler: ['Editörün üst şeridindeki dışa aktarma simgesinden', 'Ayarlar → Görünüm\'den', 'Tuval ayarlarından'],
                    dogru: 0,
                    aciklama: 'Editörün üst şeridindeki dışa aktarma simgesi notu PDF ya da Word olarak kaydeder.',
                },
                tamamlanma: 'Editörde tam ekranı ya da dışa aktarmayı kullandığınızda kendiliğinden tamamlanır.',
                goster: { ekran: 'liste', hedef: '[aria-label="Notu editörde aç"]', baslik: 'Editörü açın', metin: 'Notu editörde açın; dışa aktarma üst şeritte, tam ekran sağ alttadır.' },
            },
            {
                id: 't-araclar',
                ikon: 'Wrench',
                title: 'Yerel araçlar (internetsiz)',
                description: 'Başlık üret, numaralandır, boşlukları sadeleştir.',
                hedef: 'Yapay zekâ gerektirmeyen yerel araçları açar ve kullanırsınız.',
                sure: 2,
                adimlar: [
                    'Yerel araçlar yapay zekâ kullanmaz, telefonun içinde çalışır. Varsayılan olarak gizlidir.',
                    '**Ayarlar → Yerel araçlar** bölümünde **Araçlar bölümünü editörde göster** anahtarını açın.',
                    'Editörde **Araçlar** sekmesi belirir: **İçerikten Başlık** nota kısa bir başlık üretir, **Sıralı Ad** adsız eklenen dala sıra numarası verir; metni numaralandıran ve fazla boşlukları temizleyen araçlar da vardır.',
                    'İstemediğiniz aracı aynı ekrandan kapatabilir ya da silebilirsiniz.',
                ],
                hatirla: 'Yerel araçlar internetsiz ve yapay zekâsız çalışır; önce Ayarlar → Yerel araçlar\'dan açılır.',
                soru: {
                    soru: 'Yerel araçlar için internet gerekir mi?',
                    secenekler: ['Evet', 'Hayır; telefonun içinde çalışırlar'],
                    dogru: 1,
                    aciklama: 'Yerel araçlar yapay zekâ kullanmaz ve tamamen telefonda çalışır.',
                },
                ayarId: 'yerel',
                ayarEtiketi: 'Yerel araçları aç',
                tamamlanma: 'Yerel araçları açtığınızda kendiliğinden tamamlanır.',
            },
            {
                id: 't-gorunum',
                ikon: 'Palette',
                title: 'Görünümü kişiselleştirin',
                description: 'Açık, koyu ya da sistem teması.',
                hedef: 'Uygulamanın temasını seçersiniz.',
                sure: 1,
                adimlar: [
                    '**Ayarlar → Görünüm → Tema** bölümünden **Açık**, **Koyu** ya da telefonunuzu izleyen **Sistem** temasını seçin.',
                    'Tuvaldeki kart tasarımı her tema için ayrı hatırlanır; tema değişince o temanın tercihi kullanılır.',
                ],
                hatirla: 'Tema Ayarlar → Görünüm\'dedir; Sistem seçeneği telefonunuzun açık/koyu ayarını izler.',
                ayarId: 'gorunum',
                ayarEtiketi: 'Görünüm ayarlarını aç',
                tamamlanma: 'Temayı değiştirdiğinizde kendiliğinden tamamlanır.',
            },
        ],
    },
    {
        id: 'orta',
        ad: 'Orta',
        ikon: 'Cloud',
        ozet: 'Notlarınızı güvene alın ve yapay zekâdan yardım alın. Sonunda notlarınız Google Drive\'da yedeklenir, başka cihazda da görünür ve metinlerinizi tek dokunuşla özetletip düzelttirebilirsiniz.',
        dersler: [
            {
                id: 'o-yedek',
                ikon: 'Cloud',
                title: 'Eşitleme ve yedeklemeyi yönetin',
                description: 'Otomatik senkron, elle eşitleme, Drive yedeği.',
                hedef: 'Eşitlemenin ne zaman çalıştığını bilir, gerektiğinde elle eşitler ya da yedek alırsınız.',
                sure: 3,
                adimlar: [
                    'Google ile giriş yaptığınızda **otomatik senkron** açılır: uygulama açılırken ve her değişiklikten birkaç saniye sonra notlarınız Drive\'daki yedekle birleştirilir.',
                    '**Ayarlar → Yedekleme** bölümündeki **Otomatik senkronu aç** anahtarıyla bunu kapatıp açabilirsiniz.',
                    '**Şimdi Senkronla** eşitlemeyi beklemeden yapar: Drive\'daki yedeği bu cihazdakiyle **birleştirir**, hiçbir tarafı silmez. **Drive\'a Yedekle** de aynı güvenli birleştirmeyi yapar.',
                    '**Drive\'dan Geri Yükle** Drive\'daki yedeği bu cihaza getirir ve buradaki notlarla birleştirir; yeni bir telefona geçtiğinizde işe yarar.',
                    'Yedekler Drive\'ınızın **uygulamaya özel gizli klasöründe** durur; başka uygulamalar göremez.',
                ],
                ipucu: 'Öteki cihazdaki son değişikliği hemen görmek istiyorsanız **Şimdi Senkronla**\'ya dokunun ya da uygulamayı yeniden açın.',
                hatirla: 'Otomatik senkron açılışta ve her değişiklikte çalışır; beklemeden eşitlemek için Şimdi Senkronla. Düğmelerin hiçbiri veri silmez, hep birleştirir.',
                soru: {
                    soru: 'Bilgisayarda az önce eklediğiniz notu telefonda hemen görmek istiyorsunuz. Telefonda ne yaparsınız?',
                    secenekler: ['Şimdi Senkronla\'ya dokunurum', 'Notu telefonda yeniden yazarım', 'Uygulamayı silip yeniden kurarım'],
                    dogru: 0,
                    aciklama: 'Şimdi Senkronla, Drive\'daki güncel yedeği bu cihazla hemen birleştirir; uygulamayı yeniden açmak da aynı işi görür.',
                },
                ayarId: 'sync',
                ayarEtiketi: 'Yedekleme ayarlarını aç',
                tamamlanma: 'Yedekleme düğmelerinden birini kullandığınızda kendiliğinden tamamlanır.',
            },
            {
                id: 'o-dosya',
                ikon: 'Download',
                title: 'Dosya olarak yedek almak',
                description: 'Drive kullanmadan taşımak için.',
                hedef: 'Bahçelerinizi dosyaya kaydeder ve yeni telefona geri yüklersiniz.',
                sure: 2,
                adimlar: [
                    '**Ayarlar → Veri yönetimi → Dışa Aktar** ile bahçelerinizi **JSON**, **HTML** veya **PDF** olarak kaydedin.',
                    'Yeni telefonda **İçe Aktar** ile **JSON** yedeğini geri yükleyin; HTML ve PDF okumak ve paylaşmak içindir.',
                    'Tek bir notu editörden **Word** ya da **PDF** olarak indirebilirsiniz.',
                ],
                hatirla: 'Geri yüklenebilir yedek JSON\'dur; HTML ve PDF okumak ve göndermek içindir.',
                soru: {
                    soru: 'Yeni telefona geri yüklemek için hangi biçimde dışa aktarırsınız?',
                    secenekler: ['PDF', 'JSON', 'HTML'],
                    dogru: 1,
                    aciklama: 'İçe Aktar JSON yedeğini geri yükler. PDF ve HTML okumak ve paylaşmak içindir.',
                },
                ayarId: 'data',
                ayarEtiketi: 'Veri yönetimini aç',
                tamamlanma: 'Bir dışa aktarma dosyası kaydettiğinizde kendiliğinden tamamlanır.',
            },
            {
                id: 'o-ai',
                ikon: 'Sparkles',
                title: 'Yapay zekâ ile ilk adım',
                description: 'Özetle, imla düzelt, çevir.',
                hedef: 'Bir yapay zekâ sağlayıcısı bağlar ve notunuzu tek dokunuşla işletirsiniz.',
                sure: 4,
                adimlar: [
                    '**Ayarlar → Yapay zekâ → Bulut** sekmesinde bir sağlayıcı seçip kendi API anahtarınızı girin ve etkinleştirin.',
                    '**Ayarlar → AI makroları** bölümünde **Yapay zekâ bölümünü editörde göster** anahtarını açın.',
                    'Editörde **AI** satırındaki bir makro kutusuna dokunun (ör. **Özetle**, **İmla Düzelt**).',
                    'Metnin bir bölümünü seçtiyseniz yalnız o bölüm işlenir.',
                    'Gelen sonucu **Onayla** ile kalıcı yapın ya da **Geri Al** ile vazgeçin.',
                ],
                ipucu: 'Yapay zekâ isteğe bağlıdır; kullanmazsanız uygulamanın geri kalanı aynen çalışır. Metin yalnız siz bir yapay zekâ işlemi başlattığınızda, seçtiğiniz sağlayıcıya gönderilir.',
                hatirla: 'Kendi anahtarınızla bir sağlayıcı bağlayın; sonucu Onayla ile kalıcı yapın, beğenmezseniz Geri Al.',
                soru: {
                    soru: 'Yapay zekânın önerdiği metni beğenmediniz. Ne yaparsınız?',
                    secenekler: ['Geri Al\'a dokunurum', 'Notu silerim', 'Uygulamayı kapatırım'],
                    dogru: 0,
                    aciklama: 'Geri Al notu yapay zekâ öncesi hâline döndürür; Onayla ise sonucu kalıcı yapar.',
                },
                ayarId: 'models',
                ayarEtiketi: 'Yapay zekâ ayarlarını aç',
                tamamlanma: 'Bir yapay zekâ sonucunu Onayla ile uyguladığınızda kendiliğinden tamamlanır.',
            },
            {
                id: 'o-ai-makro',
                ikon: 'Wand2',
                title: 'Kendi yapay zekâ komutlarınız',
                description: 'Sık yaptığınız işi tek kutuya koyun.',
                hedef: 'Sık kullandığınız bir yapay zekâ görevini tek dokunuşluk makroya çevirirsiniz.',
                sure: 2,
                adimlar: [
                    '**Ayarlar → AI makroları**\'nda yeni bir makro ekleyin: ad, kısa açıklama ve yapay zekâya gidecek görevi yazın (ör. "Bu metni resmî bir e-postaya çevir").',
                    'Makro, editördeki AI satırında kutu olarak görünür. İstemediğiniz makroyu kapatabilirsiniz.',
                    'Makroyu tuvaldeki bir kart düğmesine de atayabilirsiniz (**Araç ekle → Yapay zekâ**).',
                ],
                dene: '"Madde madde yap" adında, görevi "Bu metni kısa maddeler hâlinde yeniden yaz" olan bir makro oluşturun.',
                hatirla: 'AI makrosu, sık verdiğiniz bir yapay zekâ talimatını tek dokunuşa indirir.',
                ayarId: 'macros',
                ayarEtiketi: 'AI makrolarını aç',
                tamamlanma: 'Yeni bir AI makrosu eklediğinizde kendiliğinden tamamlanır.',
            },
        ],
    },
    {
        id: 'ileri',
        ad: 'İleri',
        ikon: 'MonitorSmartphone',
        ozet: 'Telefonunuzu bilgisayarın klavyesi, faresi ve panosu gibi kullanın. Sonunda telefonda yazdığınızı bilgisayara yazdırabilir, panoya gönderebilir ve fareyi telefondan yönetebilirsiniz.',
        dersler: [
            {
                id: 'i-ac',
                ikon: 'MonitorSmartphone',
                title: 'Bilgisayar araçlarını açın',
                description: 'Editörde Bilgisayar sekmesi.',
                hedef: 'Editörde bilgisayar araçlarını görünür yaparsınız.',
                sure: 1,
                adimlar: [
                    '**Ayarlar → Bilgisayar araçları** bölümünde **Bilgisayar araçlarını editörde göster** anahtarını açın.',
                    'Aynı ekranda hangi araçların (Fare, Dikte, Bilgisayara Yaz, Panoya Gönder…) görüneceğini tek tek seçebilirsiniz.',
                    'Editörde **Bilgisayar** sekmesine dokunun; araçlar ikinci satırda görünür.',
                ],
                hatirla: 'Bilgisayar araçları varsayılan olarak gizlidir; Ayarlar → Bilgisayar araçları\'ndan açılır.',
                ayarId: 'pcAraclari',
                ayarEtiketi: 'Bilgisayar araçlarını aç',
                tamamlanma: 'Bilgisayar araçlarını açtığınızda kendiliğinden tamamlanır.',
            },
            {
                id: 'i-yol',
                ikon: 'Link2',
                title: 'Size uygun bağlantıyı seçin',
                description: 'Bilgisayar veya kart için yedi bağlantı yolu.',
                hedef: 'Durumunuza en uygun bağlantı yolunu seçersiniz.',
                sure: 4,
                gorsel: 'yollar',
                adimlar: [
                    '**Ayarlar → Bilgisayar bağlantısı**\'nda bir yol seçin ve ekrandaki numaralı adımları sırayla izleyin.',
                    '**Bilgisayar · Bluetooth:** bilgisayara **program kurmadan** çalışır. Telefon bilgisayara Bluetooth klavye ve fare olarak bağlanır.',
                    '**Bilgisayar · USB:** telefon bilgisayara **USB kablosuyla** bağlanır; Wi‑Fi, internet ve güvenlik duvarı izni gerekmez. Telefonda **USB hata ayıklama** açık olmalı ve bilgisayarda ortak Windows yardımcısı bir kez kurulmalıdır.',
                    '**Bilgisayar · Wi‑Fi:** bilgisayarda **PC yardımcısı** açık olmalıdır; ilk kez bağlanırken penceredeki **6 haneli kodu** bir kez yazarsınız. Telefon ve bilgisayar aynı Wi‑Fi\'da olmalı.',
                    '**Tailscale:** telefon ve bilgisayar farklı ağlarda olabilir. İkisinde de aynı hesaba bağlı Tailscale ve bilgisayarda PC yardımcısı açık olmalıdır.',
                    '**Kart · Wi‑Fi**, **Kart · AP** ve **Kart · Bluetooth:** bilgisayara USB ile takılan Not Bahçesi kartı (ESP32‑S3) içindir; kart bilgisayara klavye ve fare gibi yazar. Kart · AP\'de telefon kartın kendi **can bellek s3** ağına bağlanır, modem gerekmez. Kartınız yoksa bu yolları atlayın.',
                    'Yolu seçtikten sonra **Deneyin** adımındaki düğmeyle bağlantıyı sınayın.',
                ],
                ipucu: 'Emin değilseniz **Bilgisayar · Bluetooth** ile başlayın: bilgisayara hiçbir şey kurmanız gerekmez. Bluetooth ile ilk kez bağlanırken bilgisayar telefonu klavye olarak tanımazsa telefonu bilgisayardan kaldırıp "Cihaz ekle" ile yeniden ekleyin.',
                hatirla: 'Program kurmadan Bluetooth; kabloyla USB; aynı ağda Wi‑Fi; uzaktan Tailscale; donanım kartınız varsa kart yolları.',
                soru: {
                    soru: 'Bilgisayara hiçbir program kurmadan yazmak istiyorsunuz. Hangi yol?',
                    secenekler: ['Bilgisayar · Wi‑Fi', 'Bilgisayar · Bluetooth', 'Tailscale'],
                    dogru: 1,
                    aciklama: 'Bilgisayar · Bluetooth\'ta telefon bilgisayara klavye ve fare olarak bağlanır; program gerekmez.',
                },
                ayarId: 'remote',
                ayarEtiketi: 'Bilgisayar bağlantısını aç',
                tamamlanma: 'Seçtiğiniz bağlantı yolu çalıştığında kendiliğinden tamamlanır.',
            },
            {
                id: 'i-tailscale',
                ikon: 'Link2',
                title: 'Tailscale ile uzaktan bağlanın',
                description: 'Farklı ağdaki bilgisayarınıza ulaşın.',
                hedef: 'Başka bir ağdaki bilgisayarınıza Tailscale üzerinden bağlanırsınız.',
                sure: 5,
                adimlar: [
                    'Telefon ve bilgisayarda Tailscale kurup aynı hesapla oturum açın; iki cihaz da çevrimiçi olmalıdır.',
                    'Bilgisayarda **PC yardımcısını** açın. Yardımcı paketindeki **pc_tailscale_izni.cmd** dosyasını bir kez çalıştırıp güvenlik duvarı iznini verin.',
                    '**Ayarlar → Bilgisayar bağlantısı → Tailscale** yolunu seçin. Bilgisayarın **100.x.x.x** adresini veya Tailscale adını girip yardımcıyı bulun.',
                    'İlk eşleştirmede yardımcının **6 haneli kodunu** girin. Bağlantıyı ve PC panosunu sınayın; sonraki bağlantılarda eşleştirme hatırlanır.',
                ],
                ipucu: 'Uzaktan kullanımda iki cihazın da interneti ve Tailscale bağlantısı açık, PC yardımcısı çalışır durumda olmalıdır.',
                hatirla: 'Tailscale iki cihazı aynı hesapla uzaktan buluşturur; bilgisayarı 100.x adresiyle bulup kodu bir kez girersiniz.',
                ayarId: 'remote',
                ayarEtiketi: 'Bağlantı ayarlarını aç',
                tamamlanma: 'Tailscale bağlantısı çalıştığında kendiliğinden tamamlanır.',
            },
            {
                id: 'i-usb',
                ikon: 'Link2',
                title: 'USB kablosuyla bağlanın',
                description: 'Ağ olmadan, kabloyla bilgisayara.',
                hedef: 'Telefonu kabloyla bilgisayara bağlar ve ilk onayı verirsiniz.',
                sure: 5,
                adimlar: [
                    'Telefonda **Geliştirici seçenekleri → USB hata ayıklama**\'yı açın. Telefonu bilgisayara USB kablosuyla takın; telefonda çıkan izin sorusunu **yalnız güvendiğiniz bilgisayar** için onaylayın.',
                    'İlk kurulumda **Ayarlar → Bilgisayar bağlantısı → Bilgisayar · USB** ekranındaki bağlantıdan ortak Windows yardımcısını (2.2.0 veya üzeri) indirin. ZIP\'i çıkarıp **Yonetici-Gerektirmeyen → 10-Telefon-USB-Otomatik-Kur** dosyasını bir kez açın. Bundan sonra USB köprüsü arka planda kendiliğinden çalışır.',
                    'Aynı ekranda **Bağlantı isteği gönder**\'e dokunun. Bilgisayarda açılan pencerede **60 saniye içinde** **İzin ver**\'i seçin.',
                    '**USB bağlantısını dene** ile sınayın. USB eşleşmesi Wi‑Fi eşleşmesinden ayrı saklanır; yollar arasında geçince ikisi de korunur.',
                ],
                ipucu: 'Kablo çıkarsa bu yol durur; uygulama kendiliğinden Wi‑Fi\'ya geçmez. Bilgisayar · USB yolu karta değil, doğrudan bilgisayara bağlanır.',
                hatirla: 'USB hata ayıklama + bir kez kurulan Windows yardımcısı + bilgisayarda İzin ver: kablo takılı kaldıkça bağlantı hazırdır.',
                soru: {
                    soru: 'USB ile bağlanırken bilgisayardaki onay penceresini kaçırdınız. Ne yaparsınız?',
                    secenekler: ['Bağlantı isteği gönder\'e yeniden dokunurum', 'Wi‑Fi yoluna geçerim', 'Uygulamayı yeniden kurarım'],
                    dogru: 0,
                    aciklama: 'Onay penceresi 60 saniye açık kalır. Kaçırırsanız isteği yeniden göndermeniz yeterlidir.',
                },
                ayarId: 'remote',
                ayarEtiketi: 'Bağlantı ayarlarını aç',
                tamamlanma: 'USB bağlantısı çalıştığında kendiliğinden tamamlanır.',
            },
            {
                id: 'i-otomatik',
                ikon: 'Link2',
                title: 'Otomatik bağlantı ve bağlantı sınaması',
                description: 'Kurulu bağlantınız açılışta yeniden denensin.',
                hedef: 'Bağlantının açılışta kendiliğinden kurulmasını sağlar ve kurulu yolları sınarsınız.',
                sure: 2,
                adimlar: [
                    'Android uygulamasında **Ayarlar → Bilgisayar bağlantısı → Açılışta otomatik bağlan** anahtarı başlangıçta açıktır.',
                    'Uygulama açıldığında veya yeniden ön plana geldiğinde seçili ve kurulmuş bağlantı yolu denenir. Hedef cihazın erişilebilir ve gerekli izinlerin verilmiş olması gerekir.',
                    'Kart Bluetooth yolunda önce kayıtlı kart denenir; bulunamazsa **can00**, **KablosuzBellek**, **bellek** veya **USB HID** adıyla tanınan kartlar taranır.',
                    '**Bağlantı türlerini sına → Sına** ile kurduğunuz yolları gerçek bağlantı istekleriyle denetleyin. Sonuçlar ayrı gösterilir; işlem yaklaşık bir dakika sürebilir.',
                ],
                hatirla: 'Açılışta otomatik bağlan seçili yolu kendisi kurar; Sına ile bütün kurulu yolları bir arada denetlersiniz.',
                ayarId: 'remote',
                ayarEtiketi: 'Bağlantı ayarlarını aç',
            },
            {
                id: 'i-gosterge',
                ikon: 'Link2',
                title: 'Bağlantı simgesini okuyun',
                description: 'Kurulum ve erişim durumunu ayırt edin.',
                hedef: 'Bağlantı simgesine bakarak sorunun kurulumda mı erişimde mi olduğunu anlarsınız.',
                sure: 1,
                adimlar: [
                    'Editörün Bilgisayar satırının başındaki zincir simgesi bağlantının **canlı** durumunu gösterir.',
                    '**Bağlı:** hedef yanıt veriyor. **Bağlantı yok:** kurulu hedefe şu an ulaşılamıyor. **Kurulmadı:** kurulum eksik. **Denetleniyor** ve **Bekliyor** işlem durumunu gösterir.',
                    'Simgeye dokunmak doğrudan **Bilgisayar bağlantısı** ayarlarını açar.',
                ],
                hatirla: '"Kurulmadı" kurulumu tamamlayın demektir; "Bağlantı yok" ise kurulum var ama hedefe şu an ulaşılamıyor demektir.',
                soru: {
                    soru: 'Simge "Bağlantı yok" diyor. Bu ne anlama gelir?',
                    secenekler: ['Hiç kurulum yapılmamış', 'Kurulum var ama hedefe şu an ulaşılamıyor', 'Bağlantı sorunsuz'],
                    dogru: 1,
                    aciklama: '"Bağlantı yok" kurulu hedefe şu an erişilemediğini gösterir: bilgisayar kapalı, ağ farklı ya da yardımcı kapalı olabilir. Kurulum eksikse "Kurulmadı" yazar.',
                },
            },
            {
                id: 'i-yaz',
                ikon: 'Keyboard',
                title: 'Bilgisayara yazdırın ve panoya gönderin',
                description: 'Telefonda yaz, bilgisayarda kullan.',
                hedef: 'Telefonda yazdığınız metni bilgisayara yazdırır, panoya ve dosya olarak gönderirsiniz.',
                sure: 4,
                adimlar: [
                    'Bilgisayarda yazının gideceği yere (ör. Word) bir kez tıklayın.',
                    'Telefonda notu yazın ve **Bilgisayara yaz** (gönder) düğmesine dokunun: metin, klavyeden yazılmış gibi bilgisayara geçer.',
                    '**PC panosu** düğmesi metni bilgisayarın panosuna koyar; bilgisayarda **Ctrl+V** ile istediğiniz yere yapıştırırsınız.',
                    'Gönderim bitince ekranın üstünde kısa bir **"gönderildi ✓"** bildirimi çıkar ve düğme birkaç saniye yeşil tik gösterir. Hata olursa bildirim nedenini yazar.',
                    'Editörün sol altındaki dört simge: **mini galeri**, **kamera**, **telefon galerisinden aktarım** ve **Dosya ekle**. Dosya başına en çok **100 MB** eklenir. **Bilgisayara** dosyaları Belgeler › Not Bahçesi klasörüne, görselleri Resimler › Not Bahçesi klasörüne kaydeder; **PC panosuna** gönderilen dosyaları bilgisayarda **Ctrl+V** ile yapıştırırsınız. Aktarım başına en çok 50 öğe ve toplam 300 MB.',
                    'Mini galeri **Google Drive ile eşitlenir**: aynı Google hesabıyla girdiğiniz telefonda, bilgisayarda ve web sitesinde not açılınca galerisi de gelir. Galerinin üstünde **Eşitle** düğmesi görürseniz bir kez dokunup Drive izni verin.',
                ],
                ipucu: 'Pano için PC yardımcısı açık olmalıdır. Kart yollarında pano kartın USB kablosundan yardımcıya iletilir; Bilgisayar · Bluetooth yolunda PC panosu bölümünden yardımcıyı bir kez tanıtın. Yardımcıyı yeniden kurduysanız telefon "tanımadı" der: eşleştirme koduyla bir kez yeniden bağlanın.',
                hatirla: 'Bilgisayara yaz klavye gibi yazar; PC panosu metni ya da dosyayı panoya koyar, Ctrl+V ile yapıştırırsınız.',
                soru: {
                    soru: 'Metni bilgisayarda birkaç farklı yere yapıştırmak istiyorsunuz. Hangisi daha uygun?',
                    secenekler: ['Bilgisayara yaz', 'PC panosu', 'Dışa aktar'],
                    dogru: 1,
                    aciklama: 'PC panosu metni bilgisayarın panosuna koyar; istediğiniz kadar yere Ctrl+V ile yapıştırırsınız.',
                },
                tamamlanma: 'Bilgisayara ilk metninizi gönderdiğinizde kendiliğinden tamamlanır.',
            },
            {
                id: 'i-fare',
                ikon: 'MousePointer2',
                title: 'Fare ve dikte',
                description: 'Telefonu dokunmatik yüzey gibi kullanın.',
                hedef: 'Telefonu fare olarak kullanır ve konuşarak yazarsınız.',
                sure: 4,
                adimlar: [
                    '**Fare** aracında yüzeyde parmağınızı kaydırınca imleç hareket eder; dokunmak sol tıktır. Alttaki düğmelerle sağ tık ve kaydırma yapılır.',
                    '**Dikte** konuşmanızı yazıya çevirir. Sonucun **nota**, **bilgisayara** ya da **ikisine birden** yazılacağını **Ayarlar → Bilgisayar araçları** listesinde Dikte satırındaki **dişli** simgesinden seçersiniz.',
                    '**Bilgisayara Yaz** aracının dişlisinden biçimi seçersiniz: **Düğmeyle** (notun tamamı bir kerede) ya da **Yazdıkça canlı** (notta yazdığınız her şey anında bilgisayara da yazılır).',
                    '**Köprü Dikte** konuşurken yazar: sözünüz cümle sonu beklenmeden görünür. Ses tanıma motorunu **Bilgisayar bağlantısı → Dikte motoru** bölümünden seçersiniz (telefon, ya da kendi anahtarınızla OpenAI, Gemini, Groq, Deepgram veya özel bir API).',
                    'Aynı sayfadaki **Dikte tuşları** ile kulaklığın oynat/duraklat, sonraki, önceki komutlarına ve telefonun ses tuşlarına dikte başlat/durdur atayabilirsiniz. Tuşlar yalnız Android uygulamasında ve editör açıkken çalışır.',
                ],
                hatirla: 'Fare yüzeyi imleci yönetir; Dikte konuşmanızı nota ya da bilgisayara yazar, Köprü Dikte bunu canlı yapar.',
            },
            {
                id: 'i-yardimci',
                ikon: 'Download',
                title: 'PC yardımcısı ne zaman gerekir?',
                description: 'Bilgisayar Wi‑Fi, Tailscale, USB ve pano işlemleri.',
                hedef: 'Hangi durumda bilgisayara yardımcı program gerektiğini bilirsiniz.',
                sure: 2,
                adimlar: [
                    '**Bilgisayar · Wi‑Fi** ve **Tailscale** yollarında yazma, fare ve pano için gerekir.',
                    '**Bilgisayar · USB** yolunda PC yardımcısının penceresini açmanız gerekmez; bir kez kurulan ortak Windows yardımcısının USB köprüsü arka planda çalışır.',
                    'Diğer yollarda yazma ve fare programsız çalışır; yardımcı yalnız **panoya göndermek** için gerekir.',
                    'Yardımcıyı **yönetici olarak çalıştırmanız gerekmez**. Windows yalnız ilk seferde, Wi‑Fi için güvenlik duvarı izni sorabilir.',
                    'Bilgisayarı her açtığınızda yardımcıyı yeniden başlatın; pencere kapanınca durur. Eşleşme hatırlanır, kod bir daha sorulmaz.',
                    'Kart kullanıyorsanız kartı USB kablosuyla **yazının gideceği bilgisayara** bağlayın. Telefonun USB kablosu karta bağlantı kurmaz; karta Kart · Wi‑Fi, Kart · AP veya Kart · Bluetooth ile bağlanın.',
                ],
                hatirla: 'Wi‑Fi ve Tailscale yollarında yardımcı şarttır; diğer yollarda yalnız pano için gerekir.',
            },
        ],
    },
    {
        id: 'uzman',
        ad: 'Uzman',
        ikon: 'Award',
        ozet: 'Kendi kontrol panelinizi kurun: makrolar, sıralı işler, profiller ve bölmeli ekranlar. Sonunda tekrarlayan işleri tek dokunuşa indirir, telefonu size özel bir kumanda masasına çevirirsiniz.',
        dersler: [
            {
                id: 'u-makro',
                ikon: 'Wand2',
                title: 'Kişisel kısayollar (makrolar)',
                description: 'Konum, klavye kısayolu, hazır metin.',
                hedef: 'Bilgisayarda tekrarladığınız bir işi tek dokunuşluk makroya çevirirsiniz.',
                sure: 3,
                adimlar: [
                    '**Ayarlar → Kısayollar ve ekranlar → Kişisel kısayollar** bölümünde **Makro Ekle**\'ye dokunun.',
                    '**Konum:** bilgisayar ekranında seçtiğiniz noktaya tek ya da çift tıklar. **Kısayol:** CTRL+S gibi bir tuş birleşimi gönderir; **Klavyeden seç** ile sanal klavyeden de seçebilirsiniz. **Metin:** hazır bir yazıyı yazar.',
                    'Editörde **Kısayollar** (sihirli değnek) aracına dokunun: makrolar bir pano olarak açılır, her biri tek dokunuşla çalışır.',
                ],
                dene: 'CTRL+S gönderen "Kaydet" adında bir kısayol makrosu oluşturun.',
                ipucu: '**Bilgisayar · Bluetooth** yolunda **Konum** makroları için bilgisayarda PC yardımcısı açık ve bir kez tanıtılmış olmalıdır. Kısayol ve metin makroları programsız çalışır.',
                hatirla: 'Makro üç türdür: ekranda bir noktaya tıklamak, tuş birleşimi göndermek, hazır metin yazmak.',
                ayarId: 'kisayollar',
                ayarEtiketi: 'Kısayolları aç',
                tamamlanma: 'Yeni bir makro eklediğinizde kendiliğinden tamamlanır.',
            },
            {
                id: 'u-sirali',
                ikon: 'ListOrdered',
                title: 'Sıralı makro ve bekleme',
                description: 'Birçok adımı tek düğmeye bağlayın.',
                hedef: 'Birden çok adımı beklemelerle birlikte tek düğmede birleştirirsiniz.',
                sure: 3,
                adimlar: [
                    'Makro türü olarak **Sıralı**\'yı seçin. Adım olarak metin, kısayol, tıklama, başka bir kayıtlı makro ya da **bekleme** ekleyin.',
                    'Adımları oklarla sıralayın. İki adımın arasındaki **+ Bekleme** düğmesi tam oraya süre koyar (0,05 sn – 10 dk).',
                    'Bir adım hata verirse makro durur ve hangi adımın sorunlu olduğunu söyler.',
                ],
                hatirla: 'Sıralı makro adımları sırayla çalıştırır; programların yetişmesi için araya bekleme koyun.',
            },
            {
                id: 'u-calisma',
                ikon: 'ListOrdered',
                title: 'Düğmeye basınca: dört çalışma biçimi',
                description: 'Normal, Sayılı, Anahtar, Basılı tut.',
                hedef: 'Bir makronun kaç kez ve nasıl tekrar edeceğini seçersiniz.',
                sure: 2,
                adimlar: [
                    'Sıralı makronun altındaki **Düğmeye basınca** bölümünden seçin.',
                    '**Normal:** bir kez çalışır, bilgisayar tuşu gibi. **Sayılı:** belirlediğiniz sayı kadar (1–1000) art arda çalışır.',
                    '**Anahtar:** ilk dokunuş açar, siz yeniden dokunup kapatana kadar baştan tekrar eder. **Basılı tut:** parmağınız düğmedeyken tekrar eder, bırakınca durur.',
                    'Tekrarlanan biçimlerde **Turlar arası** bekleme verebilirsiniz. Çalışan makronun düğmesi yeşil çerçeveyle vurgulanır, köşesinde tur sayısı görünür.',
                ],
                ipucu: 'Uzun bir Sayılı ya da Anahtar makroyu durdurmak için düğmesine yeniden dokunmanız yeterlidir.',
                hatirla: 'Normal bir kez, Sayılı belli sayıda, Anahtar siz durdurana dek, Basılı tut parmağınız düğmedeyken çalışır.',
                soru: {
                    soru: 'Makronun siz yeniden dokunana kadar tekrar etmesini istiyorsunuz. Hangi biçim?',
                    secenekler: ['Sayılı', 'Anahtar', 'Normal'],
                    dogru: 1,
                    aciklama: 'Anahtar biçiminde ilk dokunuş başlatır, makro siz yeniden dokunup kapatana kadar tekrar eder.',
                },
            },
            {
                id: 'u-profil',
                ikon: 'Layers',
                title: 'Profiller ve kısayol düğmeleri',
                description: 'Makroları işe göre gruplayın.',
                hedef: 'Makrolarınızı işe göre profillere ayırır ve aralarında tek dokunuşla geçersiniz.',
                sure: 2,
                adimlar: [
                    '**Profiller ve kısayol düğmeleri** bölümünde "Ofis", "Oyun" gibi profiller oluşturup makroları içlerine sıralayın.',
                    'Editörde **Kısayollar** aracına dokunduğunuzda ikinci satırda **Tümü** ve profil sekmeleri çıkar; sekmeler arasında tek dokunuşla geçersiniz.',
                    'Sık kullandığınız profil için ayrıca bir **kısayol düğmesi** ekleyebilirsiniz; düğme Bilgisayar satırında durur.',
                ],
                hatirla: 'Profil, makroları işe göre gruplar; sık kullandığınız profile Bilgisayar satırında bir düğme verin.',
            },
            {
                id: 'u-ekran',
                ikon: 'LayoutDashboard',
                title: 'Kendi ekranınızı tasarlayın',
                description: 'Bölmeli kumanda masası.',
                hedef: 'Fare, klavye ve kısayolları tek ekranda birleştiren kendi kumanda masanızı kurarsınız.',
                sure: 4,
                adimlar: [
                    '**Ekran düzenleri** bölümünde yeni bir düzen açın. Ekranı yan yana **sütunlara**, her sütunu alt alta **bölmelere** ayırın.',
                    'Her bölmeye bir içerik verin: **Fare**, **Yön tuşları**, **Metin yazma**, **Canlı klavye**, **Telefon** ya da **Bilgisayar klavyesi**, **Kısayollar** (bir profile bağlanabilir) veya **Köprü Dikte**.',
                    'Bölmeler arası boşluğu ve iç boşluğu sayı olarak girin; **kenarsız** seçeneği bölmeleri tek yüzey gibi gösterir.',
                    'Editörde **Ekran** aracına dokunun; ikinci satırdan düzenler arasında geçiş yaparsınız.',
                ],
                dene: 'Üstte Fare, altta Kısayollar olan iki bölmeli bir düzen kurun.',
                hatirla: 'Ekran düzeni sütun ve bölmelerden oluşur; her bölmeye bir araç verip editördeki Ekran aracından açarsınız.',
                ayarId: 'kisayollar',
                ayarEtiketi: 'Ekran düzenlerini aç',
                tamamlanma: 'Yeni bir ekran düzeni eklediğinizde kendiliğinden tamamlanır.',
            },
            {
                id: 'u-yerel-ai',
                ikon: 'Cpu',
                title: 'Yerel yapay zekâ (internetsiz)',
                description: 'Model telefonda çalışır.',
                hedef: 'Telefonda internetsiz çalışan bir yapay zekâ modeli kurarsınız.',
                sure: 5,
                adimlar: [
                    '**Ayarlar → Yapay zekâ → Yerel** sekmesini açın.',
                    'Hugging Face\'ten LiteRT‑LM uyumlu **.litertlm** ya da MediaPipe uyumlu **.task / .bin** model dosyasını indirin.',
                    '**Dosya seç → Etkinleştir** adımlarını izleyin, **Modeli dene** ile yanıtı kontrol edin.',
                ],
                ipucu: 'Yerel modeller büyük dosyalardır ve telefonun belleğini kullanır; güçlü telefonlarda daha hızlı çalışır.',
                hatirla: 'Yerel model metninizi telefondan hiç çıkarmaz; karşılığında telefonun gücünü ve belleğini kullanır.',
                ayarId: 'models',
                ayarEtiketi: 'Yapay zekâ ayarlarını aç',
            },
            {
                id: 'u-sorun',
                ikon: 'HelpCircle',
                title: 'Sorun giderme',
                description: 'Bağlantı kırmızıysa sırayla deneyin.',
                hedef: 'Bağlantı sorunlarını yol yol, sırayla giderirsiniz.',
                sure: 4,
                adimlar: [
                    '**Bilgisayar · Wi‑Fi:** telefon ve bilgisayar aynı ağda mı? Bilgisayarın ağ profili **Özel** mi? PC yardımcısının penceresi açık mı?',
                    '**Tailscale:** iki cihaz aynı hesaba bağlı ve çevrimiçi mi? Bilgisayarın 100.x adresi doğru mu? PC yardımcısı açık ve güvenlik duvarı izni verilmiş mi?',
                    '**Bilgisayar · USB:** kablo takılı ve veri aktarabilen bir kablo mu? Telefonda USB hata ayıklama açık ve bu bilgisayarın izni onaylanmış mı? Ortak Windows yardımcısının USB kurulumu yapılmış mı? Onay penceresini kaçırdıysanız **Bağlantı isteği gönder**\'e yeniden dokunun.',
                    '**Kart · Wi‑Fi:** telefon ve kart aynı yerel ağda mı? **Kart · AP:** telefon can bellek s3 ağına bağlı mı, adres http://192.168.4.1 mi? Telefon internet olmayan AP ağından ayrılıyorsa o ağda kalmayı seçin.',
                    '**Bluetooth yollarında:** iki cihazda da Bluetooth açık mı? Bilgisayar telefonu klavye olarak tanımıyorsa telefonu bilgisayardan kaldırıp yeniden ekleyin. Telefonda başka bir "Bluetooth klavye/fare" uygulaması açıksa kapatın.',
                    'Android\'de istenen **Yakındaki cihazlar** izinlerini verin. Kart bilgisayara yazacaksa kartın USB kablosunu hedef bilgisayara bağlayın; telefonun USB kablosu kartın kablosunun yerini almaz.',
                    'Otomatik bağlantı için **Açılışta otomatik bağlan** açık mı ve doğru yol seçili mi? **Bağlantı türlerini sına → Sına** ile kurulu yolların sonuçlarını görün.',
                ],
                hatirla: 'Önce doğru yol seçili mi, sonra iki cihaz aynı ağda/hesapta mı, en son yardımcı ve izinler açık mı diye bakın.',
                ayarId: 'remote',
                ayarEtiketi: 'Bilgisayar bağlantısını aç',
            },
        ],
    },
];

/** Amaca göre öğrenme yolları: yalnız ihtiyaç duyulan dersler, doğru sırada. */
export const YOLLAR: KilavuzYolu[] = [
    {
        id: 'not',
        baslik: 'Hızlı başlangıç',
        aciklama: 'Yalnız not tutmak istiyorum.',
        ikon: 'Sprout',
        dersler: ['b-fikir', 'b-kavram', 'b-giris', 'b-bahce', 'b-iki-ekran', 'b-liste', 'b-tuval', 'b-not'],
    },
    {
        id: 'cihazlar',
        baslik: 'Her cihazda aynı notlar',
        aciklama: 'Telefon, bilgisayar ve web sitesi.',
        ikon: 'Cloud',
        dersler: ['b-giris', 'b-cihazlar', 'o-yedek', 'o-dosya'],
    },
    {
        id: 'duzen',
        baslik: 'Düzenli tutmak',
        aciklama: 'Büyük konuları toparlamak istiyorum.',
        ikon: 'ListTree',
        dersler: ['b-kavram', 't-liste', 't-tuval', 't-budama', 't-kart-gorunum', 't-editor'],
    },
    {
        id: 'ai',
        baslik: 'Yapay zekâ',
        aciklama: 'Özetlet, düzelt, çevir.',
        ikon: 'Sparkles',
        dersler: ['o-ai', 'o-ai-makro', 'u-yerel-ai'],
    },
    {
        id: 'pc',
        baslik: 'Bilgisayara yazmak',
        aciklama: 'Telefon klavye, fare ve pano olsun.',
        ikon: 'MonitorSmartphone',
        dersler: ['i-ac', 'i-yol', 'i-gosterge', 'i-yaz', 'i-fare', 'i-yardimci', 'u-sorun'],
    },
];

/** Kılavuzdaki terimlerin kısa tanımları. */
export const SOZLUK: Array<{ terim: string; tanim: string }> = [
    { terim: 'Bahçe', tanim: 'Bir konu ya da proje. İçinde ağaçlar durur; ana ekranda kart olarak görünür.' },
    { terim: 'Ağaç', tanim: 'Bahçedeki en üst düzey not. Altına dallar ve yapraklar eklenir.' },
    { terim: 'Dal', tanim: 'Altında başka notlar olan not.' },
    { terim: 'Yaprak', tanim: 'Altında not olmayan not. Altına not eklenince dala dönüşür.' },
    { terim: 'Liste', tanim: 'Notları alt alta, iç içe satırlar olarak gösteren ekran. Okumak ve düzenlemek için.' },
    { terim: 'Tuval', tanim: 'Notları büyük bir yüzeyde kartlar ve bağlar olarak gösteren ekran. Büyük resmi görmek için.' },
    { terim: 'Kart (tuvalde)', tanim: 'Tuvaldeki tek bir not. Kısa dokununca çevresinde düğmeler açılır.' },
    { terim: 'Kart menüsü', tanim: 'Karta dokununca açılan düğmeler (Kopyala, Düzenle, Buda, Yanına, Altına…). İşlevleri değiştirilebilir.' },
    { terim: 'Editör', tanim: 'Notun başlığını ve içeriğini yazdığınız ekran.' },
    { terim: 'Budama', tanim: 'Notu silmeden "bitti" olarak işaretlemek. Budananlar gizlenebilir, geri alınabilir.' },
    { terim: 'Yerel mod', tanim: 'Hesapsız kullanım. Notlar yalnız o cihazda saklanır, başka cihazla eşitlenmez.' },
    { terim: 'Senkron (eşitleme)', tanim: 'Google ile giriş yaptığınız telefon, bilgisayar ve web sitesindeki notların Drive üzerinden birleştirilmesi.' },
    { terim: 'Web sitesi', tanim: 'Not Bahçesi\'nin tarayıcıda çalışan sürümü (mindgarden-neon.vercel.app). Bilgisayarda kurulum gerektirmez.' },
    { terim: 'Deneme ağacı', tanim: 'Araçları denemek için geçici not; bahçelere ve yedeğe girmez.' },
    { terim: 'Yerel araçlar', tanim: 'Telefonda, internetsiz ve yapay zekâsız çalışan metin araçları.' },
    { terim: 'AI makrosu', tanim: 'Yapay zekâya tek dokunuşla verilen hazır talimat (ör. Özetle).' },
    { terim: 'Makro (kısayol)', tanim: 'Bilgisayarda bir noktaya tıklayan, tuş birleşimi gönderen ya da metin yazan hazır işlem.' },
    { terim: 'PC yardımcısı', tanim: 'Bilgisayarda çalışan küçük Not Bahçesi programı; Wi‑Fi, Tailscale ve pano işlemleri için gerekir.' },
    { terim: 'Not Bahçesi kartı', tanim: 'Bilgisayara USB ile takılan isteğe bağlı donanım (ESP32‑S3). Tuvaldeki kartla karıştırmayın.' },
    { terim: 'Tailscale', tanim: 'Farklı ağlardaki cihazları aynı hesapla buluşturan ayrı bir uygulama; uzaktan bağlantı için.' },
    { terim: 'Dikte / Köprü Dikte', tanim: 'Konuşmayı yazıya çevirme. Köprü Dikte sözünüzü canlı olarak bilgisayara yazar.' },
];

export const SSS: Array<{ soru: string; cevap: string }> = [
    {
        soru: 'Mini galerim başka cihazda neden görünmüyor?',
        cevap: "Galeri, Google Drive'ınızdaki gizli uygulama alanı üzerinden eşitlenir. Galerinin üstünde **Eşitle** düğmesi varsa o cihazda henüz Drive izni verilmemiştir: bir kez dokunun. Her iki cihazda da aynı Google hesabıyla girdiğinizden ve **Ayarlar → Yedekleme → Mini galeri** anahtarının açık olduğundan emin olun. Öğeler not açıldığında gelir.",
    },
    {
        soru: 'Notlarım kaybolur mu?',
        cevap: "Google ile giriş yaptıysanız hayır: notlarınız Drive'ınızda yedeklenir ve aynı hesapla girdiğiniz her cihazda geri gelir. Yerel modda (giriş yapmadan) notlar yalnız o cihazdadır; uygulamayı kaldırırsanız silinir.",
    },
    {
        soru: 'Liste mi Tuval mi kullanmalıyım?',
        cevap: 'İkisi aynı notları gösterir; istediğiniz an geçebilirsiniz. Okumak, aramak ve hızlı düzenlemek için Liste; büyük resmi görmek ve fikirleri dallandırmak için Tuval daha rahattır.',
    },
    {
        soru: 'İnternet olmadan çalışır mı?',
        cevap: 'Evet. Notlar ve yerel araçlar internetsiz çalışır; eşitleme internet geldikten sonra tamamlanır. Drive senkronu, bulut yapay zekâ ve uzaktan Tailscale bağlantısı internet ister. Yerel Wi‑Fi, Bilgisayar · USB, Kart · AP ve Bluetooth yolları internet gerektirmez.',
    },
    {
        soru: 'Telefon ve bilgisayarda aynı notları görebilir miyim?',
        cevap: 'Evet. Telefonda uygulamada, bilgisayarda tarayıcıdan **mindgarden-neon.vercel.app** adresinde aynı Google hesabıyla giriş yapın; otomatik senkron giriş yapınca kendiliğinden açılır. Notlar birleştirilir; çakışmada en son değiştirilen sürüm geçerli olur.',
    },
    {
        soru: 'Yapay zekâ hata veriyor, ne yapmalıyım?',
        cevap: 'Hata iletisi sağlayıcının yanıtını gösterir. Sık sebepler: geçersiz API anahtarı, yanlış model adı, kota ya da bakiye yetersizliği.',
    },
    {
        soru: 'Bilgisayarıma program kurmam gerekiyor mu?',
        cevap: 'Bilgisayar · Bluetooth ve kart yollarında yazma ve fare için hayır. PC yardımcısı Bilgisayar · Wi‑Fi, Tailscale ve bilgisayar panosuna gönderme için gerekir; kurulum istemez, Windows\'un PowerShell\'iyle çalışır. Tailscale için güvenlik duvarı iznini ayrıca verin. Bilgisayar · USB yolu için ortak Windows yardımcısının USB kurulumunu bir kez çalıştırırsınız; yönetici izni gerekmez.',
    },
    {
        soru: 'Eşleştirme kodu ne işe yarar?',
        cevap: 'PC yardımcısının penceresindeki 6 haneli kod, Wi‑Fi veya Tailscale üzerinden ilk eşleştirme içindir. Eşleştirme hatırlanır. Bluetooth ile eşleşmiş bilgisayarda pano için kod gerekmez. Bilgisayar · USB yolunda kod yerine bilgisayarda açılan pencereden **İzin ver** seçilir.',
    },
    {
        soru: 'Başka bir bilgisayarda da kullanabilir miyim?',
        cevap: 'Evet. Bluetooth yolunda yeni bilgisayarı telefonla eşleştirip Bilgisayar bağlantısı ekranından seçin. Wi‑Fi yolunda o bilgisayarda PC yardımcısını açıp "Ağda bilgisayar ara" ile bulun ve penceredeki kodu yazın.',
    },
    {
        soru: 'Karta dokununca neden metin editörü açılmıyor?',
        cevap: 'Kısa dokunuş kart menüsünü açar ve açık tutar. Metni düzenlemek için Düzenle düğmesine dokunun. Bitişik ve Yumuşak modellerde ilk dokunuşta basılı tutup düğmeye kaydırarak bırakabilirsiniz.',
    },
    {
        soru: 'Ağacı sürüklemek için ne yapmalıyım?',
        cevap: 'Önce karta kısa dokunup bırakın. Menü açıkken karta yeniden basılı tutup sürükleyin. İlk dokunuşta basılı tutmak ise düğme seçimi içindir.',
    },
    {
        soru: 'Açık ve koyu kart modelleri nerede?',
        cevap: 'Tuval ve ağaçlar → Görünüm → Kart tasarımı, o anda etkin olan temanın modellerini gösterir. Açık ve koyu tema tercihleri ayrı hatırlanır; tema değişince o temanın tercihi kullanılır.',
    },
    {
        soru: 'Telefon USB ile bağlı; neden karta bağlanamıyorum?',
        cevap: 'Telefonun USB kablosu uygulamayla kart arasında bağlantı kurmaz. Telefonu Kart · Wi‑Fi, Kart · AP veya Kart · Bluetooth yoluyla karta bağlayın. Kartın USB kablosunu da yazının gideceği bilgisayara takın. Kartsız, telefonu kabloyla doğrudan bilgisayara bağlamak istiyorsanız Bilgisayar · USB yolunu seçin.',
    },
    {
        soru: 'Panoya gönderdim, nasıl anlarım?',
        cevap: 'Gönderim bitince editörün üstünde kısa bir "gönderildi ✓" bildirimi çıkar ve PC panosu düğmesi birkaç saniye yeşil tik gösterir. Bilgisayarda Ctrl+V ile yapıştırabilirsiniz.',
    },
];

/** Bütün dersler, seviye sırasıyla (devam et, arama ve yollar için). */
export const TUM_DERSLER: Array<KilavuzDersi & { seviyeId: string; seviyeAd: string }> = SEVIYELER.flatMap((s) =>
    s.dersler.map((d) => ({ ...d, seviyeId: s.id, seviyeAd: s.ad }))
);
