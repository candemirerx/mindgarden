/**
 * Kullanım kılavuzunun içeriği (seviyeler, dersler, sık sorulanlar).
 *
 * Tek kaynaktır: uygulama içindeki kılavuz (components/editor/UsageGuide) ve
 * Play paketi belgesi (scripts/kilavuz-belgesi.mjs → 02-kullanim-kilavuzu.md)
 * buradan üretilir; metni yalnız burada değiştirin. **kalın** yazım desteklenir.
 */
import type { SettingsSectionId } from '@/components/editor/SettingsHome';

/** Derslerde kullanılan simgelerin adları (lucide-react). */
export type KilavuzIkonu = 'Award' | 'Cloud' | 'Cpu' | 'Download' | 'HelpCircle' | 'Keyboard' | 'Layers' | 'LayoutDashboard' | 'Link2' | 'ListOrdered' | 'ListTree' | 'MonitorSmartphone' | 'MousePointer2' | 'Palette' | 'PenLine' | 'Settings' | 'Sparkles' | 'Sprout' | 'TreePine' | 'Wand2' | 'Wrench';

export interface KilavuzDersi {
    id: string;
    ikon: KilavuzIkonu;
    title: string;
    description: string;
    adimlar: string[];
    /** Adımların altında gösterilen kısa ipucu. */
    ipucu?: string;
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

export const SEVIYELER: KilavuzSeviyesi[] = [
    {
        id: 'baslangic',
        ad: 'Başlangıç',
        ikon: 'Sprout',
        ozet: 'Uygulamayı ilk kez açtıysanız buradan başlayın. Bu seviyenin sonunda ilk bahçenizi kurmuş, ilk notunuzu yazmış ve ayarları nerede bulacağınızı öğrenmiş olursunuz. Hesap, internet ya da bilgisayar gerekmez.',
        dersler: [
            {
                id: 'b-fikir',
                ikon: 'TreePine',
                title: 'Not Bahçesi nedir?',
                description: 'Bahçe, ağaç, dal ve yaprak ne demek?',
                adimlar: [
                    'Notlarınız **bahçelerde** durur. Her bahçe bir konu ya da proje gibidir: "Kitap", "Ders notları", "İş" gibi.',
                    'Bir bahçenin içinde **ağaçlar** vardır. Ağacın altına **dal** (alt başlık) ve **yaprak** (not) eklersiniz; böylece notlar iç içe, düzenli kalır.',
                    'Notlarınız önce **bu telefonda** saklanır. İnternet olmadan da çalışır.',
                ],
            },
            {
                id: 'b-bahce',
                ikon: 'Sprout',
                title: 'İlk bahçenizi kurun',
                description: 'Bir dakikada ilk bahçe.',
                adimlar: [
                    'Ana ekranda **Yeni Bahçe** düğmesine dokunun ve bahçeye bir ad verin.',
                    'Oluşturduğunuz bahçe listenin en başında görünür. Kartına dokunarak açın.',
                    'Karttaki üç nokta menüsünden bahçeyi **yeniden adlandırabilir** veya **silebilirsiniz**.',
                ],
            },
            {
                id: 'b-not',
                ikon: 'PenLine',
                title: 'İlk notunuzu yazın',
                description: 'Yazın, kaydetmeyi uygulamaya bırakın.',
                adimlar: [
                    'Bahçede **Yeni Ağaç** ile ilk notu açın ve başlığını yazın.',
                    'Notu rahatça yazmak için satırdaki **Editörde aç** simgesine dokunun; metin editörü açılır.',
                    'Editörün altında **Otomatik** işaretliyse yazdıklarınız kendiliğinden kaydedilir; ayrıca bir şey yapmanız gerekmez.',
                    'Sol üstteki geri okuyla bahçeye dönün.',
                ],
                ipucu: 'Otomatik kaydetme kapalıysa sağ üstteki disket simgesiyle kendiniz kaydedin.',
            },
            {
                id: 'b-ayarlar',
                ikon: 'Settings',
                title: 'Ayarları ve bu kılavuzu bulun',
                description: 'Kaybolursanız buraya dönün.',
                adimlar: [
                    'Ana ekranın sol üstündeki **ağaç simgesi** ayarları açar. Editörde aynı ekranı **dişli** simgesi açar.',
                    'Ayarlarda üstteki arama kutusuna "tema", "yedek", "bilgisayar" gibi bir kelime yazarak ilgili bölümü bulabilirsiniz.',
                    'Ayarlardaki değişiklikler **anında kaydedilir**; ayrıca Kaydet düğmesi yoktur.',
                    'Bu kılavuz her zaman **Ayarlar → Kullanım kılavuzu**\'ndadır. Kaldığınız yeri hatırlar.',
                ],
            },
        ],
    },
    {
        id: 'temel',
        ad: 'Temel',
        ikon: 'Layers',
        ozet: 'Notlarınızı düzenlemeyi öğrenin: dallandırma, renkler, arama, tuval görünümü ve dışa aktarma. Bu seviyenin sonunda büyük bir konuyu düzenli bir ağaç hâlinde tutabilirsiniz.',
        dersler: [
            {
                id: 't-liste',
                ikon: 'ListTree',
                title: 'Liste görünümünde ağaç kurmak',
                description: 'Dal ve yapraklarla iç içe notlar.',
                adimlar: [
                    'Notun yanındaki **üç nokta** (seçenekler) menüsünden **Yeni dal ekle** ya da **Yeni yaprak ekle** ile altına not ekleyin.',
                    'Aynı menüde **Yeniden adlandır**, **Başlığı kopyala** ve **Sil** bulunur. Satırdaki simgelerle içeriği kopyalayabilir ya da notu **editörde açabilirsiniz**.',
                    '**Dal rengi** ile konu başlıklarını görsel olarak ayırın; her dokunuşta renk değişir.',
                    'Üstteki **arama kutusu** ile aradığınız nota hızlıca ulaşın.',
                ],
            },
            {
                id: 't-tuval',
                ikon: 'Layers',
                title: 'Tuval: notları ağaç olarak görmek',
                description: 'Büyük resmi tek ekranda görün.',
                adimlar: [
                    'Bahçe kartından **Tuval** görünümünü açın.',
                    '**İki parmakla** yakınlaştırıp uzaklaştırın, **parmağınızla sürükleyerek** gezinin.',
                    'Bir düğüme dokununca eylem menüsü açılır: tam editör, içeriği kopyalama, ekleme ve budama. Kök notta **Ağaç Ekle** yanına yeni bir ağaç koyar, alttaki **+** ise ona dal ekler; dalda alttaki **+** yaprak, üstteki artı yanına yeni dal ekler.',
                    '**Ağaç yönetimi** düğmesiyle tüm ağaçları toplu açıp kapatabilirsiniz. Boş alana dokunmak menüleri kapatır.',
                ],
            },
            {
                id: 't-editor',
                ikon: 'PenLine',
                title: 'Editörü tanıyın',
                description: 'Kopyala, dışa aktar, tam ekran.',
                adimlar: [
                    'Üst şeritteki simgelerle içeriği **kopyalayabilir**, **PDF** ya da **Word** olarak indirebilirsiniz.',
                    'Sağ alttaki çapraz oklar editörü **tam ekran** yapar; dikkat dağıtan her şey gizlenir.',
                    'Alt bilgi satırında kayıt durumu ve **kelime sayısı** görünür.',
                ],
            },
            {
                id: 't-araclar',
                ikon: 'Wrench',
                title: 'Yerel araçlar (internetsiz)',
                description: 'Başlık üret, numaralandır, boşlukları sadeleştir.',
                adimlar: [
                    'Yerel araçlar yapay zekâ kullanmaz, telefonun içinde çalışır. Varsayılan olarak gizlidir.',
                    '**Ayarlar → Düzenleme araçları → Yerel araçlar** sekmesinde **Araçlar bölümünü editörde göster** anahtarını açın.',
                    'Editörde **Araçlar** sekmesi belirir: **İçerikten Başlık** nota kısa bir başlık üretir, **Sıralı Ad** adsız eklenen dala sıra numarası verir; metni numaralandıran ve fazla boşlukları temizleyen araçlar da vardır.',
                    'İstemediğiniz aracı aynı ekrandan kapatabilir ya da silebilirsiniz.',
                ],
                ayarId: 'tools',
                ayarEtiketi: 'Düzenleme araçlarını aç',
            },
            {
                id: 't-gorunum',
                ikon: 'Palette',
                title: 'Görünümü kişiselleştirin',
                description: 'Açık, koyu ya da sistem teması.',
                adimlar: [
                    '**Ayarlar → Görünüm → Tema** bölümünden **Açık**, **Koyu** ya da telefonunuzu izleyen **Sistem** temasını seçin.',
                ],
                ayarId: 'gorunum',
                ayarEtiketi: 'Görünüm ayarlarını aç',
            },
        ],
    },
    {
        id: 'orta',
        ad: 'Orta',
        ikon: 'Cloud',
        ozet: 'Notlarınızı güvene alın ve yapay zekâdan yardım alın. Bu seviyenin sonunda notlarınız Google Drive\'da yedeklenir, başka cihazda da görünür ve metinlerinizi tek dokunuşla özetletip düzelttirebilirsiniz.',
        dersler: [
            {
                id: 'o-yedek',
                ikon: 'Cloud',
                title: 'Google Drive ile yedek ve senkron',
                description: 'Telefon kaybolsa da notlar kalsın.',
                adimlar: [
                    '**Ayarlar → Hesap ve giriş** bölümünden Google ile giriş yapın.',
                    '**Ayarlar → Yedekleme ve senkronizasyon** bölümünde **Drive ile Senkron**, yedekle bu cihazı güvenle birleştirir; **Drive\'a Yedekle** cihazdakini yazar.',
                    '**Otomatik senkronu aç** anahtarı açıkken değişiklikler kendiliğinden yedeklenir.',
                    'Yedekler Drive\'ınızın **uygulamaya özel gizli klasöründe** durur; başka uygulamalar göremez.',
                    'Notların her cihazda aynı olması için her cihazda **aynı Google hesabını** kullanın.',
                ],
                ipucu: 'Giriş yapmadan kullanırsanız notlar yalnız bu telefondadır; uygulamayı kaldırırsanız silinir.',
                ayarId: 'sync',
                ayarEtiketi: 'Yedekleme ayarlarını aç',
            },
            {
                id: 'o-dosya',
                ikon: 'Download',
                title: 'Dosya olarak yedek almak',
                description: 'Drive kullanmadan taşımak için.',
                adimlar: [
                    '**Ayarlar → Veri yönetimi → Dışa Aktar** ile bahçelerinizi **JSON**, **HTML** veya **PDF** olarak kaydedin.',
                    'Yeni telefonda **İçe Aktar** ile JSON yedeğini geri yükleyin.',
                    'Tek bir notu editörden **Word** ya da **PDF** olarak indirebilirsiniz.',
                ],
                ayarId: 'data',
                ayarEtiketi: 'Veri yönetimini aç',
            },
            {
                id: 'o-ai',
                ikon: 'Sparkles',
                title: 'Yapay zekâ ile ilk adım',
                description: 'Özetle, imla düzelt, çevir.',
                adimlar: [
                    '**Ayarlar → Yapay zekâ → Bulut** sekmesinde bir sağlayıcı seçip kendi API anahtarınızı girin ve etkinleştirin.',
                    '**Ayarlar → Düzenleme araçları**\'nda **Yapay zekâ bölümünü editörde göster** anahtarını açın.',
                    'Editörde **AI** satırındaki bir makro kutusuna dokunun (ör. **Özetle**, **İmla Düzelt**).',
                    'Metnin bir bölümünü seçtiyseniz yalnız o bölüm işlenir.',
                    'Gelen sonucu **Onayla** ile kalıcı yapın ya da **Geri Al** ile vazgeçin.',
                ],
                ipucu: 'Yapay zekâ isteğe bağlıdır; kullanmazsanız uygulamanın geri kalanı aynen çalışır.',
                ayarId: 'models',
                ayarEtiketi: 'Yapay zekâ ayarlarını aç',
            },
            {
                id: 'o-ai-makro',
                ikon: 'Wand2',
                title: 'Kendi yapay zekâ komutlarınız',
                description: 'Sık yaptığınız işi tek kutuya koyun.',
                adimlar: [
                    '**Ayarlar → AI makroları**\'nda yeni bir makro ekleyin: ad, kısa açıklama ve yapay zekâya gidecek görevi yazın (ör. "Bu metni resmî bir e-postaya çevir").',
                    'Makro, editördeki AI satırında kutu olarak görünür. İstemediğiniz makroyu kapatabilirsiniz.',
                ],
                ayarId: 'macros',
                ayarEtiketi: 'AI makrolarını aç',
            },
        ],
    },
    {
        id: 'ileri',
        ad: 'İleri',
        ikon: 'MonitorSmartphone',
        ozet: 'Telefonunuzu bilgisayarın klavyesi, faresi ve panosu gibi kullanın. Bu seviyenin sonunda telefonda yazdığınızı bilgisayara yazdırabilir, panoya gönderebilir ve fareyi telefondan yönetebilirsiniz.',
        dersler: [
            {
                id: 'i-ac',
                ikon: 'MonitorSmartphone',
                title: 'Bilgisayar araçlarını açın',
                description: 'Editörde Bilgisayar sekmesi.',
                adimlar: [
                    '**Ayarlar → Düzenleme araçları → Bilgisayar araçları** sekmesinde **Bilgisayar araçlarını editörde göster** anahtarını açın.',
                    'Aynı ekranda hangi araçların (Fare, Dikte, Bilgisayara Yaz, Panoya Gönder…) görüneceğini tek tek seçebilirsiniz.',
                    'Editörde **Bilgisayar** sekmesine dokunun; araçlar ikinci satırda görünür.',
                ],
                ayarId: 'tools',
                ayarEtiketi: 'Düzenleme araçlarını aç',
            },
            {
                id: 'i-yol',
                ikon: 'Link2',
                title: 'Size uygun bağlantıyı seçin',
                description: 'Dört yol; çoğu kişi için ilk ikisi yeter.',
                adimlar: [
                    '**Ayarlar → Bilgisayar bağlantısı**\'nda bir yol seçin ve ekrandaki numaralı adımları sırayla izleyin.',
                    '**Bilgisayar · Bluetooth:** bilgisayara **program kurmadan** çalışır. Telefon bilgisayara Bluetooth klavye ve fare olarak bağlanır.',
                    '**Bilgisayar · Wi‑Fi:** bilgisayarda **PC yardımcısı** açık olmalıdır; ilk kez bağlanırken penceredeki **6 haneli kodu** bir kez yazarsınız. Telefon ve bilgisayar aynı Wi‑Fi\'da olmalı.',
                    '**Kart · Wi‑Fi** ve **Kart · Bluetooth:** bilgisayara USB ile takılan Not Bahçesi kartı (ESP32‑S3) içindir; kart bilgisayara klavye ve fare gibi yazar. Kartınız yoksa bu yolları atlayın.',
                    'Yolu seçtikten sonra **Deneyin** adımındaki düğmeyle bağlantıyı sınayın.',
                ],
                ipucu: 'Bluetooth ile ilk kez bağlanırken bilgisayar telefonu klavye olarak tanımazsa ekrandaki "İlk kez mi, ya da bağlanmıyor mu?" adımlarını izleyin: bilgisayarda telefonu kaldırıp "Cihaz ekle" ile yeniden ekleyin.',
                ayarId: 'remote',
                ayarEtiketi: 'Bilgisayar bağlantısını aç',
            },
            {
                id: 'i-gosterge',
                ikon: 'Link2',
                title: 'Bağlantı simgesini okuyun',
                description: 'Yeşil, kırmızı, gri.',
                adimlar: [
                    'Editörün Bilgisayar satırının başındaki zincir simgesi bağlantının **canlı** durumunu gösterir.',
                    '**Yeşil:** bilgisayar gerçekten yanıt veriyor. **Kırmızı:** kurulu ama şu an ulaşılamıyor. **Gri:** kurulum eksik.',
                    'Simgeye dokunmak doğrudan **Bilgisayar bağlantısı** ayarlarını açar.',
                ],
            },
            {
                id: 'i-yaz',
                ikon: 'Keyboard',
                title: 'Bilgisayara yazdırın ve panoya gönderin',
                description: 'Telefonda yaz, bilgisayarda kullan.',
                adimlar: [
                    'Bilgisayarda yazının gideceği yere (ör. Word) bir kez tıklayın.',
                    'Telefonda notu yazın ve **Bilgisayara yaz** (gönder) düğmesine dokunun: metin, klavyeden yazılmış gibi bilgisayara geçer.',
                    '**PC panosu** düğmesi metni bilgisayarın panosuna koyar; bilgisayarda **Ctrl+V** ile istediğiniz yere yapıştırırsınız.',
                    'Gönderim bitince ekranın üstünde kısa bir **"gönderildi ✓"** bildirimi çıkar ve düğme birkaç saniye yeşil tik gösterir. Hata olursa bildirim nedenini yazar.',
                ],
                ipucu: 'Pano için bilgisayarda PC yardımcısı açık olmalıdır (Bilgisayar · Wi‑Fi\'da zaten açıktır). Diğer yollarda yardımcıyı bir kez tanıtmak için Bilgisayar bağlantısı → PC panosu bölümünü kullanın; Bluetooth seçerseniz kod gerekmez.',
            },
            {
                id: 'i-fare',
                ikon: 'MousePointer2',
                title: 'Fare ve dikte',
                description: 'Telefonu dokunmatik yüzey gibi kullanın.',
                adimlar: [
                    '**Fare** aracında yüzeyde parmağınızı kaydırınca imleç hareket eder; dokunmak sol tıktır. Alttaki düğmelerle sağ tık ve kaydırma yapılır.',
                    '**Dikte** konuşmanızı yazıya çevirir. Sonucun **nota**, **bilgisayara** ya da **ikisine birden** yazılacağını **Ayarlar → Düzenleme araçları → Bilgisayar araçları** listesinde Dikte satırındaki **dişli** simgesinden seçersiniz.',
                    '**Bilgisayara Yaz** notu bilgisayara yazar. Aracın dişlisinden biçimi seçersiniz: **Düğmeyle** (notun tamamı bir kerede) ya da **Yazdıkça canlı** (notta yazdığınız her şey anında bilgisayara da yazılır). Hedef olarak bilgisayar, not metni ya da ikisi birden seçilebilir.',
                    '**Köprü Dikte** konuşurken yazar: sözünüz cümle sonu beklenmeden görünür. Nereye yazılacağını (nota, bilgisayara ya da ikisine birden), dinleme süresini ve durdurana kadar dinleme seçeneğini aracın kendi **dişli** simgesinden ayarlarsınız. Ses tanıma motorunu ise **Bilgisayar bağlantısı → Dikte motoru** bölümünden seçersiniz.',
                ],
            },
            {
                id: 'i-yardimci',
                ikon: 'Download',
                title: 'PC yardımcısı ne zaman gerekir?',
                description: 'Kısa cevap: Wi‑Fi ve pano için.',
                adimlar: [
                    '**Bilgisayar · Wi‑Fi** yolunda yazma, fare ve pano için gerekir.',
                    'Diğer yollarda yazma ve fare programsız çalışır; yardımcı yalnız **panoya göndermek** için gerekir.',
                    'Yardımcıyı **yönetici olarak çalıştırmanız gerekmez**. Windows yalnız ilk seferde, Wi‑Fi için güvenlik duvarı izni sorabilir.',
                    'Bilgisayarı her açtığınızda yardımcıyı yeniden başlatın; pencere kapanınca durur. Eşleşme hatırlanır, kod bir daha sorulmaz.',
                ],
            },
        ],
    },
    {
        id: 'uzman',
        ad: 'Uzman',
        ikon: 'Award',
        ozet: 'Kendi kontrol panelinizi kurun: makrolar, sıralı işler, profiller ve bölmeli ekranlar. Bu seviyenin sonunda tekrarlayan işleri tek dokunuşa indirir, telefonu size özel bir kumanda masasına çevirirsiniz.',
        dersler: [
            {
                id: 'u-makro',
                ikon: 'Wand2',
                title: 'Kişisel kısayollar (makrolar)',
                description: 'Konum, klavye kısayolu, hazır metin.',
                adimlar: [
                    '**Ayarlar → Düzenleme araçları → Bilgisayar araçları → Kişisel kısayollar**\'da **Makro Ekle**\'ye dokunun.',
                    '**Konum:** bilgisayar ekranında seçtiğiniz noktaya tek ya da çift tıklar. **Kısayol:** CTRL+S gibi bir tuş birleşimi gönderir; **Klavyeden seç** ile sanal klavyeden de seçebilirsiniz. **Metin:** hazır bir yazıyı yazar.',
                    'Editörde **Kısayollar** (sihirli değnek) aracına dokunun: makrolar bir pano olarak açılır, her biri tek dokunuşla çalışır.',
                ],
                ipucu: '**Bilgisayar · Bluetooth** yolunda telefon ekranın belirli bir noktasına kendiliğinden gidemez; **Konum** makroları için bilgisayarda PC yardımcısı açık ve bir kez tanıtılmış olmalıdır (PC panosu bölümünden, kod gerekmez). Kısayol ve metin makroları programsız çalışır.',
                ayarId: 'tools',
                ayarEtiketi: 'Düzenleme araçlarını aç',
            },
            {
                id: 'u-sirali',
                ikon: 'ListOrdered',
                title: 'Sıralı makro ve bekleme',
                description: 'Birçok adımı tek düğmeye bağlayın.',
                adimlar: [
                    'Makro türü olarak **Sıralı**\'yı seçin. Adım olarak metin, kısayol, tıklama, başka bir kayıtlı makro ya da **bekleme** ekleyin.',
                    'Adımları oklarla sıralayın. İki adımın arasındaki **+ Bekleme** düğmesi tam oraya süre koyar (0,05 sn – 10 dk).',
                    'Bir adım hata verirse makro durur ve hangi adımın sorunlu olduğunu söyler.',
                ],
            },
            {
                id: 'u-calisma',
                ikon: 'ListOrdered',
                title: 'Düğmeye basınca: dört çalışma biçimi',
                description: 'Normal, Sayılı, Anahtar, Basılı tut.',
                adimlar: [
                    'Sıralı makronun altındaki **Düğmeye basınca** bölümünden seçin.',
                    '**Normal:** bir kez çalışır, bilgisayar tuşu gibi. **Sayılı:** belirlediğiniz sayı kadar (1–1000) art arda çalışır.',
                    '**Anahtar:** ilk dokunuş açar, siz yeniden dokunup kapatana kadar baştan tekrar eder. **Basılı tut:** parmağınız düğmedeyken tekrar eder, bırakınca durur.',
                    'Tekrarlanan biçimlerde **Turlar arası** bekleme verebilirsiniz. Çalışan makronun düğmesi yeşil çerçeveyle vurgulanır, köşesinde tur sayısı görünür.',
                ],
                ipucu: 'Uzun bir Sayılı ya da Anahtar makroyu durdurmak için düğmesine yeniden dokunmanız yeterlidir.',
            },
            {
                id: 'u-profil',
                ikon: 'Layers',
                title: 'Profiller ve kısayol düğmeleri',
                description: 'Makroları işe göre gruplayın.',
                adimlar: [
                    '**Profiller ve kısayol düğmeleri** bölümünde "Ofis", "Oyun" gibi profiller oluşturup makroları içlerine sıralayın.',
                    'Editörde **Kısayollar** aracına dokunduğunuzda ikinci satırda **Tümü** ve profil sekmeleri çıkar; sekmeler arasında tek dokunuşla geçersiniz. Klavye simgesi yazıya döndürür.',
                    'Sık kullandığınız profil için ayrıca bir **kısayol düğmesi** ekleyebilirsiniz; düğme Bilgisayar satırında durur.',
                ],
            },
            {
                id: 'u-ekran',
                ikon: 'LayoutDashboard',
                title: 'Kendi ekranınızı tasarlayın',
                description: 'Bölmeli kumanda masası.',
                adimlar: [
                    '**Ekran düzenleri** bölümünde yeni bir düzen açın. Ekranı yan yana **sütunlara**, her sütunu alt alta **bölmelere** ayırın.',
                    'Her bölmeye bir içerik verin: **Fare**, **Yön tuşları**, **Metin yazma**, **Canlı klavye**, görünen **Telefon** ya da **Bilgisayar klavyesi**, **Kısayollar** (bir profile bağlanabilir) veya **Köprü Dikte**.',
                    'Bölmeler arası boşluğu ve iç boşluğu sayı olarak girin; **kenarsız** seçeneği bölmeleri tek yüzey gibi gösterir.',
                    'Editörde **Ekran** aracına dokunun; ikinci satırdan düzenler arasında geçiş yaparsınız.',
                ],
            },
            {
                id: 'u-yerel-ai',
                ikon: 'Cpu',
                title: 'Yerel yapay zekâ (internetsiz)',
                description: 'Model telefonda çalışır.',
                adimlar: [
                    '**Ayarlar → Yapay zekâ → Yerel** sekmesini açın.',
                    'Hugging Face\'ten LiteRT‑LM uyumlu **.litertlm** ya da MediaPipe uyumlu **.task / .bin** model dosyasını indirin.',
                    '**Dosya seç → Etkinleştir** adımlarını izleyin, **Modeli dene** ile yanıtı kontrol edin.',
                ],
                ipucu: 'Yerel modeller büyük dosyalardır ve telefonun belleğini kullanır; güçlü telefonlarda daha hızlı çalışır.',
                ayarId: 'models',
                ayarEtiketi: 'Yapay zekâ ayarlarını aç',
            },
            {
                id: 'u-sorun',
                ikon: 'HelpCircle',
                title: 'Sorun giderme',
                description: 'Bağlantı kırmızıysa sırayla deneyin.',
                adimlar: [
                    '**Wi‑Fi yollarında:** telefon ve bilgisayar aynı ağda mı? Bilgisayarın ağ profili **Özel** mi? PC yardımcısının penceresi açık mı?',
                    '**Bluetooth yollarında:** iki cihazda da Bluetooth açık mı? Bilgisayar telefonu klavye olarak tanımıyorsa telefonu bilgisayardan kaldırıp yeniden ekleyin.',
                    'Telefonda başka bir "Bluetooth klavye/fare" uygulaması açıksa kapatın; aynı anda yalnız bir uygulama klavye olabilir.',
                    'Bağlantı simgesine dokunup **Bilgisayar bağlantısı** ekranındaki **Deneyin** düğmesiyle nedeni görün; hata iletisi ne yapmanız gerektiğini söyler.',
                ],
                ayarId: 'remote',
                ayarEtiketi: 'Bilgisayar bağlantısını aç',
            },
        ],
    },
];

export const SSS: Array<{ soru: string; cevap: string }> = [
    {
        soru: 'Notlarım kaybolur mu?',
        cevap: "Giriş yapmadan kullanırsanız notlar yalnız bu cihazdadır; uygulamayı kaldırırsanız silinir. Google ile giriş yapıp otomatik senkronu açarsanız Drive'da yedeklenir.",
    },
    {
        soru: 'İnternet olmadan çalışır mı?',
        cevap: 'Evet. Notlar cihazda tutulur; yalnız Drive senkronu ve bulut yapay zekâ internet ister. Bilgisayar araçları yerel ağ ya da Bluetooth kullanır.',
    },
    {
        soru: 'Telefon ve bilgisayarda aynı notları görebilir miyim?',
        cevap: 'İki cihazda da aynı Google hesabıyla giriş yapıp otomatik senkronu açın. Notlar birleştirilir; çakışmada en son değiştirilen sürüm geçerli olur.',
    },
    {
        soru: 'Yapay zekâ hata veriyor, ne yapmalıyım?',
        cevap: 'Hata iletisi sağlayıcının yanıtını gösterir. Sık sebepler: geçersiz API anahtarı, yanlış model adı, kota ya da bakiye yetersizliği.',
    },
    {
        soru: 'Bilgisayarıma program kurmam gerekiyor mu?',
        cevap: 'Bilgisayar · Bluetooth yolunda yazma ve fare için hayır. PC yardımcısı yalnız Bilgisayar · Wi‑Fi yolu ve bilgisayar panosuna gönderme için gerekir; kurulum istemez, Windows\'un kendi PowerShell\'iyle çalışır ve yönetici olarak açmanız gerekmez.',
    },
    {
        soru: 'Eşleştirme kodu ne işe yarar?',
        cevap: 'PC yardımcısının penceresinde görünen 6 haneli kod, telefonunuzun o bilgisayarı Wi‑Fi üzerinden güvenle tanıması içindir ve bir kez kullanılır. Bluetooth ile eşleşmiş bilgisayarda pano için kod gerekmez.',
    },
    {
        soru: 'Başka bir bilgisayarda da kullanabilir miyim?',
        cevap: 'Evet. Bluetooth yolunda yeni bilgisayarı telefonla eşleştirip Bilgisayar bağlantısı ekranından seçin. Wi‑Fi yolunda o bilgisayarda PC yardımcısını açıp "Ağda bilgisayar ara" ile bulun ve penceredeki kodu yazın.',
    },
    {
        soru: 'Panoya gönderdim, nasıl anlarım?',
        cevap: 'Gönderim bitince editörün üstünde kısa bir "gönderildi ✓" bildirimi çıkar ve PC panosu düğmesi birkaç saniye yeşil tik gösterir. Bilgisayarda Ctrl+V ile yapıştırabilirsiniz.',
    },
];
