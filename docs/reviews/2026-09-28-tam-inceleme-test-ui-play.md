# Not Bahçesi 2.1.9 — test, UI/erişilebilirlik ve Play Store öncesi inceleme

Tarih: 28 Eylül 2026 · İncelenen sürüm: 2.1.9 (versionCode 43) · Kapsam: web (Next.js 15.5.25) + Android (Capacitor 6)

Kanıt etiketleri:
- **[ÖLÇÜLDÜ]** — komut, gerçek tarayıcı oturumu veya canlı HTTP isteğiyle doğrulandı.
- **[KOD]** — kaynak koddan saptandı, çalışma zamanında yeniden üretilmedi.
- **[DOĞRULANMADI]** — cihaz, Play Console veya üretim hesabı gerektirir.

---

## 1. Yönetici özeti

Uygulamanın görsel dili, veri akışları ve temel erişilebilirlik altyapısı iyi durumda. Gerçek tarayıcı testinde **konsol hatası, çökme veya yatay taşma çıkmadı**; "oluştur → yaz → otomatik kaydet → yenile → geri yükle" zinciri **26/27 testi geçti**.

Buna karşılık **şu an Play Store'a yüklemeyin.** Üç sebep:

1. **Canlı AI uç noktası kimlik doğrulaması yapmıyor.** Yayındaki sürüm, yereldeki güvenlik düzeltmelerini almamış. Bu doğrudan fatura/kota ve Play politika riskidir.
2. **Veri silme sayfası ve App Links doğrulama dosyası canlıda 404.** İkisi de Play formlarında ve Google ile giriş akışında zorunlu.
3. **Depoda 29+ dosya hiç commit edilmemiş** (public/, app/veri-silme/, ayar bileşenlerinin bir kısmı). Bu hem yayının yerelle uyuşmamasının kök nedeni hem de veri kaybı riskidir.

Bunlar kapandıktan sonra yapılacaklar kısa: tam açıklamayı 4000 karakterin altına indirmek, uygulama içi hesap silmeyi eklemek, Data Safety formunu gerçek akışa göre düzeltmek ve versionCode 44 ile yeni AAB üretmek.

---

## 2. Çalıştırılan testler

| Kontrol | Sonuç |
|---|---|
| npm run build (izole kopya) | Başarılı — 14 rota, ilk yük 104–260 kB |
| CAPACITOR_BUILD=1 statik dışa aktarım | Başarılı — out/ 8 sayfa |
| npx tsc --noEmit | Başarılı, 0 hata |
| npm run lint | Başarılı, 1 uyarı: AccountSettings.tsx:224 img etiketi |
| Headless Chrome sayfa denetimi (8 yükleme, mobil 390x844 + masaüstü 1440x900) | **0 konsol hatası, 0 istisna, 0 başarısız istek, 0 yatay taşma** |
| Uçtan uca akış testi (mobil) | **26 geçti / 1 kaldı** (kalan: bölüm 5, H-1) |
| axe-core WCAG 2.2 AA taraması (6 sayfa, 412x915) | 2 kritik ve birkaç ciddi bulgu — bölüm 6 |
| Canlı üretim HTTP kontrolü | /gizlilik 200 · /veri-silme 404 · /.well-known/assetlinks.json 404 · /robots.txt 404 |
| Canlı AI uç noktasına kimliksiz istek | **401 değil** — istek işlenmeye çalışıldı (bölüm 3, P0-1) |
| Palet kontrast matematiği (WCAG formülü) | Bölüm 6.1 |
| AAB incelemesi | versionCode 43 / 2.1.9, imzalı, web varlıkları güncel out/ ile aynı |

Doğrulanan iyi haberler: otomatik kaydetme, sayfa yenileme sonrası kalıcılık, 1,5 sn dolmadan sayfadan çıkınca taslağın korunması, canvas'ın içeriği çizmesi, ikinci sekmenin aynı veriyi görmesi, sürüm numaralarının (build.gradle / lib/config.ts / README / AAB) tutarlı olması, pakette API anahtarı sızıntısı olmaması, imza parolasının repoda bulunmaması, odak halkalarının (focus-visible) her sayfada çalışması ve ayar penceresinde gerçek odak tuzağı (25 Tab boyunca pencere içinde kaldı, Escape kapattı).

---

## 3. Yükleme engelleri (P0)

### P0-1 · Canlı AI uç noktası kimlik doğrulaması yapmıyor [ÖLÇÜLDÜ]

- Kimliksiz POST isteği canlı uç noktada **401 dönmüyor**; istek sağlayıcıya iletilmeye çalışılıyor (bir ölçümde 500 + "Yapay Zeka servisine bağlanılamadı", bağımsız bir ölçümde 200 + düzeltilmiş metin).
- Depodaki sertleştirilmiş sürüm (app/api/spellcheck/route.ts) kimliksiz isteği 401 ile reddediyor, hız sınırı ve SSRF koruması uyguluyor — ama **Vercel'e dağıtılmamış**. Dağıtım hâlâ 26 Eylül commit'inin kodunu çalıştırıyor.
- Etki: uç nokta herkese açık ücretsiz yapay zekâ geçidine dönüşür (kota + fatura) ve Play incelemesinde "geliştirici altyapısı üzerinden üçüncü tarafa veri aktarımı" olarak risk taşır.
- Yapılacak: public/ ve güncel kaynakları commit edip yayına alın, ardından aynı isteğin **401** döndüğünü doğrulayın. Sunucu anahtarını (GEMINI_API_KEY) döndürün.

### P0-2 · Veri silme ve App Links adresleri canlıda 404 [ÖLÇÜLDÜ]

- /veri-silme → 404, /.well-known/assetlinks.json → 404 (her ikisi de diskte var, üretimde yok).
- Etki: Play Console'daki "veri silme URL'si" alanı kırık olur; AndroidManifest'teki autoVerify=true HTTPS derin bağlantıları doğrulanamaz, Google ile giriş dönüşü tarayıcıda kalabilir.
- assetlinks.json şu an yalnızca yükleme anahtarının SHA-256'sını içeriyor. Play App Signing açıldıktan sonra **Play imzalama anahtarının parmak izi de** eklenmeli; yoksa Play'den kurulan sürümde bağlantı doğrulanmaz.

### P0-3 · Depoda izlenmeyen kritik dosyalar [ÖLÇÜLDÜ]

- git ls-files public app/veri-silme → 0 dosya. Ayrıca AccountSettings.tsx, SettingsHome.tsx, UsageGuide.tsx, Remote* bileşenleri, lib/remoteTools.ts, lib/yedekDogrula.ts, scripts/ ve docs/ altındaki çok sayıda dosya hiç commit edilmemiş.
- Etki: (a) yayına alınan sürüm ile çalışma ağacı ayrışıyor — P0-1 ve P0-2'nin kök nedeni; (b) disk arızasında bu iş kaybolur.
- Yapılacak: işi commit'leyip gönderin, sonra Vercel'i yeniden dağıtın. .gitignore yalnızca derleme çıktılarını ve .env*.local dosyalarını dışlıyor; kaynak dosyalar engellenmiyor.

---

## 4. P1 — Play öncesi kapatılması gerekenler

### P1-1 · Mağaza "Tam açıklama" metni sınırı aşıyor [ÖLÇÜLDÜ]
play-store-paketi/belgeler/03-magaza-metinleri.md içindeki tam açıklama **4117 karakter**; Play sınırı 4000. Kısa açıklama (69/80) ve uygulama adı uygun. Yaklaşık 120 karakter kısaltma gerekiyor.

### P1-2 · Uygulama içi hesap silme akışı yok [KOD]
Kodda hesabı silme çağrısı yok; veri-silme sayfası yalnızca not silme, uygulamayı kaldırma ve e-posta ile talep anlatıyor. Google ile giriş sunan bir uygulamada Play, hesabın ve ilişkili verinin **uygulama içinden** silinebilmesini bekler. E-posta kanalı tek başına yeterli değil.

### P1-3 · Data Safety beyanı ile gerçek akış uyuşmuyor [KOD]
- 04-veri-guvenligi.md "metin kullanıcının seçtiği sağlayıcıya gönderilir" diyor; oysa istekler önce geliştiricinin Vercel fonksiyonundan geçiyor (lib/config.ts → API_BASE_URL). "Geliştirici altyapısından iletilir" beyan edilmeli.
- Mağaza metnindeki "Yapay zekâ anahtarınız cihazdan dışarı çıkmaz" ifadesi yanlış: anahtar her istekte sunucu rotasına gidiyor. Ya metin düzeltilmeli ya da AI çağrıları doğrudan cihazdan sağlayıcıya yapılmalı.

### P1-4 · APK'da cleartext trafiği her alan adına açık [KOD]
AndroidManifest'te usesCleartextTraffic="true" **ve** network_security_config.xml içinde base-config cleartextTrafficPermitted="true". Ayrıca silinmiş bir Supabase projesinin adresi (zojnjnyjavftnscbnikv.supabase.co) hâlâ istisna listesinde. Tüm uç noktalar HTTPS olduğuna göre bu izinler kapatılmalı; kapattıktan sonra cihazda PC köprüsü ve yerel ağ özellikleri yeniden test edilmeli.

### P1-5 · Release paketinde küçültme ve kod gizleme kapalı [KOD]
minifyEnabled false ve ProGuard etkin değil. Açıp RemoteBridgePlugin için kural yazılmalı ve release derlemesi cihazda doğrulanmalı.

### P1-6 · Cihazda Google ile giriş riski [DOĞRULANMADI]
google-services.json içinde yalnızca web tipi (client_type 3) OAuth istemcisi görünüyor; Android istemcisi yok. Statik analizle kesinleştirilemedi. Yükleme öncesi gerçek cihazda "Google ile giriş yap → Drive yedekleme" akışı mutlaka denenmeli.

---

## 5. Test sırasında bulunan yazılım hataları

### H-1 · Bahçe yokken "İlk Ağacı Dik" sessizce hiçbir şey yapmıyor [ÖLÇÜLDÜ]
Yeniden üretim: oturum ve bahçe yokken /projeler aç → "İlk Ağacı Dik" → ad sor → Tamam.
Sonuç: bahçe 0, düğüm 0, **hiçbir uyarı yok**. Kullanıcı adını yazıp onaylıyor ve ekranda hiçbir değişiklik olmuyor (app/projeler/page.tsx:167-187 → addNode boş gardenId ile çağrılıyor).
Beklenen: ya otomatik bahçe oluşturulmalı ya "önce bir bahçe oluşturmalısınız" uyarısı ve yönlendirmesi verilmeli. Bu, uygulamanın ilk dakikasında karşılaşılabilecek bir çıkmaz.

### H-2 · Mobilde iki ikon butonunun erişilebilir adı yok [ÖLÇÜLDÜ + KOD]
app/projeler/page.tsx:841-855 — "Canvas" ve "Yeni Ağaç" butonlarının etiketi hidden sm:inline span içinde, aria-label yok. 640 px altındaki tüm telefonlarda ekran okuyucu bu butonları yalnızca "düğme" olarak okur (axe: critical, WCAG 4.1.2).

### H-3 · Geliştirme ortamı: aynı .next klasörünü paylaşan çok sayıda dev sunucusu [ÖLÇÜLDÜ]
Aynı projede birden fazla next dev çalışırken sayfalar "Cannot find module './vendor-chunks/...'" hatasıyla 500 dönüyor. Ürün hatası değil, çalışma düzeni hatası: aynı anda tek dev sunucusu çalıştırın; şüphelendiğinizde .next klasörünü silip yeniden başlatın. Bu karışıklık, temiz bir kopyada yapılan derlemenin neden başarılı olduğunu da açıklıyor.

### H-4 · Regresyon betiği çalışmıyor [ÖLÇÜLDÜ]
docs/reviews altındaki regresyon betiği "Unmocked dependency: ./degisim" hatasıyla düşüyor. Test altyapısı güncellenmeli; aksi hâlde ilerideki değişiklikler sessizce doğrulanmamış kalır.

### H-5 · Editörde makro şeridi klavyeyle kaydırılamıyor [ÖLÇÜLDÜ]
app/editor/page.tsx:897 — overflow-x-auto bölge odaklanabilir değil (axe: serious, scrollable-region-focusable). Klavye/ekran okuyucu kullanıcısı makroların devamına ulaşamaz.

### H-6 · Diğer küçük bulgular
- AccountSettings.tsx:224 — Next.js img uyarısı (LCP/optimizasyon).
- FileProvider yapılandırması (file_paths.xml) tüm harici dizini paylaşıma açıyor; yalnızca gerekli alt klasörle sınırlandırılmalı [KOD].
- README "React Flow" yazıyor; canvas sayfası özel SVG tabanlı (react-flow sınıfı yok) [ÖLÇÜLDÜ]. Dokümantasyon düzeltilmeli.

---

## 6. Arayüz ve erişilebilirlik ölçümleri

### 6.1 Kontrast (WCAG formülüyle hesaplandı)

Beyaz ve kâğıt arka plan üzerinde ölçülen oranlar (AA sınırı: normal metin 4,5 · büyük metin/ikon 3,0):

| Renk | Beyaz üzerinde | Kâğıt (#F6F3EE) üzerinde | Değerlendirme |
|---|---|---|---|
| sand-400 | 2,48 | 2,24 | **Başarısız** — placeholder, tarih ve ipucu metinlerinde kullanılıyor |
| sand-500 | 4,70 | **4,25** | Kâğıt üzerinde başarısız — ikincil metin, "Oto" etiketi, ikonlar |
| moss-500 | 4,58 | **4,13** | Kâğıt üzerinde başarısız |
| clay-600 | **4,47** | **4,04** | Sınırın altında — "AI" rozeti, vurgu metinleri |
| clay-800 | 8,50 | 7,68 | Güvenli |
| berry-500 | 4,27 | 3,85 | Hata metinlerinde berry-600 (5,78) kullanılmalı |
| moss-600 / sand-600 | 6,25 / 7,57 | 5,64 / 6,84 | Güvenli — önerilen ikincil metin tonları |

Gerçek arayüzde ölçülen iki örnek: editördeki "İmla Düzelt" makro kutusu **1,98:1** (metin #ADA396, zemin #EAE5DE) — okunamayacak kadar soluk; 12 px "AI" rozeti 4,47:1.

### 6.2 Dokunma hedefleri (WCAG 2.5.8, min 24x24; öneri 44x44)
Mobil 390 px genişlikte ölçülen en küçükler: "Dalları kapat" oku **20x20** (projeler/page.tsx:396) · düğüm eylem düğmeleri **28x28** · editör üst barı ve makro kutuları **32-40 px** yükseklik · otomatik kaydet onay kutusu **14x14** (etiket yazısı 10 px) · başlık ve ayar ikonları 36-40 px. Sayfa başına 9-23 küçük hedef ölçüldü; toplamda en sık ihlal edilen kural bu.

### 6.3 Diğer ölçümler
- **Yatay taşma:** 390 px'te normal yazıda taşma yok. Ancak %200 yazı boyutunda gizlilik sayfası 458 px, projeler 484 px taşıyor [ÖLÇÜLDÜ].
- **Kırpılma:** 412 px'te editör üst barı ve AI şeridi ekran kenarından kesiliyor; "Oto" onay kutusu kenarda kırpık görünüyor [ÖLÇÜLDÜ - ekran görüntüsü].
- **Erişilebilir ad/etiket eksikleri:** editör başlık alanı ve içerik alanı etiketsiz (yalnızca placeholder); projeler arama kutusu etiketsiz; projeler sayfasında aria-label bir span'a verilmiş (axe: aria-prohibited-attr).
- **Landmark ve başlık yapısı:** bahce_view, gizlilik ve veri-silme sayfalarında main yok; bahce_view'de h1 yok (h2 ile başlıyor); ana sayfada h1'den h3'e atlama var.
- **Odak yönetimi:** ayar penceresi açılırken odak doğru yere gidiyor ve tuzak çalışıyor; ancak kapanınca odak tetikleyici dişliye değil gövdeye düşüyor. Bahçe oluşturma penceresinde odak tuzağı yok.
- **Hareket:** kodda prefers-reduced-motion desteği **hiç yok**; tercih açıkken bile onlarca öğede geçiş ve animasyon sürüyor (WCAG 2.3.3).

### 6.4 Güçlü yönler (korunmalı)
Odak halkaları gerçekten görünür; dokunma vurgusu ve metin seçimi doğru yönetilmiş; viewport ayarı erişilebilir (maximumScale 5, yakınlaştırma engellenmemiş); lang="tr" doğru; birçok yerde role=status/alert kullanılmış; renk paleti kontrast hesaplanarak kurulmuş — bu, düzeltmeleri kolaylaştırıyor.

---

## 7. Tema önerileri

**1. Koyu tema yok — en yüksek etkili tek iyileştirme.** Kodda tek bir dark: sınıfı veya prefers-color-scheme kuralı bulunmuyor; sistem koyu tercih edildiğinde ekran görüntüleri birebir aynı kalıyor [ÖLÇÜLDÜ].

Uygulanabilir yol:
- app/globals.css içinde semantik değişkenler: --paper, --surface, --ink, --muted, --border, --branch.
- :root (açık) ve [data-tema="koyu"] (koyu) blokları; tailwind.config.js içinde darkMode: 'class'.
- Ayarlar → Yazma deneyimi → **Görünüm: Açık / Koyu / Sistem**.
- Önce sabit renkleri temizlemek gerekir: .glass içindeki rgba(255,255,255,.82), canvas düğüm renkleri, lib/branchColors.ts, Android StatusBar ve SplashScreen renkleri.

Önerilen koyu palet (zemin #14110E, kontrastlar hesaplandı): metin #EDE7DE (14,6:1) · ikincil metin #B9AFA2 (7,4:1) · vurgu moss-300 #91C39D (7,8:1) · uyarı clay-300 #EEC25C (9,6:1) · hata berry-300 #EFA6A0 (7,0:1) · kenarlık #322B23.

**2. Tek bir "ikincil metin" token'ı tanımlayın.** sand-400 kullanımını tamamen kaldırın; ikincil metin için sand-600 (kâğıtta 6,84:1), vurgu için clay-700 (5,70:1), bağlantı için moss-600 (5,64:1). Bu üç değişiklik bölüm 6.1'deki ihlallerin tamamını kapatır.

**3. Yazı boyutu ölçeği ve yüksek kontrast seçeneği** ekleyin (Küçük/Normal/Büyük); ama önce %200 büyütmedeki yatay taşmayı giderin, aksi hâlde büyük yazı arayüzü bozar.

**4. Renk körlüğü desteği.** Dal renkleri yalnızca renkle ayrışıyor; her dala kısa bir etiket veya desen ekleyin.

**5. Android kabuğunu temayla senkronlayın.** Koyu tema geldiğinde durum çubuğu ve açılış ekranı da koyu olmalı.

---

## 8. Arayüz iyileştirme önerileri (öncelik sıralı)

**P1**
1. Editör üst barı 390-412 px'te sıkışıyor ve makro şeridi kenardan kesiliyor. Üst barı sadeleştirin (kopyala/indir'i taşma menüsüne alın), kesilen şeritlere kaydırma ipucu ekleyin.
2. Otomatik kaydet kontrolünü büyütün: onay kutusu 14x14 ve etiketi 10 px. Tek dokunuşluk anahtara çevirin, hedefi en az 44 px yapın, durumu "Otomatik kaydedildi · 14:32" gibi görünür yazıyla bildirin.
3. Bahçesiz "İlk Ağacı Dik" çıkmazını kapatın (H-1).
4. Devre dışı makro kutularına neden bilgisi ekleyin: neden tıklanamadığını açıklayan kısa metin ve "Anahtar ekle" kısayolu; devre dışı metin de okunabilir kontrastta olmalı.

**P2**
5. İkon-only butonlara aria-label ekleyin (H-2) ve tüm ikon butonlarını en az 44x44 hedefe çıkarın.
6. Editör başlık/içerik alanları ile projeler arama kutusuna görünmez etiket ekleyin.
7. bahce_view, gizlilik ve veri-silme sayfalarına main ekleyin; bahce_view'e h1 verin; ana sayfadaki başlık atlamasını düzeltin.
8. prefers-reduced-motion desteği ekleyin (Tailwind motion-reduce varyantı + framer-motion useReducedMotion).
9. Modal kapandığında odağı açan öğeye geri verin; bahçe oluşturma penceresine de odak tuzağı ekleyin (ayar penceresindeki desen kullanılabilir).
10. Boş durumlarda yönlendirmeyi netleştirin: /projeler boş ekranı "Bahçeniz hazır" diyor ama bahçe seçilmemişken çalışmıyor; burada "Bahçe oluştur" çağrısı gösterin.

**P3**
11. 10-11 px metinleri en az 12 px'e çıkarın ("Oto", "Kök Düşünce", chip etiketleri).
12. Uzun sayfalarda (gizlilik, veri silme) içindekiler listesi ve "yukarı dön" ekleyin.
13. Mağaza için tablet (7"/10") ekran görüntüleri ekleyin; mevcut 4 telefon görseli 1080x2160 ölçüsünde uygun.

---

## 9. Play Store'a yüklemeden önce — sıralı kontrol listesi

**A. Şimdi (yükleme engeli)**
1. Tüm çalışma ağacını commit'leyip main'e gönderin; Vercel'i yeniden dağıtın.
2. Dağıtım sonrası doğrulayın: /veri-silme 200 · /.well-known/assetlinks.json 200 · AI uç noktası kimliksiz istekte 401.
3. GEMINI_API_KEY'i döndürün; Vercel'de sunucu anahtarını açan bayrak tanımlı olmasın.
4. Play App Signing sertifikasının SHA-256'sını assetlinks.json'a ekleyip yeniden dağıtın.
5. Uygulama içi "Hesabımı ve verilerimi sil" akışını ekleyin (Play zorunluluğu).
6. Tam açıklamayı 4000 karakterin altına indirin; "anahtar cihazdan çıkmaz" ifadesini düzeltin.
7. Data Safety formunu gerçek akışa göre güncelleyin (AI isteği geliştirici altyapısından geçiyor).

**B. Yükleme günü**
8. versionCode 44 ve uygun versionName'e yükseltin; lib/config.ts ve README'yi eşitleyin.
9. npx cap sync android → gradlew bundleRelease ile yeni AAB üretin (Play yalnızca AAB kabul eder).
10. minifyEnabled true + ProGuard kuralı ekleyin; cleartext trafiği kapatın; ardından cihazda PC köprüsü, Bluetooth ve dikte akışlarını tekrar test edin.
11. Release AAB'yi önce kapalı test kanalına yükleyin; gerçek cihazda Google girişi, Drive yedekleme ve ilk açılış turunu yapın.

**C. Play Console**
12. İçerik derecelendirme anketi, hedef kitle ve yaş beyanı, reklam/analitik beyanı (uygulamada reklam ve üçüncü taraf analitik yok).
13. Gizlilik politikası URL'si (/gizlilik 200) ve veri silme URL'si (düzeltilmeli).
14. BT ve mikrofon izinleri için gerekçeleri netleştirin: BLUETOOTH_SCAN ve BLUETOOTH_CONNECT (PC köprüsü), RECORD_AUDIO (dikte), ACCESS_FINE_LOCATION (yalnızca API 30 altı, neverForLocation işaretli). Play incelemesi bu izinler için açıklama isteyebilir.
15. Kişisel geliştirici hesabıysa ilk yayın öncesi kapalı test kuralını Console'da teyit edin (genellikle 12 test kullanıcısı / 14 gün; hesap türüne göre değişir).

**D. Bu incelemede doğrulanamayanlar**
16. TalkBack ile gerçek cihaz turu, Android 15/16 edge-to-edge davranışı, Play imzalı kurulum ve Drive izin akışı test edilemedi.

---

## 10. Kanıt dosyaları

- Tarayıcı denetim betiği: docs/reviews/2026-09-28-tarayici-testi.cjs (rapor: tarayici-cikti/rapor.json, 10 ekran görüntüsü)
- Uçtan uca akış betiği: docs/reviews/2026-09-28-akis-testi.cjs (rapor: tarayici-cikti/akis-rapor.json, 6 ekran görüntüsü)
- axe-core ve UI ölçüm betiği: docs/reviews/2026-09-28-ui-testi.mjs (ham veri: docs/reviews/ui-testi/sonuclar.json, 21 ekran görüntüsü)
- Derleme ve yayın denetimi: docs/reviews/_calisma-test-ve-yayin.md
- Canlı API ve rota doğrulaması: docs/reviews/_probe-api.mjs

Bu inceleme sırasında uygulama kaynak kodu değiştirilmedi; yalnızca test betikleri, ekran görüntüleri ve bu rapor eklendi. Önceden var olan değişiklikler korundu.

