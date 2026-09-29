# Not Bahçesi 2.1.9 - Arayüz, Erişilebilirlik, Test ve Play Store Öncesi İnceleme

Tarih: 28 Eylül 2026 - İncelenen sürüm: 2.1.9 / versionCode 43 - Hedef: Google Play kapalı test yüklemesi

Bu belge, 28 Eylül 2026 tarihli güvenlik/veri bütünlüğü incelemesini
([2026-09-28-play-store-inceleme.md](2026-09-28-play-store-inceleme.md)) tamamlar. Oradaki P1
maddeleri tekrar edilmez; burada **arayüz, tema, erişilebilirlik, çalışma zamanı davranışı ve mağaza
yüklemesi** ele alınır.

Kanıt etiketleri:

- **Doğrulandı:** komut, canlı HTTP isteği veya gerçek tarayıcı oturumunda gözlenen sonuç.
- **Ölçüldü:** araç çıktısı (axe-core, kontrast hesabı, cihaz ölçümü).
- **Koddan saptandı:** ilgili akışta sorun var; cihazda yeniden üretilmedi.
- **Doğrulama gerekli:** cihaz, Play Console veya üretim hesabı erişimi gerektirir.

---

## 1. Yönetici özeti

**Karar: uygulama arayüz olarak yüke yakın, ancak şu hâliyle Play Store'a yüklenmemeli.** Engeller
arayüz tasarımında değil; **üretime dağıtılmamış kod, mağaza formu tutarsızlıkları ve birkaç
erişilebilirlik/erişim hatasında** toplanmış durumda. Tamamı birkaç saatlik iş.

En önemli sonuçlar:

1. **Canlı yapay zekâ uç noktası halka açık.** Üretimdeki POST /api/spellcheck kimliksiz ve sahte
   belirteç ile 200 dönüyor ve sunucudaki Gemini anahtarını kullanıyor. Depodaki sertleştirilmiş
   sürüm üretime dağıtılmamış. **Doğrulandı.**
2. **/veri-silme ve /.well-known/assetlinks.json üretimde 404.** Play Console'un veri silme URL'i
   kırık; App Links doğrulanmadığı için Google ile giriş dönüşü tarayıcıda kalıyor. Kök neden:
   public/ ve app/veri-silme/ hiç commit edilmemiş. **Doğrulandı.**
3. **Yayındaki gizlilik politikası eski metni gösteriyor** (bilgisayar araçları, mikrofon ve veri
   silme bölümleri yok); Data Safety formu ile çelişki riski. **Doğrulandı.**
4. **Mağaza tam açıklaması 4.592 karakter, Play sınırı 4.000.** Konsol bu metni kaydetmez.
   **Ölçüldü.**
5. **Uygulama içinden hesap silme akışı yok.** Google girişi olan uygulamalar için Play bunu şart
   koşuyor. **Koddan saptandı.**
6. **Canvas'ta geçersiz HTML ve hydration hatası:** ul > li > li yapısı nedeniyle /bahce_view
   rotasında React hydration hatası oluşuyor. **Doğrulandı** (tarayıcı konsolu).
7. **Erişilebilirlikte üç kritik boşluk:** okunamayan soluk metin (2,24:1), 44 px altında kalan
   dokunma hedefleri (en kötüsü 20x20) ve ikon-only düğmelerin erişilebilir adının olmaması.
   **Ölçüldü** (axe-core + kontrast hesabı).
8. **Mobil editörde yerleşim taşması:** Oto onay kutusu üst çubuğun dışına çıkıyor, başlık
   kırpılıyor, iki araç şeridi sağdan kesiliyor. **Doğrulandı** (ekran görüntüsü).
9. **Derleme ve paket tarafı iyi durumda:** tsc temiz, lint 1 uyarı, üretim derlemesi ve statik
   dışa aktarma başarılı, Android lintRelease 0 hata, AAB imzalı ve sürüm numaraları tutarlı.
   Pakette native kütüphane yok, yani 16 KB sayfa boyutu şartı sorun değil.
10. **Google ile giriş cihazda kırılmaya aday:** google-services.json içinde yalnızca web tipi OAuth
    istemcisi var (client_type 3), Android istemcisi yok. **Doğrulama gerekli.**

---

## 2. Yayın engelleri (P0)

### P0-1. Üretimdeki yapay zekâ uç noktası kimlik doğrulaması yapmıyor - **Doğrulandı**

Canlı uca yapılan dört ayrı istek:

| İstek | Beklenen | Gözlenen |
|---|---|---|
| Bozuk JSON gövdesi | 400 | **500** |
| Geçersiz sağlayıcı adı | 400 | 400 |
| Sahte Bearer belirteci + geçerli gövde | 401 | **200** ve düzeltilmiş metin |
| Boş gövde | 400 | **200** ve boş nesne |

Sahte belirteçle 200 dönmesi, isteğin sunucudaki GEMINI_API_KEY ile karşılandığını gösterir; uç
nokta fiilen herkese açık bir yapay zekâ geçididir (kota ve fatura riski). Depodaki
app/api/spellcheck/route.ts içinde sertleştirilmiş sürüm var ve aynı istek yerelde 401 dönüyor;
**sorun kodda değil, dağıtımda.** Üretim, main dalının son commit'inin (2ccf7e5, 26.09.2026) kodunu
çalıştırıyor.

**Yapılacak:** sertleştirilmiş rotayı commit edip dağıtın, GEMINI_API_KEY anahtarını Google AI
Studio'dan döndürün, Vercel'de AI_ALLOW_SERVER_KEY tanımlı olmadığından emin olun ve aynı isteğin
**401** döndüğünü doğrulayın.

### P0-2. Veri silme ve App Links adresleri üretimde yok - **Doğrulandı**

Canlı sitede: / ve /gizlilik 200 dönerken **/veri-silme 404** ve
**/.well-known/assetlinks.json 404** dönüyor (ikincisi içerik tipi text/html, yani Next 404
sayfası). Kök neden: git ls-files public app/veri-silme çıktısı **0 dosya**; iki dizin de yalnızca
yerel çalışma ağacında duruyor ve Vercel git tabanlı dağıtım yaptığı için hiç yayınlanmadı.

**Yapılacak:** public/ (özellikle assetlinks.json) ve app/veri-silme/ dosyalarını commit edip main'e
gönderin, dağıtımdan sonra iki adresin **200** döndüğünü doğrulayın. Ardından Play App Signing
sertifikasının SHA-256 parmak izini assetlinks.json içine ikinci kayıt olarak ekleyin (dosyada şu an
yalnızca yükleme anahtarının izi var).

### P0-3. Yayındaki gizlilik politikası gerçek veri akışını anlatmıyor - **Doğrulandı**

Canlı /gizlilik sayfasında bilgisayar, mikrofon ve veri silme ifadeleri **hiç geçmiyor**; sayfa,
bilgisayar araçları ve dikte bölümleri eklenmeden önceki sürümü gösteriyor. Play, Data Safety
formundaki beyanlarla gizlilik politikasının uyumlu olmasını bekler.

**Yapılacak:** app/gizlilik/page.tsx içindeki güncel metni dağıtın; bilgisayar araçları, dikte
(mikrofon), yapay zekâ aktarımı ve veri silme bölümlerinin yayında göründüğünü doğrulayın.

### P0-4. Mağaza tam açıklaması karakter sınırını aşıyor - **Ölçüldü**

play-store-paketi/belgeler/03-magaza-metinleri.md içindeki tam açıklama **4.592 karakter**; Play
sınırı **4.000**. Konsol bu metni kaydetmeye izin vermez. Kısa açıklama 69/80 karakter, sorun yok.
Yaklaşık 600 karakterlik kısaltma gerekiyor (öneri: KİMLER İÇİN bölümü ve tekrarlanan paragraf
sadeleşebilir).

### P0-5. Uygulama içinden hesap silme akışı yok - **Koddan saptandı**

Google ile giriş destekleyen uygulamalarda Play, kullanıcının hesabını ve ilişkili verisini
**uygulama içinden** silebilmesini ister. app/veri-silme/page.tsx yalnızca not silme, uygulamayı
kaldırma ve e-posta ile talep yolunu anlatıyor; kodda hesap silme çağrısı (deleteUser benzeri)
bulunmuyor.

**Yapılacak:** Ayarlar -> Hesap ve giriş bölümüne hesabı ve verileri sil akışı ekleyin; yerel modda
yalnızca cihaz verisini, oturum varsa Drive klasörünü ve oturumu temizleyin. Silme sayfasını bu
akışa bağlayın.

### P0-6. Google ile giriş için Android OAuth istemcisi doğrulanmamış - **Doğrulama gerekli**

android/app/google-services.json içindeki tek OAuth kaydı client_type 3 (web). Android istemcisi
(client_type 1) yok. Uygulama @codetrix-studio/capacitor-google-auth eklentisini serverClientId ile
kullanıyor; paket adı ve imza parmak iziyle tanımlı bir Android istemcisi yoksa cihazda
DEVELOPER_ERROR alınır ve Drive yedeklemesi de buna bağlı olduğu için zincir tamamen düşer.

**Yapılacak:** Google Cloud Console'da com.notbahcesi.app için Android OAuth istemcisini yükleme
anahtarının SHA-1'i ile oluşturun; Play App Signing etkinleştikten sonra **Play imzalama
anahtarının SHA-1'ini de** aynı istemciye ekleyin. Play'e yüklemeden önce imzalı APK ile Google
girişi ve Drive yedeklemeyi gerçek cihazda test edin.

---

## 3. Çalıştırılan kontroller

| Kontrol | Sonuç |
|---|---|
| npx tsc --noEmit | Başarılı, 0 hata |
| npm run lint | Başarılı, 1 uyarı: components/editor/AccountSettings.tsx:224 (img) |
| npm run build (üretim) | Başarılı, 14 statik sayfa; ilk yük JS 104-260 kB |
| CAPACITOR_BUILD=1 next build (mobil dışa aktarma) | Başarılı; out/ 81 dosya / 2,93 MB |
| Tarayıcı testi (headless Chrome, 390x844 ve 1280x900) | Tüm rotalar açıldı; 1 hydration hatası, 3 başarısız kaynak isteği |
| axe-core (WCAG 2.2 AA, 6 sayfa) | Kritik ve ciddi ihlaller var (bkz. bölüm 5) |
| Kontrast hesabı (sRGB bağıl parlaklık) | 2 eşleşme başarısız (bkz. bölüm 5) |
| Android :app:lintRelease | 0 hata, 28 uyarı |
| AAB incelemesi | versionCode 43 / versionName 2.1.9, imzalı, web varlıkları güncel out/ ile aynı |
| Pakette native kütüphane (.so) | Yok -> 16 KB sayfa boyutu şartı sorunsuz |
| Canlı HTTP kontrolü | /veri-silme ve assetlinks.json 404; AI ucu anonime 200 |
| Depoda takip edilmeyen dosya | 29 dosya/dizin hâlâ commit edilmemiş |

**Ortam notu (P2):** Aynı anda iki next dev sunucusu aynı .next klasörüne yazdığında geliştirme
ortamı bozuluyor; rotalar geçici olarak 404/500 dönebiliyor ve üretim derlemesi
Unexpected end of JSON input ile düşebiliyor. Derleme izole kopyada sorunsuz geçti. Zaman zaman
ders notu .next klasörünü silip tek dev sunucusuyla çalışmak yeterlidir.

---

## 4. Çalışma zamanında bulunan hatalar

### P1 - Canvas'ta geçersiz liste iç içeliği ve hydration hatası - **Doğrulandı**

/bahce_view rotasında tarayıcı konsolu şunu bildirdi: In HTML, li cannot be a descendant of li.
This will cause a hydration error. DOM zinciri: ul.flex.gap-20 -> li[data-agac-alani]
(sürükleme sarmalayıcısı) -> MindMapNode -> li. Kaynak: components/canvas/MindMapNode.tsx:162 ve
:331 kök li döndürüyor.

**Etki:** geçersiz HTML, React hydration uyarısı, bozuk liste semantiği (ekran okuyucu liste
öğelerini yanlış sayar) ve tarayıcının DOM'u kendi kendine düzeltme riski.

**Öneri:** sürükleme sarmalayıcısını div yapın; li yalnızca ul içinde kalsın.
**Kabul:** konsolda hydration hatası kalmamalı.

### P1 - Mobil editör üst çubuğu taşıyor - **Doğrulandı**

390 px genişlikte başlık kırpılıyor, yanındaki beş ikon düğmesi (dişli, kopyala, indir, ayraç,
kaydet) sıkışıyor ve **Oto onay kutusu üst çubuğun dışına, ekranın en üstüne taşıyor**. Kaynak:
app/editor/page.tsx:743 ve devamındaki üst çubuk.

**Öneri:** üst çubukta en fazla iki birincil eylem bırakın, kalanı üç nokta menüsüne taşıyın. Oto
anahtarını üst çubuğun dışına alın ve en az 44x44 px dokunma alanı verin.

### P1 - İki yatay araç şeridi kırpılıyor - **Doğrulandı**

Editörde üstte yapay zekâ makroları, altta yerel araçlar olmak üzere iki yatay kaydırmalı şerit var;
ikisi de sağdan kesiliyor ve **kaydırılabilir olduklarına dair görsel ipucu yok**. Ayrıca iki şerit
farklı görsel ağırlıkta (biri soluk çerçeveli, diğeri dolu yeşil), aynı işlev ailesi farklı
görünüyor. Kaynak: app/editor/page.tsx:897. axe-core bu bölge için scrollable-region-focusable
(serious) veriyor.

**Öneri:** tek şerit ve Tüm araçlar menüsü; şerit kenarına solma ipucu; klavye erişimi.

### P2 - Canvas açılışta içeriği sığdırmıyor - **Doğrulandı**

Aynı bahçede 4 düğüm varken ekranda yalnızca ilk düğüm görünüyor; diğerleri ekran dışında kalıyor ve
tümünü sığdır davranışı yok. Kullanıcı notlarının kaybolduğunu düşünebilir.

**Öneri:** ilk yüklemede fitView benzeri otomatik yerleştirme; üst çubuğa Sığdır düğmesi.

### P2 - Bahçe kimliği boşken İlk Ağacı Dik sessizce başarısız oluyor - **Doğrulandı**

projeler sayfası bahçe kimliğini adres satırından okur (app/projeler/page.tsx:39: gardenId =
searchParams.get('id') || ''). Kimlik boş veya silinmiş bir bahçeye aitse, boş durumdaki İlk Ağacı
Dik düğmesi istemi açar, kullanıcı ad yazıp onaylar ve hiçbir şey olmaz: addNode boş garden_id ile
çağrılır, sonuç boş döner ve arayüz bunu yalnızca if (created) koşuluyla yuttuğu için (satır 184)
hiçbir uyarı gösterilmez. Çalışma zamanı testinde doğrulandı.

**Etki:** uygulamanın ilk dakikasında sessiz bir çıkmaz; kullanıcı notunun oluşmadığını anlamıyor.

**Öneri:** kimlik yoksa/geçersizse bağlantıyı ana sayfaya yönlendirin veya varsayılan bir bahçe
oluşturun; addNode boş döndüğünde görünür hata mesajı gösterin.

### P2 - Budanmış içerik yalnızca renkle ayrışıyor - **Koddan saptandı**

Budanmış notlar saydamlık/renk ile ayırt ediliyor. Renk görme farkı olan kullanıcı için ikinci bir
işaret (üstü çizili metin, etiket veya simge) gerekir (WCAG 1.4.1).

---

## 5. Erişilebilirlik denetimi (WCAG 2.2 AA)

### 5.1 Kontrast - **Ölçüldü**

| Kullanım | Renk | Oran | Durum |
|---|---|---|---|
| Soluk metin (text-sand-400) beyaz kart üzerinde | #ADA396 / #FFFFFF | **2,48:1** | Başarısız (1.4.3) |
| Aynı metin kağıt zemininde | #ADA396 / #F6F3EE | **2,24:1** | Başarısız |
| text-sand-500 beyaz üzerinde | #7C7268 / #FFFFFF | 4,70:1 | Sınırda geçer |
| text-sand-500 kağıt zemininde | #7C7268 / #F6F3EE | ~4,25:1 | Başarısız |
| text-sand-600 beyaz üzerinde | #5B5348 / #FFFFFF | 7,57:1 | Geçer |
| Birincil buton | #F0F7EF / #275939 | 7,48:1 | Geçer |
| Bal rengi etiket | #73400F / #FAEDC9 | 7,30:1 | Geçer |

**Öneri:** metinlerde sand-400 kullanımını tamamen kaldırın. Kağıt zemininde sand-600, beyaz kart
üzerinde en az sand-500 kullanın; ikincil metin için tek bir --metin-soluk token'ı tanımlayıp her
yerde onu kullanın. Tarih, ipucu ve placeholder metinlerini bu kuralın dışında bırakmayın.

### 5.2 Dokunma hedefleri - **Ölçüldü**

44x44 px altında kalan etkileşimli öğe sayısı: ana sayfa **9**, projeler **17**, editör **23**,
ağaç görünümü **21**. En kötüleri: 20x20 px Dalları kapat düğmesi (app/projeler/page.tsx:396),
28x28 px düğüm eylem düğmeleri (components/canvas/MindMapNode.tsx), 10 px Oto onay kutusu ve 11 px
etiketler.

WCAG 2.5.8 en az 24x24, Google/Apple önerisi 48dp'dir. **Öneri:** tüm ikon düğmelerinde en az
44x44 px dokunma alanı (min-h-11 min-w-11), düğüm eylemlerini büyütüp gerekirse uzun basma menüsüne
taşıyın.

### 5.3 Ekran okuyucu ve anlamsal yapı - **Ölçüldü**

| Bulgu | Kanıt | Önem |
|---|---|---|
| İkon-only düğmelerin erişilebilir adı yok | axe critical; metin hidden sm:inline ile mobilde gizleniyor (app/projeler/page.tsx:846 ve :853) | Kritik |
| Etiketsiz form alanları | Editör başlık input, gövde textarea, projeler arama input | Yüksek |
| aria-label span üzerinde | axe serious aria-prohibited-attr (editör .text-[11px]) | Yüksek |
| main landmark yok | bahce_view, gizlilik, veri-silme (landmark-one-main) | Orta |
| Başlık sırası | Ana sayfada h3 ile başlama, ağaç görünümünde seviye atlama | Orta |
| Ayar penceresi kapanınca odak | Tetikleyici dişliye değil textarea'ya dönüyor | Orta |
| Çift header | Ayar penceresi açıkken landmark-no-duplicate-banner | Düşük |

**İyi olan ve korunması gerekenler:** :focus-visible odak halkaları doğru, modallarda aria-modal ve
odak tuzağı çalışıyor, role=status ve role=alert birçok yerde kullanılmış, viewport ayarı doğru
(maximumScale 5, user-scalable=no yok), env(safe-area-inset-*) düzenli kullanılıyor.

**Hazır aria-label metinleri:**

- Üst çubuk: Geri, Ayarları aç, Notu kopyala, Dışa aktar, Kaydet
- Projeler: Ağacı düzenle, Alt dal ekle, Dalları kapat, Dalları aç
- Canvas: Notu aç, Alt dal ekle, Yan dal ekle, Dalları kapat, Tümünü sığdır
- Editör araçları: İçerikten başlık oluştur, Sıralı listeye çevir, Numaralı listeye çevir
- Ayar penceresi: Ayarları kapat

### 5.4 Hareket, ölçek ve yeniden akış

- **prefers-reduced-motion hiç desteklenmiyor.** Tercih açıkken bile 21-38 öğede geçiş sürüyor.
  globals.css içinde @media (prefers-reduced-motion: reduce) ile geçişleri kısıtlayın (WCAG 2.3.3).
- **%200 metin ölçeğinde taşma:** gizlilik sayfası ~458 px, projeler ~484 px yatay taşıyor. Sabit
  genişlikleri ve whitespace-nowrap kullanımlarını gözden geçirin (1.4.10).
- **10-11 px metinler** (Oto, Kök Düşünce çipleri) okunabilirlik sınırında; en az 12 px önerilir.

### 5.5 Bildirimler

Kaydetme, eşitleme ve hata geri bildirimleri için tek bir aria-live=polite bölgesi tanımlayın;
şimdilik bu mesajlar yalnızca görsel olarak veriliyor.

---

## 6. Tema önerisi

Uygulama şu an tek temalı: sıcak kağıt zemini (#F6F3EE) ve yosun yeşili ile kahve/bal vurguları.
Koyu tema, tema seçimi ve prefers-color-scheme desteği **yok**; sistem koyu tema seçildiğinde
renkler birebir aynı kalıyor (ölçüldü). README yol haritasında Tema özelleştirme zaten açık madde.

Not: Android tarafında AppTheme.NoActionBar ebeveyni Theme.AppCompat.DayNight.NoActionBar ve
drawable-night/splash.png var (koyu zemin). Yani sistem koyu temadayken **koyu splash, ardından açık
uygulama** geçişi yaşanıyor; configChanges içinde uiMode olduğu için uygulama yeniden başlatılmıyor.
Bu, koyu tema gelene kadar düzeltilmesi gereken bir tutarsızlık.

### 6.1 Önerilen belirteç (token) yapısı ve ölçülen kontrastlar

| Belirteç | Açık tema | Koyu tema | Kontrast (koyu) | Durum |
|---|---|---|---|---|
| --zemin | #F6F3EE | #14110E | - | - |
| --yuzey | #FFFFFF | #1E1A16 | - | - |
| --yuzey-2 | #FBF9F6 | #262119 | - | - |
| --metin | #2C251D | #F2EDE6 | 14,85:1 | Geçer |
| --metin-ikincil | #5B5348 | #B0A395 | 7,01:1 | Geçer |
| --metin-soluk | #5B5348 (sand-600) | #9C8E80 | 5,43:1 | Geçer |
| --kenarlik | #EAE5DE | #453C33 | 1,60:1 | Yalnız dekoratif |
| --kenarlik-guclu | #DAD3C9 | #7A6E5E | 3,47:1 | Geçer (1.4.11) |
| --birincil | #275939 | #469A61 | 5,17:1 (#0C1A11 metin) | Geçer |
| --vurgu | #73400F | #E0A632 | 7,96:1 | Geçer |
| --tehlike | #9C2926 | #E3756D | 5,79:1 | Geçer |

Koyu temada soluk metin için #8C7F72 kullanmayın (4,44:1, sınırın altında); yerine #9C8E80 kullanın.

### 6.2 Uygulama planı

1. globals.css içinde semantik değişkenleri :root ve [data-tema="koyu"] altında tanımlayın;
   tailwind.config.js içine darkMode: 'class' ekleyin ve renkleri değişkene bağlayın.
2. Sabit renkleri önce değişkene çevirin. Öne çıkanlar: globals.css içindeki .glass
   (rgba(255,255,255,0.82)), canvas düğüm renkleri, lib/branchColors.ts ve capacitor.config.ts
   içindeki StatusBar/SplashScreen renkleri.
3. Ayarlar -> Yazma deneyimi altına Görünüm: Açık / Koyu / Sistem seçeneği ekleyin; tercihi
   lib/uiPrefs.ts üzerinden saklayın.
4. Tema değişince @capacitor/status-bar ile durum çubuğu stilini ve arka plan rengini güncelleyin.
5. Android tarafını ya koyu temaya hazırlayın (values-night) ya da geçici olarak açık temaya
   sabitleyin (AppCompatDelegate.setDefaultNightMode(MODE_NIGHT_NO)).

Tahmini efor: 1-2 gün (token geçişi mekanik, ekran ekran doğrulama gerektirir).

### 6.3 Ek tema seçenekleri

| Tema | Fayda | Maliyet |
|---|---|---|
| Sistem temasını izleme | Beklenti karşılama, en yüksek memnuniyet | Token altyapısının parçası |
| Yüksek kontrast | Düşük görme, güneş altında okunurluk | Ayrı palet ve doğrulama |
| Yazma odaklı (sepya) | Uzun yazma seansları | Küçük palet farkı |
| Renk körlüğü dostu dal renkleri | Dal renkleri şu an yalnızca renkle ayrışıyor | Simge/desen eklemek gerekir |

---

## 7. Arayüz geliştirme önerileri (öncelik sıralı)

**Hızlı kazanımlar (yarım gün veya daha az)**

1. İkon-only düğmelere aria-label ekleyin (bölüm 5.3'teki hazır metinler).
2. text-sand-400 kullanımlarını sand-600/sand-500 ile değiştirin.
3. Canvas'taki iç içe li yapısını düzeltin.
4. Mobil editör üst çubuğunu sadeleştirin; Oto anahtarını taşma yapmayacak yere alın.
5. prefers-reduced-motion desteği ekleyin.
6. bahce_view, gizlilik ve veri-silme sayfalarına main landmark'ı ekleyin.
7. Başlık hiyerarşisini düzeltin (ana sayfada h3 yerine h1/h2).
8. Ayar penceresi kapandığında odağı tetikleyici düğmeye döndürün.

**Orta vadeli (1-3 gün)**

9. Bahçe kartlarını sıkıştırın: tarih ve üç nokta aynı satırda; Projeler/Canvas ikilisini tek Aç
   düğmesi ve uzun basma menüsüne indirin. Kartlar mobilde ekranın büyük bölümünü kaplıyor ve her
   kartta aynı iki büyük düğme tekrarlanıyor.
10. Bahçe kartlarındaki anlamsız yeşilden amber'a geçen gradyan şeridi kaldırın (her kartta aynı,
    bilgi taşımıyor).
11. Editördeki iki araç şeridini tek şeride indirin ve kaydırma ipucu ekleyin.
12. Canvas'a Tümünü sığdır davranışı ve düğmesi ekleyin; mobilde küçük bir genel görünüm ekleyin.
13. Ayarlardaki çift Kullanım kılavuzu girişini tek yerde toplayın (kahraman kart ve Yardım grubu).
14. Ayarlara erişimi logodaki turuncu dişli rozetinden çıkarıp başlıkta görünür bir Ayarlar düğmesine
    taşıyın; rozet bildirim gibi okunuyor ve ilk kullanıcının bulması zor.
15. Dokunma hedeflerini 44 px'e çıkarın (bölüm 5.2).
16. %200 metin ölçeğindeki taşmaları düzeltin.

**Uzun vadeli**

17. Koyu tema ve görünüm ayarı (bölüm 6).
18. Canvas düğümlerine klavye ile gezinme ve erişilebilir adlar; düğüm eylemlerini erişilebilir bir
    açılır menüye taşımak.
19. Kaydetme/eşitleme durumu için aria-live bölgesi ve görsel durum göstergesi.
20. Tablet/foldable için iki sütun düzen ve 7"/10" mağaza görselleri.

---

## 8. Play Store'a yüklemeden önce yapılacaklar

**A. Kaynak ve dağıtım (yükleme engeli)**

- [ ] public/ ve app/veri-silme/ dahil tüm takip edilmeyen dosyaları commit edip main'e gönderin.
- [ ] Dağıtım sonrası /veri-silme ve /.well-known/assetlinks.json adreslerinin 200 döndüğünü doğrulayın.
- [ ] Güncel gizlilik metninin yayında olduğunu doğrulayın (bilgisayar araçları, mikrofon, veri silme bölümleri görünmeli).
- [ ] Sertleştirilmiş spellcheck rotasını dağıtın; anonim isteğin 401 döndüğünü doğrulayın.
- [ ] GEMINI_API_KEY anahtarını döndürün; Vercel'de AI_ALLOW_SERVER_KEY tanımlı olmasın.

**B. Mağaza formu (yükleme engeli)**

- [ ] Tam açıklamayı 4.000 karakterin altına indirin (şu an 4.592).
- [ ] Mağaza metnindeki yapay zekâ anahtarının cihazdan çıkmadığı ifadesini düzeltin; anahtar istekle
      birlikte Vercel rotasından geçiyor.
- [ ] Data Safety formuna verinin geliştirici altyapısından iletildiği beyanını ekleyin.
- [ ] Uygulama içinden hesap silme akışını ekleyin ve veri silme URL'ini bu akışa bağlayın.
- [ ] İçerik derecelendirme anketi (tüm cevaplar Hayır), hedef kitle 18+, reklam yok beyanı.
- [ ] Uygulama erişimi açıklamasını gerçek akışa göre yazın (yerel mod düğmesi).

**C. Paket ve imzalama**

- [ ] versionCode değerini artırın (43 -> 44) ve versionName ile lib/config.ts ve README sürümünü eşitleyin.
- [ ] npx cap sync android sonrası gradlew bundleRelease ile AAB üretin (APK değil).
- [ ] Play App Signing SHA-256'sını assetlinks.json içine ekleyip yeniden dağıtın.
- [ ] Google Cloud'da Android OAuth istemcisini (paket adı ile yükleme ve Play imza parmak izleri) tanımlayın.
- [ ] minifyEnabled true ve ProGuard kurallarını açıp RemoteBridgePlugin için test edin.
- [ ] network_security_config.xml içinde base-config değerini false yapın, yalnızca yerel ağ
      adreslerine istisna verin; ölü zojnjnyjavftnscbnikv.supabase.co kaydını silin.
- [ ] strings.xml içindeki app_name değerini Not Bahcesi yerine Not Bahçesi yapın; cihazdaki uygulama
      adı mağaza adıyla aynı görünsün.

**D. Cihaz testi (yüklemeden önce)**

- [ ] İmzalı AAB/APK ile kurulum, ilk açılış, çevrimdışı açılış.
- [ ] Google ile giriş, Drive yedekleme ve ikinci cihazdan geri yükleme.
- [ ] Bilgisayar araçları (Wi-Fi/BLE), dikte izin akışı ve izin reddi senaryosu.
- [ ] Sistem yazı boyutu en büyükken ve koyu sistem temasında arayüz turu.
- [ ] TalkBack ile ana akışlar (bahçe oluştur, not yaz, canvas'ta gezin).
- [ ] Play Console Play öncesi rapor (pre-launch report) sonuçlarını inceleyin.

**E. Yayın akışı**

- [ ] Dahili test -> kapalı test (kişisel hesapta 12 test kullanıcısı / 14 gün) -> üretim.
- [ ] İlk hafta Android vitals (ANR/çökme) ve yapay zekâ uç noktası kota kullanımını izleyin.
- [ ] Çökme raporlama yok; ilk sürümde en azından Play Console vitals'i düzenli kontrol edin.

---

## 9. Sınırlar ve doğrulanamayanlar

- Bu inceleme **kaynak kod değiştirmedi**; yalnızca rapor ve ölçüm betikleri eklendi. İnceleme
  sırasında bir alt ajan Android adaptive ikonuna monochrome katmanı ekledi; bu değişiklik geri
  alındı ve yalnızca öneri olarak bırakıldı.
- Gerçek cihaz veya emülatör testi yapılmadı; Google girişi, Drive yedekleme, BLE/Wi-Fi bilgisayar
  bağlantısı, dikte ve TalkBack yalnızca cihazda kesinleşir.
- Android 15/16 kenardan kenara (edge-to-edge) davranışı cihazda doğrulanmadı. Kodda
  env(safe-area-inset-*) kullanımı var; ancak targetSdk 36 ile bu davranış zorunlu olduğu için ilk
  cihaz testinde üst ve alt çubuklar kontrol edilmeli.
- Play Console erişimi, hesap türü (kişisel/kurumsal), OAuth yayın durumu ve Play'in hesaba özel
  gereksinimleri doğrulanmadı.
- Mağaza görselleri 1080x2160 ile uzun kenar kısa kenarın en fazla 2 katı kuralının tam sınırında;
  konsol uyarı verirse 1080x1920 veya 1440x2560 ile yeniden çekilmeli.

## 10. Kanıt dosyaları

- Ham test raporu: [_calisma-test-ve-yayin.md](_calisma-test-ve-yayin.md)
- API sondası: [_probe-api.mjs](_probe-api.mjs); dışa aktarım sondası: [_probe-export.mjs](_probe-export.mjs)
- Arayüz testi betiği: [2026-09-28-ui-testi.mjs](2026-09-28-ui-testi.mjs); ölçümler: [ui-testi/sonuclar.json](ui-testi/sonuclar.json)
- Tarayıcı kareleri ve ölçümleri: docs/reviews/ui-testi/ ve docs/reviews/tarayici-cikti/ klasörleri
- Güvenlik doğrulama betiği: [2026-09-28-guvenlik-dogrulama.cjs](2026-09-28-guvenlik-dogrulama.cjs)
