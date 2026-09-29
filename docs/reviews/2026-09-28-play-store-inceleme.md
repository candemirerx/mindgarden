# Not Bahçesi — Play Store öncesi kapsamlı inceleme

Tarih: 28 Eylül 2026 • İncelenen durum: mevcut, kaydedilmemiş değişiklikler de içeren çalışma ağacı • İnceleme anındaki sürüm: 2.1.8 / 42 • Düzeltmelerden sonraki sürüm: 2.1.9 / 43

## Yönetici özeti

**Önerim: mevcut durumu genel kullanıma yayımlamayın.** Başlıca gerekçe görsel tasarım değil; notların kaybolmasına, eski içerikle değiştirilmesine veya kaydedilmediği hâlde kaydedilmiş gösterilmesine yol açabilecek veri bütünlüğü sorunlarıdır. AI uç noktasının erişim ve hedef adres kontrolleri, veri silme davranışı ve Android yayın denetimi de tamamlanmalıdır. Bu değerlendirme bir Play Store ret kararı veya mevzuat uygunluk sertifikası değildir.

Rapor 26 bulgu içerir: **11 P1, 12 P2, 3 P3**. P1'ler yayın öncesi kapatılmalı; P2'ler en geç geniş dağıtımdan önce giderilmeli veya ilgili özellik güvenli biçimde sınırlandırılmalıdır. Birden çok bulgu aynı mimari eksikliğin farklı sonuçlarıdır; sayılar bağımsız güvenlik açığı sayısı değildir.

Bu sürümdeki düzeltmelerin regresyon karşılıkları: `docs/reviews/probes-a.cjs`
(editör kalıcılığı, misafir→hesap aktarımı), `probes-b.cjs` (eşitleme ve çakışma),
`probes-c.cjs` (yedek içe aktarma doğrulaması), `probes-d.cjs` (yapay zekâ uç noktası)
ve `scripts/ayarlar-tur.mjs` (ayarlar arayüzü duman testi).

En önemli sonuçlar:

- Otomatik kayıtta sayfadan çıkış, depolama hatası ve eşitleme çakışması senaryoları not güvenilirliğini zedeliyor.
- İçe aktarmada önce mevcut verinin silinmiş işaretlenmesi, sonra doğrulanmamış dosyanın işlenmesi güvenli değil.
- Sunucudaki AI proxy kimlik doğrulama/kota uygulamıyor; özel sağlayıcı adresinin filtrelenmesi atlatılabiliyor.
- Silinen not içeriği yerel kayıtlarda ve eşitleme verisinde kalıyor; kullanıcıya verilen silme açıklamasıyla uyumsuz.
- Android `lintRelease` inceleme anında **11 hata, 29 uyarıyla başarısız olmuştu**; düzeltmelerden sonra **0 hata, 28 uyarı** ile geçiyor (bkz. Düzeltme durumu). Sürüm/dağıtım tutarlılığı (11) ve yayındaki web sayfaları ise hâlâ açık.

## Düzeltme durumu (2.1.9 çalışması)

Bu incelemeden sonra uygulanan düzeltmeler ve kalan işler:

**Bu turda kapatıldı**

- **01 (editörden çıkışta veri kaybı):** revizyon sayaçlı kayıt, çıkışta bekleyen kaydı tamamlama, arka plana/geri tuşuna karşı senkron yerel taslak ve yeniden açılışta taslak geri yükleme eklendi. Kayıt başarısızsa arayüzde uyarı çıkıyor, belge kirli kalıyor.
- **02 (sessiz depolama hatası):** `writeDatabase` artık hatayı yutmuyor; yazma işlemleri `error` döndürüyor. Yalıtılmış testte kota hatası artık görünür hata üretiyor (eskiden `error:null` dönüyordu).
- **06 ve 07 (AI uç noktası):** **Bu bulgular rapor yazıldıktan sonra kodda kapatılmış; doğrulandı.** Çalışma ağacındaki rota; kimliksiz istekte sunucu anahtarını kullanmıyor (401), hız sınırı uyguluyor (429), gövde boyutu ve sağlayıcı listesi denetliyor, özel hedef adresini HTTPS + DNS çözümlemesi + IPv4-eşlemeli IPv6 denetimiyle sınıyor ve yönlendirmeleri izlemiyor. Yeni doğrulama betiği 5/5 geçti: [guvenlik-dogrulama](C:/projelerim/notbahcesi/docs/reviews/2026-09-28-guvenlik-dogrulama.cjs). **Kalan iş:** bu rota üretime (Vercel) dağıtılmadı; yayındaki sürüm eski olabilir.
- **10 (Android yayın denetimi):** `:app:lintRelease` artık **0 hata, 28 uyarı** ile başarılı. Bluetooth çağrıları için çalışma zamanı izin denetimi + gerekçeli `@SuppressLint`, API 23 altı için `connectGatt` geri dönüşü, özel şema derin bağlantısından `autoVerify` kaldırılması ve `allowBackup="false"` uygulandı.
- **12 (AI sonucu beklerken belge değişirse):** sonuç artık sessizce uygulanmıyor; "Yine de uygula / Vazgeç" seçeneği sunuluyor.
- **13 (anahtar ayarı anında etkinleşmiyor):** anahtar/sağlayıcı değişiklikleri `ai-tercih` olayıyla yayınlanıyor; editör sayfa yeniden açılmadan makro düğmelerini güncelliyor.
- **14 (silinen eski anahtarın geri gelmesi):** tek seferlik taşıma sonrası eski anahtar alanları siliniyor; anahtar temizlendiğinde yeniden oluşmuyor.
- **11 (sürüm tutarlılığı):** kaynak (`lib/config.ts`, `package.json`, `android/app/build.gradle` → 2.1.9 / 43), dağıtım paketi (`uygulama/not-bahcesi-2.1.9.aab`) ve tüm mağaza belgeleri aynı sürümü gösteriyor. Belge üreteci sürümü artık kaynak koddan okuyor (`scripts/md-to-html.mjs`) ve denetim betiği **13/13** geçiyor: `node scripts/yayin-dogrula.mjs`. **Kalan iş:** web sitesinin yeniden dağıtılması ve Play Console'a yükleme.
- **Diğer:** Android otomatik bulut yedeklemesi kapatıldı ve gizlilik/veri silme metinleri bu davranışa göre güncellendi.

**Sonraki turda kapatıldı (2.1.9 devamı)**

- **03 (içe aktarma doğrulaması) ve 18 (alan bütünlüğü):** yedek artık hiçbir şey yazılmadan önce tümüyle doğrulanıyor (`lib/yedekDogrula.ts`): şema ve tipler, kimlik tekilliği, bahçe ve üst-not bütünlüğü, döngü tespiti, derinlik ve boyut sınırları. "Değiştir" akışı önce yedeği yazar, eski kayıtları ancak yazma başarılı olursa siler; hata olursa yalnızca bu aktarmada eklenen kayıtlar geri alınır. İçe aktarma artık `color` ve `is_pruned` alanlarını taşıyor; döngüde `RangeError` üreten özyinelemeli `getNodeLevel` yerine yinelemesiz seviye hesabı kullanılıyor. Doğrulama: `probes-c`.
- **08 (silinen içerik):** yerel modda silinen kaydın metni zaten temizleniyordu; hesap (Supabase) yolunda da silme işlemi içeriği aynı güncellemede boşaltıyor. Eşitleme yalnızca asgari tombstone (kimlik + silme damgası) taşıyor.
- **09 (misafirden hesaba taşıma):** misafir oturumunda oluşturulan bahçe ve notlar hesaba geçişte tek geçişte yeni sahibe aktarılıyor; yazma başarısız olursa giriş iptal edilir ve notlar misafir oturumunda görünmeye devam eder. Yalnızca misafir kayıtları taşınır; iki hesap birbirinin verisini görmez. Doğrulama: `probes-a`.
- **19 (onay penceresi):** odaktan bağımsız Enter kısayolu kaldırıldı (artık odaklanan düğme çalışır), varsayılan odak İptal'de, Tab odağı pencere içinde tutuyor, kapanınca odak çağıran denetime dönüyor.
- **24 (kılavuz/arayüz uyumu):** ayarlar bölüm başlıkları giriş ekranındaki menü adlarıyla birebir hizalandı; kılavuzdaki yanlış yönlendirmeler düzeltildi.
- **Ayarlar arayüzü cilası:** başlık/kart/alan düzeni ve tema belirteçleri tek desene çekildi; Android 13+ temalı simge (`<monochrome>`) eklendi.

**Kısmen / devam eden**

- **04 ve 05 (eşitleme):** alan bazlı üç yönlü birleştirme, çakışma kopyası ve seri eşitleme kuyruğu uygulandı (`probes-b` 5/5). Koşullu yazma (ETag) ve `text_updated_at` alanını store tarafında doldurma **hâlâ açık**.
- **16 (bağımlılık kayıtları: jspdf/handlebars/tar), 20 (performans), 21, 22, 25:** açık. 12, 13, 14, 19 ve 24 kapalı.

**Bu turda yapılan doğrulamalar:** `npx tsc --noEmit` temiz; `probes-a`, `probes-b`, `probes-c`, `probes-d` geçti; yayın kapısı `node scripts/yayin-dogrula.mjs` **13/13**; `:app:lintRelease` **0 hata**; ayarlar arayüzü tarayıcı turu 11/11, onay penceresi turu 5/5. Üretim AAB'si (`not-bahcesi-2.1.9.aab`, 6.009.488 bayt) yeniden üretildi: manifest 2.1.9 / 43, `com.notbahcesi.app`, içindeki `assets/public/index.html` kaynak çıktısıyla birebir aynı, imza geçerli. Ölçüm/gerçek cihaz senaryoları (kota, iki cihazlı eşitleme, izin reddi) hâlâ ayrıca test edilmeli.

## Kapsam ve yöntem

Next.js 15.5.25 / React 18 arayüzü, Zustand durumu, yerel veri istemcisi, koşullu Supabase kullanımı, Google Drive eşitlemesi, AI sunucu rotası, içe/dışa aktarma, ayarlar/yardım akışları, Android manifesti ve özel Bluetooth/PC/dikte köprüsü incelendi. SQL şemaları, bağımlılıklar, testler ve mağaza hazırlık belgeleri de kapsama alındı. `app`, `components`, `lib` altındaki kaynak envanteri 48 TS/TSX/CSS dosyası ve 13.256 satırdır; Android ve yardımcı betikler bu sayıya dahil değildir. Üretilmiş dosyalar ve üçüncü taraf kütüphaneler satır satır denetlenmedi.

Kanıt etiketleri:

- **Doğrulandı:** komut, salt okunur HTTP kontrolü veya gerçek kaynak üzerinde yalıtılmış test sonucu.
- **Koddan saptandı:** ilgili kontrol akışında sorun/risk var; gerçek cihaz veya üretim hesabında uçtan uca yeniden üretim yapılmadı.
- **Doğrulama gerekli:** cihaz, üretim yapılandırması veya Play Console erişimi gerektiriyor.

Bu çalışma sırasında uygulama kaynakları düzeltilmedi, APK kurulmadı, Drive'a yazılmadı, gerçek AI anahtarıyla istek yapılmadı. Sadece inceleme belgeleri/test betiği eklendi ve tanılama çıktıları üretildi. Önceden var olan değişiklikler korundu.

### Çalıştırılan kontroller

- `npx tsc --noEmit --incremental false`: başarılı.
- `npm run lint`: başarılı; `AccountSettings` içinde bir `<img>` uyarısı var. `next lint` kullanımı ayrıca artık önerilmiyor.
- `python -B -m unittest discover -s scripts -p test_pc_clipboard_helper.py -v`: 1 test başarılı; sahte pano/loopback ortamı.
- `node docs/reviews/2026-09-28-probes.cjs`: 8 yalıtılmış davranış testi başarılı; burada “başarılı”, **raporlanan hatalı davranışın yeniden üretildiği** anlamındadır, uygulamanın sağlıklı olduğu anlamına gelmez.
- `npm audit --omit=dev --json`: 24 etkilenen paket; 3 critical, 14 high, 6 moderate, 1 low. Bunlar danışma kaydı/bağımlılık sonuçlarıdır; 24 sömürülebilir uygulama açığı göstermez.
- Android `:app:lintRelease`: başarısız; 8 `MissingPermission`, 1 `NewApi`, 2 `AppLinkUrlError` hatası; toplam 29 uyarı.
- Salt okunur canlı HTTP kontrolü: `/gizlilik` 200; `/veri-silme` 404; `/.well-known/assetlinks.json` 404.

Yalıtılmış testler gerçek TypeScript kaynaklarını geçici bellek ortamında çalıştırır; sahte `localStorage` ve sahte sağlayıcı yanıtları kullanır. Sekiz kanıt: sessiz kota hatası, silinen içeriğin korunması, misafir notlarının hesap geçişinde görünmez olması, silinen eski API anahtarının geri gelmesi, görünüm değişikliğinin yeni metni yenmesi, IPv4-mapped IPv6 filtre geçişi, kimliksiz AI isteğinin sahte sağlayıcıya ulaşması, döngülü içe aktarma ağacında `RangeError`.

Kaynaklar: [yeniden üretim betiği](C:/projelerim/notbahcesi/docs/reviews/2026-09-28-probes.cjs), [Android lint metni](C:/projelerim/notbahcesi/android/app/build/reports/lint-results-release.txt), [Android lint HTML](C:/projelerim/notbahcesi/android/app/build/reports/lint-results-release.html). Build raporları sonraki derlemelerde değişebilir; buradaki sonuçlar inceleme tarihine aittir.

## P1 — Yayından önce giderilmesi gerekenler

### 01. Editörden hızlı çıkış son değişiklikleri kaybedebilir — **DURUM: düzeltildi (2.1.9)**

**Kanıt: koddan saptandı.** [Editör](C:/projelerim/notbahcesi/app/editor/page.tsx:118) kaydı 1,5 saniye geciktiriyor; effect temizliği zamanlayıcıyı iptal ediyor. `handleClose`, otomatik kayıt açıkken bekleyen kaydı tamamlamadan geri gidiyor. [Android geri işlemi](C:/projelerim/notbahcesi/components/mobile/MobileShell.tsx:29) de editöre özel kayıt kapısından geçmiyor. Ayrıca devam eden kayıt bitince, bu sırada yeni yazılmış bir revizyon olsa bile `hasChanges` temizlenebiliyor.

**Etki:** yazıp hemen geri çıkan kullanıcı son cümlesini kaybedebilir; “kaydedildi” bilgisi güncel metni temsil etmeyebilir.

**Öneri:** revizyon numaralı kalıcı kayıt kuyruğu; uygulama içi çıkışlarda bekleyen kaydı tamamlama; arka plana geçişte güvenli yerel taslak kaydı. Yalnızca kaydedilen revizyonu temiz kabul edin.

**Kabul:** yazdıktan 100 ms sonra üst geri/Android geri/arka plan senaryolarında son içerik korunmalı; yavaş kayıt sırasında yazılan yeni metin kirli kalmalı ve ardından kaydedilmeli.

### 02. Depolama başarısız olsa bile başarılı kayıt bildiriliyor — **DURUM: düzeltildi (2.1.9)**

**Kanıt: doğrulandı.** [Yerel yazıcı](C:/projelerim/notbahcesi/lib/localClient.ts:85) `setItem` hatasını yakalayıp çağırana başarısızlık döndürmüyor. Insert/update işlemleri `error:null` üretebiliyor. [Store](C:/projelerim/notbahcesi/lib/store/useStore.ts) ve editör hata bilgisini kullanıcıya güvenilir biçimde taşıyamıyor. Bozuk JSON okumasının boş veritabanı gibi ele alınması da kurtarma yerine üzerine yazma riski yaratıyor.

**Etki:** kota dolması veya depolama erişim sorunu sırasında kullanıcı kaydedildiğini sanıyor; uygulamayı yeniden açınca eski metin geliyor.

**Öneri:** yazma sonucu/istisnasını tüm katmanlara taşıyın; başarısız kayıtta taslağı koruyup kalıcı hata gösterin. Bozuk veriyi karantinaya alın; sessizce sıfırlamayın. İşlemsel IndexedDB/SQLite geçişini planlayın.

**Kabul:** zorlanan kota hatasında “kaydedildi” görünmemeli; veri geri alınabilmeli. Bozuk depo otomatik olarak boş veritabanıyla değişmemeli.

### 03. “Değiştirerek içe aktar” doğrulama tamamlanmadan mevcut veriyi siliyor — **DURUM: düzeltildi (2.1.9, doğrulandı: probes-c)**

**Kanıt: koddan saptandı; döngü hatası doğrulandı.** [Dosya kabulü](C:/projelerim/notbahcesi/components/editor/DataSection.tsx:717) yalnızca temel alanların varlığına bakıyor. [Değiştirme akışı](C:/projelerim/notbahcesi/components/editor/DataSection.tsx:745) mevcut kayıtları silinmiş işaretledikten sonra içe aktarıyor. [Seviye hesabı](C:/projelerim/notbahcesi/components/editor/DataSection.tsx:850) döngü tespiti olmadan özyineleme yapıyor; döngülü ebeveyn ilişkisi `RangeError` üretiyor.

**Etki:** bozuk dosya, yarım içe aktarma ve eski notların görünmez olması; silme işaretlerinin eşitlemeye taşınması mümkün.

**Öneri:** sürümlü şema, boyut sınırı, alan/kimlik/ebeveyn/bahçe bütünlüğü ve döngü denetimini değişiklikten önce tamamlayın. Hazırlık alanında yükleyip tek işlemle değiştirin; kurtarma kopyası ve açık onay sunun.

**Kabul:** bozuk JSON, yanlış tip, döngü, eksik ebeveyn, yinelenen ID ve ortada yazma hatası durumlarının tamamında eski veri birebir korunmalı.

### 04. Eşitlemede görünüm değişikliği daha yeni not metnini ezebiliyor — **DURUM: düzeltildi (2.1.9, doğrulandı: probes-b)**

**Kanıt: doğrulandı.** [Kazanan seçimi](C:/projelerim/notbahcesi/lib/driveSync.ts:363) tüm satırı tek `updated_at` üzerinden seçiyor. Aç/kapat, konum veya renk gibi değişiklikler de aynı satır zamanını etkiliyor.

**Senaryo:** A cihazı 10:00'da metni değiştirir. B cihazı eski metinle 10:01'de dalı açar. B'nin tüm satırı kazanır; A'nın yeni metni kaybolur. Yalıtılmış test bu sonucu üretti. [Drive yazımı](C:/projelerim/notbahcesi/lib/driveSync.ts:318) ayrıca koşulsuz PATCH kullanıyor; eşzamanlı istemciler aynı yedeği farklı kopyalarla değiştirebilir.

**Öneri:** içerik ve görünüm revizyonlarını ayırın; çatışma kopyası/değişiklik günlüğü kullanın. Uzak yazımda servis tarafından desteklenen sürüm önkoşulu veya yeniden okuyup uzlaştırma protokolü uygulayın.

**Kabul:** iki cihazda çevrimdışı metin+görünüm değişiklikleri hiçbir metni sessizce atmamalı; aynı anda yapılan yüklemeler tekrar birleştirilmeli veya kullanıcıya çatışma gösterilmeli.

### 05. Eşitleme sürerken yapılan değişiklikler yeniden eşitleme kuyruğuna alınmıyor — **DURUM: düzeltildi (2.1.9, doğrulandı: probes-b)**

**Kanıt: koddan saptandı.** [Birleştirme](C:/projelerim/notbahcesi/lib/driveSync.ts:510) bir anlık görüntü topluyor; [abonelik](C:/projelerim/notbahcesi/lib/driveSync.ts:578) `merging` sırasında tüm olayları atlıyor. Ağ isteği sırasında gelen yeni değişiklikler için nesil sayacı/tekrar koşusu yok. Manuel ve otomatik çağrıların ortak seri kuyruğu da bulunmuyor.

**Etki:** ekranda yapılan değişikliğin uzak yedeğe gitmemesi; yenilemeyle güncel olmayan görünüm; sonraki eşitlemelerde zor anlaşılır farklılıklar.

**Öneri:** hesap kimliğine bağlı tek çalışan kuyruk, değişiklik sayacı, yeniden çalışma bayrağı ve iptal edilen hesap oturumu denetimi kurun. Yerel güncel revizyonu eski snapshot ile değiştirmeyin.

**Kabul:** geciktirilmiş yükleme sırasında yapılan 20 değişiklik sonraki koşuda eşitlenmeli; hesap değişiminde eski iş yeni hesaba uygulanmamalı.

### 06. Özel AI sunucusu adresinde SSRF engeli yeterli değil — **DURUM: kodda kapatıldı, dağıtım bekliyor**

**Kanıt: filtre atlatması doğrulandı; üretim sömürüsü denenmedi.** Uyarı: aşağıdaki açıklama inceleme anındaki kodu yansıtır. Rapor yazıldıktan sonra rota sertleştirildi: yalnız HTTPS kabul ediliyor, alan adının tüm A/AAAA kayıtları özel/ayrılmış aralık denetiminden geçiyor, IPv4-eşlemeli IPv6 ve NAT64/6to4 gömülü adresler yakalanıyor, sağlayıcı çağrıları `redirect: 'manual'` ile yönlendirmeyi reddediyor. Yeni doğrulamada loopback, IPv4-eşlemeli IPv6 ve `http://` hedefleri 400 döndü ve sağlayıcıya hiç istek gitmedi.

**Etki:** saldırgan kontrollü adreslerin sunucudan iç/yerel ağ hedeflerine istek üretmesi mümkün olabilir. Üretim ağındaki erişilebilir hedefler doğrulanmadı.

**Öneri:** mümkünse sağlayıcı izin listesi; özel hedef gerekliyse HTTPS zorunluluğu, tüm A/AAAA sonuçlarında özel/loopback/link-local adres engeli, yönlendirmeleri kapatma veya her adımı yeniden doğrulama ve ağ düzeyinde çıkış kısıtı.

**Kabul:** IPv6 eşlemeleri, localhost varyantları, DNS özel IP çözümlemesi ve public→private yönlendirme testlerinin tamamı sağlayıcıya ulaşmadan reddedilmeli.

### 07. AI proxy kimliksiz ve sınırsız kullanılabiliyor — **DURUM: kodda kapatıldı, dağıtım bekliyor**

**Kanıt: sahte sağlayıcıyla doğrulandı.** Uyarı: aşağıdaki açıklama inceleme anındaki kodu yansıtır. Rota sonradan sertleştirildi: gövde boyutu sınırı, sağlayıcı izin listesi, IP başına hız sınırı (120 istek / 10 dk) ve sunucu anahtarının yalnızca doğrulanmış oturumda kullanılması eklendi. Doğrulamada kimliksiz istek 401 döndü ve sağlayıcı çağrısı yapılmadı; 130 istek sonrası 429 alındı.

**Etki:** sunucu maliyeti/kaynak tüketimi; sunucu anahtarı varsa üçüncü kişilerin ücretli kullanım oluşturması. Özel hedef desteğiyle birlikte risk büyüyor.

**Öneri:** doğrulanmış oturum, kullanıcı ve ağ bazlı hız/kota sınırı, JSON ayrıştırılmadan önce gövde boyutu sınırı, çalışma süresi sınırı ve şema doğrulaması. Anonim istekte ortak ücretli anahtara düşmeyin.

**Kabul:** yetkisiz istek sağlayıcı çağrısı yapmadan reddedilmeli; boyut ve kota aşımı tanımlı 4xx üretmeli; kayıtlar not metni/anahtar içermemeli.

### 08. Veri silme açıklaması gerçek saklama davranışıyla uyumsuz — **DURUM: düzeltildi (2.1.9, doğrulandı: probes-a/b)**

**Kanıt: içerik korunması doğrulandı.** [Silme açıklaması](C:/projelerim/notbahcesi/app/veri-silme/page.tsx) cihazdan hemen kaldırma izlenimi veriyor; [store silmesi](C:/projelerim/notbahcesi/lib/store/useStore.ts) içeriği temizlemeden silinmiş işareti bırakıyor. [Eşitleme toplaması](C:/projelerim/notbahcesi/lib/driveSync.ts:272) silinmiş kayıtları da taşıyor. Android yedeklemesi açık; kaldırıp yeniden yüklemenin mutlaka boş başlangıç getireceği varsayılamaz.

**Etki:** kullanıcının silindiğini düşündüğü not saklanmaya devam ediyor. Hesap silme, yerel not silme, Google bağlantısını kaldırma ve Drive yedeğini silme birbirinden ayrılmamış.

**Öneri:** eşitleme için yalnızca asgari ID/revizyon tombstone tutun; içerik temizleme ve saklama süresi tanımlayın. Kullanıcıya gerçek kapsamı açıklayın; hesap açılan backend için hesap/veri silme akışını ve destek sürecini tamamlayın. Data Safety formunu gerçek davranışa göre doldurun.

**Kabul:** silme sonrasında yerel/uzak payload'da not içeriği bulunmamalı veya açıkça ilan edilmiş süre sonunda temizlenmeli; eski cihazdan not dirilmemeli. Hesap silme süreci uçtan uca kanıtlanmalı.

### 09. Misafirden Google hesabına geçince notlar görünmez oluyor — **DURUM: düzeltildi (2.1.9, doğrulandı: probes-a)**

**Kanıt: doğrulandı.** [Google profil oturumu](C:/projelerim/notbahcesi/lib/localClient.ts:540) aktif sahip kimliğini değiştiriyor, misafir bahçelerini aktarmıyor. [Sahip filtresi](C:/projelerim/notbahcesi/lib/localClient.ts:196) eski kayıtları dışarıda bırakıyor. Testte depoda 1 bahçe kalmasına rağmen görünür bahçe sayısı 0 oldu.

**Etki:** ilk kez giriş yapan kişi notlarını kaybettiğini düşünüyor; yerel notlar yeni hesabın yedeğine de katılmıyor.

**Öneri:** açık onaylı, işlemsel misafir→hesap taşıma akışı. Sadece mevcut misafir verisini taşıyın; başka kullanıcıların kayıtlarını birleştirmeyin. Hesap değişiminde veri kapsamını görünür kılın.

**Kabul:** misafir notu oluştur→giriş→yeniden aç→eşitle akışında tüm notlar korunmalı; iki farklı hesap birbirinin özel notlarını görmemeli.

### 10. Android yayın denetimi başarısız; eski cihaz uyumluluğu ve bağlantı tanımları sorunlu — **DURUM: düzeltildi (2.1.9, lint 0 hata)**

**Kanıt: doğrulandı.** [Native köprü](C:/projelerim/notbahcesi/android/app/src/main/java/com/notbahcesi/app/RemoteBridgePlugin.java:207), minSdk 22 iken API 23 gerektiren dört parametreli `connectGatt` çağırıyor; sürüm koruması yok. Bu uyumsuzluk API 22'de BLE bağlantısında çalışma zamanı hatası riski oluşturur; `catch(Exception)` tüm linkage hatalarını kapsamaz.

Sekiz izin hatası da var. Kodda özel izin yardımcısı bulunması nedeniyle bunların her birini kanıtlanmış çökme diye nitelemiyorum; asenkron callback/izin geri alma yolları dahil incelenmeli. [Manifest](C:/projelerim/notbahcesi/android/app/src/main/AndroidManifest.xml:26) özel `notbahcesi://auth` şemasına `autoVerify` uyguladığı için ayrıca iki App Link hatası veriyor.

**Öneri:** API 22 fallback veya bilinçli minimum sürüm kararı; izin kontrollerini araçların da tanıyacağı biçimde düzenleme ve `SecurityException` yönetimi; özel scheme ile HTTPS App Link filtrelerini ayırma. Hataları topluca bastırmak çözüm değildir.

**Kabul:** `lintRelease` sıfır hata; API 22/23 ve Android 12+ üzerinde izin reddi/geri alma testleri; geçerli HTTPS link doğrulaması.

### 11. Kaynak, AAB, web yayını ve mağaza belgeleri aynı sürümde değil — **DURUM: kaynak/AAB/belgeler hizalandı (2.1.9 / 43); web yayını doğrulaması bekliyor**

**Kanıt: dosya envanteri ve canlı HTTP ile doğrulandı.** [Gradle](C:/projelerim/notbahcesi/android/app/build.gradle:18) ve uygulama sürüm bilgisi 2.1.8/42 iken dağıtım paketindeki AAB `not-bahcesi-2.1.7.aab`; bazı belgeler 41 kodunu taşıyor. İncelemede yeni imzalı AAB oluşturulmadı veya Play Console'a yüklenmedi.

[Veri silme adresi](https://mindgarden-neon.vercel.app/veri-silme) ve [assetlinks](https://mindgarden-neon.vercel.app/.well-known/assetlinks.json) kontrol anında 404. Gizlilik sayfası 200; Vercel bilgisi içeriyor, ancak yerel dosyalarla aynı yayın olduğu varsayılamaz.

**Etki:** yanlış sürüm yükleme, çalışmayan mağaza yardım/silme bağlantısı ve doğrulanmayan Android web bağlantıları.

**Öneri:** tek sürüm manifestinden belgeler ve derleme üretimi; düzeltmelerden sonra imzalı yeni AAB, hash ve paket/sürüm kontrolü. Web sayfalarını yayınlayıp doğrulayın. Assetlinks için Play App Signing sertifikasıyla upload sertifikasını karıştırmayın.

**Kabul:** kaynak, AAB manifesti ve Console versionCode eşleşmeli; gerçek mağaza bağlantıları 200 dönmeli; Play imzalı kurulumda giriş/deep link çalışmalı. Hedef SDK ve ilgili mağaza beyanları Console'da ayrıca doğrulanmalı.

## P2 — Geniş dağıtımdan önce ele alınması gerekenler

### 12. Geciken AI cevabı kullanıcı düzenlemesini değiştirebiliyor

**Kanıt: koddan saptandı.** [AI akışı](C:/projelerim/notbahcesi/app/editor/page.tsx:313) istek başındaki metni kullanıyor; kullanıcı beklerken yazmaya devam edebiliyor. Sonuç geldiğinde güncel metin yerine eski snapshot tabanlı sonuç uygulanabiliyor. `pendingSpellCheck` otomatik kayıt koşulundan ayrılmadığından, zaten kirli olan belgede onaylanmamış önizleme de kayda girebilir.

**Öneri:** AI çıktısını ayrı taslak/önizleme durumunda tutun; belge revizyonu değişmişse karşılaştırmalı uygulama isteyin. **Kabul:** istek sırasında yazılan içerik korunmalı; “reddet” denilen sonuç kalıcı kayda hiç girmemeli.

### 13. API anahtarı ayarı editörde anında etkinleşmiyor

**Kanıt: koddan saptandı.** [Anahtar varlığı](C:/projelerim/notbahcesi/app/editor/page.tsx:194) yalnızca ilk açılışta okunuyor. Aynı editörden ayara girip anahtar eklemek makro düğmelerinin devre dışı durumunu güncellemiyor; [değişim bildirimi](C:/projelerim/notbahcesi/lib/degisim.ts) AI tercihlerini kapsamıyor.

**Öneri:** anahtar/sağlayıcı durumunu reaktif ortak tercih deposuna alın; hassas değeri bileşenler arasında gereksiz taşımayın. **Kabul:** anahtar ekleme/silme ve sağlayıcı değiştirme, sayfayı yeniden açmadan düğmeleri doğru güncellemeli.

### 14. Silinen eski AI anahtarı yeniden oluşabiliyor

**Kanıt: doğrulandı.** [Anahtar geçişi](C:/projelerim/notbahcesi/lib/aiProvider.ts:67) sağlayıcı anahtarı yoksa eski ortak anahtarı yeniden kopyalıyor. Temizleme yalnızca yeni anahtarı kaldırıyor. Anahtarlar ayrıca hesap kapsamlı değil; çıkış yapılması tüm bu ayarları temizlemiyor.

**Öneri:** tek seferlik sürümlü migrasyon; silmede ilgili eski alanları da temizleme; cihazda saklama ve çıkış davranışını açıkça tanımlama. **Kabul:** eski sürümden gelen anahtar silindikten sonra yenileme/sağlayıcı değişiminde geri gelmemeli; ortak cihazdaki hesap sınırları test edilmeli.

### 15. Düz HTTP, karma içerik ve yedekleme politikası fazla geniş

**Kanıt: yapılandırmadan saptandı.** [Manifest](C:/projelerim/notbahcesi/android/app/src/main/AndroidManifest.xml:4) `allowBackup` ve cleartext'e izin veriyor; [ağ politikası](C:/projelerim/notbahcesi/android/app/src/main/res/xml/network_security_config.xml:3) genel izin tanımlıyor. [Capacitor yapılandırması](C:/projelerim/notbahcesi/capacitor.config.ts) karma içerik izni içeriyor. Yerel PC yardımcısında HTTP üzerinden not ve bearer token taşınabiliyor; özel AI adresinde HTTP de kabul ediliyor.

**Etki:** güvenilmeyen ağda metin/token gizliliği; gizli ayarların yedekleme kapsamının belirsizliği. Yerel PC bağlantısı meşru bir ihtiyaçtır, tek başına zararlı özellik değildir.

**Öneri:** bulut hedeflerinde HTTPS zorunluluğu; yerel bağlantıda açık uyarı, eşleştirme ve dar ağ kapsamı; gizli değerler için Keystore destekli saklama ve uygun yedek dışlama. **Kabul:** genel HTTP kapalı olmalı; izin verilen yerel kullanım belgelenmeli; yedek/geri yüklemede gizli değerlerin davranışı test edilmeli.

### 16. Bağımlılıklarda yüksek önem dereceli güvenlik kayıtları var

**Kanıt: npm audit ile doğrulandı.** 24 paket kaydı içinde kritik seviyedekiler `jspdf`, `handlebars`, `tar`. `jspdf` uygulamanın dışa aktarma yolunda doğrudan kullanılıyor; diğer kritik paketler ağırlıklı olarak derleme/varlık araçları zincirinde. Bu araçların `dependencies` altında olması `--omit=dev` sonucunu büyütüyor.

Mevcut PDF akışı canvas JPEG üretimi kullanıyor; danışma kayıtlarındaki her zararlı belge senaryosunun buradan ulaşılabilir olduğu kanıtlanmadı. Diğer kayıtlar DOMPurify, sharp, ws, lodash, Next/PostCSS ve ilgili zincirleri kapsıyor.

**Öneri:** erişilebilirlik ve kullanım yoluna göre önceliklendirilmiş yükseltme; jsPDF düzeltmesini dışa aktarma regresyonlarıyla uygulama; araçları doğru dependency grubuna ayırma. Major sürüm önerilerini körlemesine `audit fix --force` ile uygulamayın.

**Kabul:** kalan her kaydın sürüm/erişilebilirlik/önlem gerekçesi belgelenmeli; PDF, build ve native eklenti testleri geçmeli. Kaynak danışmalar: [jsPDF](https://github.com/advisories/GHSA-f8cm-6447-x5h2), [tar](https://github.com/advisories/GHSA-23hp-3jrh-7fpw), [handlebars](https://github.com/advisories/GHSA-2w6w-674q-4c4q).

### 17. Native bağlantı ve dikte yaşam döngüsü yeterince kapatılmıyor

**Kanıt: koddan saptandı.** [RemoteBridgePlugin](C:/projelerim/notbahcesi/android/app/src/main/java/com/notbahcesi/app/RemoteBridgePlugin.java) worker, BLE ve ses tanıma kaynaklarını ortak bir destruction/stop yaşam döngüsünde temizlemiyor. [RemoteEditorTools](C:/projelerim/notbahcesi/components/editor/RemoteEditorTools.tsx) kapanış temizliği tüm native işlemleri iptal etmiyor; süre sınırsız dikte döngüsü callback'lerle devam edebiliyor.

**Etki:** ekran kapandıktan sonra işlem, pil tüketimi, açık bağlantı veya bilgisayara beklenmeyen metin gönderimi riski.

**Öneri:** oturum/iptal kimliği, görünür etkin kayıt durumu, kesin durdurma eylemi, lifecycle cleanup ve sınırlı komut kuyruğu. **Kabul:** editörden çıkış/arka plan/izin iptali/bağlantı kopuşu sonrası eski callback bilgisayara yazmamalı; kaynaklar serbest bırakılmalı.

### 18. Yedek dışa aktar–içe aktar döngüsü tüm not alanlarını korumuyor

**Kanıt: koddan saptandı.** [İçe aktarma ekleme alanları](C:/projelerim/notbahcesi/components/editor/DataSection.tsx:884) `color` ve `is_pruned` alanlarını taşımıyor; JSON dışa aktarma kayıtların bu alanlarını içerebiliyor.

**Etki:** geri yüklenen bahçenin renkleri/budama durumu değişir; “yedek” beklentisi karşılanmaz. Bahçe/not yedeği ile uygulama tercihi yedeği aynı şey değildir.

**Öneri:** sürümlü yedek sözleşmesi, tüm desteklenen alanların açık eşlemesi, eski format migrasyonları. **Kabul:** tüm kalıcı alanları doldurulan örnek bahçenin export→import karşılaştırması beklenen ID dönüşümleri dışında eşit olmalı.

### 19. Onay penceresinde Enter, İptal odaktayken de silmeyi onaylayabilir

**Kanıt: koddan saptandı.** [ConfirmModal](C:/projelerim/notbahcesi/components/ui/ConfirmModal.tsx:27) genel Enter dinleyicisinde hedef düğmeden bağımsız `onConfirm` çağırıyor. Genel modal bileşenlerinde odak hapsetme/geri yükleme standardı da tutarlı değil; ayarlar penceresindeki odak yönetimi olumlu bir istisna.

**Öneri:** native button klavye davranışını koruyun; tehlikeli işlemde varsayılan odağı İptal'e verin; merkezi modal yığını ve Android geri önceliği kurun. **Kabul:** İptal üzerindeki Enter silmemeli; Tab dialog dışına kaçmamalı; kapanınca odak çağıran kontrole dönmeli.

### 20. Veri büyüdükçe ana iş parçacığı maliyeti hızla artıyor

**Kanıt: algoritma/veri yolu incelemesi; süre ölçümü yapılmadı.** [Yerel istemci](C:/projelerim/notbahcesi/lib/localClient.ts) sorgularda tüm JSON'u ayrıştırıp yazımlarda tamamını stringify ediyor. İçe aktarma seri kayıt ekliyor. [Projeler](C:/projelerim/notbahcesi/app/projeler/page.tsx:66) ve [bahçe görünümü](C:/projelerim/notbahcesi/app/bahce_view/page.tsx:200) ağaç kurarken tekrarlanan `find/filter` yapıyor; [MindMapNode](C:/projelerim/notbahcesi/components/canvas/MindMapNode.tsx:75) tüm store'a abone. Bazı işlemlerin maliyeti yaklaşık karesel büyüyor.

**Öneri:** işlemsel depolama ve toplu yazım, ID/parent indeksli Map, dar Zustand selector'ları, memoizasyon ve görünür alan dışı düğüm çizimini azaltma. **Kabul:** 1.000/10.000 notta orta sınıf cihaz ölçümleri alınmalı; açılış, yazma gecikmesi, bellek ve import süresi için ölçülen başlangıca göre hedef konmalı. Bu rapor ölçülmemiş hız kazanımı iddia etmez.

### 21. AI zaman aşımı, hata sınıflandırması ve parçalama tutarlı değil

**Kanıt: koddan saptandı.** [Sunucu rotası](C:/projelerim/notbahcesi/app/api/spellcheck/route.ts) 60 saniyelik toplam süreye karşı 55 saniyelik denemeler/fallback kullanıyor; zamanlayıcı yanıt başlıklarından sonra temizlenince JSON gövdesi aynı sınırla korunmuyor. Sağlayıcı 401/429 gibi sonuçlar 502'ye indirgenebiliyor. [Editör](C:/projelerim/notbahcesi/app/editor/page.tsx) ve [parçalama](C:/projelerim/notbahcesi/lib/aiChunks.ts) bunları yeniden denenebilir sayıp küçük parçalara bölerek seri istek üretebiliyor. Boş olmayan ama kesilmiş yanıtlar kabul edilebiliyor.

**Etki:** yanlış anahtarla çok sayıda gereksiz istek, daha yüksek maliyet/bekleme ve özetleme gibi bütünlük gerektiren işlerde anlam kaybı.

**Öneri:** uçtan uca deadline ve iptal; gerçek hata kodu/Retry-After aktarımı; yalnız geçici hatalarda sınırlı retry; makro türüne göre parçalama ve finish_reason denetimi. **Kabul:** 401 tek denemede durmalı; 429 kontrollü beklemeli; iptal yeni parça başlatmamalı; uzun metinlerde sonuç bütünlüğü test edilmeli.

### 22. Eşitleme durumu görünür değil, gereksiz olaylar ağ isteği üretiyor

**Kanıt: koddan saptandı.** [Store aboneliği](C:/projelerim/notbahcesi/lib/driveSync.ts:578) yalnız kalıcı veri yerine genel durumu izliyor; seçim/yan panel gibi hareketler eşitleme planlayabiliyor. Hatalar çoğunlukla kullanıcıya kalıcı bekleyen/başarısız durum olarak yansımıyor; bağlantı geri geldiğinde güvenilir yeniden deneme kuyruğu yok. Son eşitleme bilgisi hesap kapsamıyla ilişkilendirilmeli.

**Öneri:** veri değişimine özel olay, birleştirilmiş yazım, çevrimdışı kuyruk, artan gecikmeli retry; “cihazda kaydedildi / eşitleniyor / bulutta güncel / hata” ayrımı. **Kabul:** salt gezinme Drive yazımı üretmemeli; ağ gidip gelince kullanıcı müdahalesi olmadan kuyruk tamamlanmalı; oturum gerektiren durum açıkça gösterilmeli.

### 23. Otomatik test ve yayın kapıları mevcut riskleri yakalamıyor

**Kanıt: envanter ve çalıştırılan denetimler.** İşlevsel otomasyon olarak bir Python yardımcı testi bulundu; Android örnek testleri ürün senaryolarını kapsamıyor. `package.json` içinde kapsamlı test komutu ve depoda bu senaryoları zorunlu tutan CI akışı bulunamadı. TypeScript/JS lint geçerken veri kaybı sorunları kalıyor; APK üretmek tam Android lint'in geçtiğini göstermiyor.

**Öneri:** bu rapordaki sekiz probe'u düzeltme sonrası beklenen güvenli davranışı sınayan regresyon testlerine dönüştürün. Repository, sync, migration ve import için birim/entegrasyon; editör/ayar/geri davranışı için E2E; native için cihaz testleri ekleyin.

**Kabul:** CI içinde typecheck, lint, test, web build, Android lint ve release bundle kapıları; en az iki cihazlı sync, düşük disk, bozuk dosya ve eski sürümden yükseltme senaryoları zorunlu olmalı.

## P3 — Planlı kalite, kullanılabilirlik ve bakım iyileştirmeleri

### 24. Yardım metinleri ve özellik keşfi gerçek arayüzle eşleşmeli

**Kanıt: kod/metin karşılaştırması.** [Kullanım kılavuzu](C:/projelerim/notbahcesi/components/editor/UsageGuide.tsx:136) Veri Yönetimi altında Word izlenimi veriyor; o ekranda JSON/HTML/PDF var, Word editörde. “Kaydet gerekmez” açıklaması ile [makro ayarlarının Kaydet eylemi](C:/projelerim/notbahcesi/components/editor/ModelSettingsModal.tsx:694) ayrıştırılmalı. [Uzak araç varsayılanları](C:/projelerim/notbahcesi/lib/remoteTools.ts:28) yapılandırılmamış araçları da açık tutuyor.

**Öneri:** kılavuzdan ilgili ayara doğrudan geçiş; otomatik kaydolan tercih ile açık kaydetme gerektiren makroyu ayırma; PC/BLE araçlarını yetenek ve kurulum durumuna göre aşamalı gösterme. **Kabul:** yeni kullanıcı yalnız kılavuzla yedek alabilmeli, makro kaydedebilmeli ve bilgisayar bağlantısını kurabilmeli; yazılan her menü adı mevcut olmalı.

### 25. Büyük bileşenler ve iki backend'in örtük sözleşmesi bakım riskini artırıyor

**Kanıt: mimari inceleme.** Projeler 1.154, DataSection 1.134, ModelSettingsModal 1.124, editör 827 satır civarında. UI, dosya üretimi, ağ işlemi ve iş kuralları aynı bileşenlerde toplanmış. [Supabase seçimi](C:/projelerim/notbahcesi/lib/supabaseClient.ts) ve yerel istemcinin `SupabaseClient` olarak cast edilmesi davranış farklarını tip sisteminden saklıyor; örneğin yerel limit davranışı gerçek sunucu sözleşmesiyle aynı değil. Drive'ın Google oturumu denetimi yerel session'a bağlı; alternatif backend senaryosu ayrıca doğrulanmalı.

**Öneri:** tipli repository arayüzü, sürümlü runtime şemaları, ayrı import/export/sync use-case'leri ve backend sözleşme testleri. Desteklenen yayın backend'ini açıkça seçin; backend değişimini veri migrasyonu olmadan normal ayar gibi sunmayın. [Yapılandırma](C:/projelerim/notbahcesi/lib/config.ts), editördeki sabit sunucu adresi, package/Gradle/belge sürümlerini tek kaynaktan üretin.

**Kabul:** her backend aynı filtre/sıralama/limit/silme sözleşmesini geçmeli; endpoint ve sürüm tek değişiklikle güncellenmeli. Üretim Supabase RLS/pagination davranışı bu incelemede canlı doğrulanmadı.

### 26. Görsel tutarlılık ve erişilebilirlik için cihaz matrisi tamamlanmalı

**Kanıt: kod ve lint; güncel kapsamlı cihaz testi gerekli.** Güvenli alan CSS'i, büyük ölçeklemeye izin verilmesi ve ayarlarda odak yönetimi iyi temeller. Ancak genel modal standardı, büyük yazı, TalkBack sırası, hareket azaltma ve Android edge-to-edge davranışı birlikte doğrulanmalı. Önceki ekran görüntülerinde krem zeminde açık sistem simgeleri gözlenmişti; bu oturumda yeniden üretilmedi. Kurulu StatusBar kütüphanesinde `Style.LIGHT` koyu yazı anlamına geldiğinden yalnız enum adını değiştirerek çözüm varsayılmamalı.

Android lint ayrıca monokrom uygulama simgesi eksikliği, splash yoğunluk/boyut tutarsızlıkları ve yinelenen görseller bildirdi. Koyu tema bulunmaması tek başına hata veya mağaza engeli değildir.

**Öneri:** tema token'ları üzerinden yüzey/metin/kenarlık/odak renkleri; dokunma alanı ve kontrast ölçümü; durum çubuğu/gezinme çubuğunda gerçek cihaz doğrulaması; monokrom icon ve normalize splash varlıkları. **Kabul:** S24 FE dahil Android 15/16, jest/üç tuş, açık/koyu sistem tercihi, büyük font ve TalkBack senaryolarında taşma/okunamayan kontrol olmamalı. Desteklenen minimum Android ayrıca test edilmeli.

## Korunması gereken güçlü taraflar

- Yerel kullanım yaklaşımı çevrimdışı not deneyimi için iyi bir temel; sorun yerel çalışma fikri değil, kalıcılık ve eşitleme sözleşmeleri.
- TypeScript denetimi geçiyor; merkezi Zustand durumu, tercih yardımcıları ve ortak ayar bileşenleri ayrıştırma için başlangıç sağlıyor.
- Ayarlarda tam ekran düzen, kullanım rehberi ve hesap/veri yönetimi ayrımı kullanıcıya anlaşılır bir yapı sunuyor.
- SQL tarafında sahiplik/RLS yaklaşımı bulunuyor. Üretim politikalarının aynı olduğu ayrıca doğrulanmalı.
- HTML dışa aktarmada kaçış uygulaması ve FileProvider'ın dışa kapalı olması olumlu. Kanıt olmadan bunlar XSS/dosya sızıntısı olarak raporlanmadı.
- İncelenen Git dosya envanterinde keystore/.env/token dosyası izlenmesi görülmedi; bu tüm geçmişte sır bulunmadığının garantisi değildir. Gizli anahtar içerikleri okunmadı.

## Önerilen düzeltme sırası ve yayın kabul kapıları

### Aşama 1 — Not güvenilirliği

Önce 01–05 ve 09: başarısız kaydı doğru bildirme, çıkışta taslak korunması, işlemsel import, misafir migrasyonu ve çakışma güvenli sync. Bunlar düzelmeden görsel cilalama yayın güvenliğini sağlamaz. Her düzeltme önce başarısız olan bir regresyon testiyle bağlanmalı.

Çıkış kapısı: düşük depolama, hızlı geri, süreç kapanması, bozuk dosya, iki cihaz eşzamanlı düzenleme ve hesap değişimi testlerinde doğrulanmış veri kaybı olmaması; çatışma varsa kullanıcıya kurtarılabilir kopya sunulması.

### Aşama 2 — Güvenlik ve veri yaşam döngüsü

06–08, 14–17 ve 21: AI erişim/çıkış kontrolü, kota, anahtar silme, veri saklama/silme, bağımlılık ve native lifecycle. Erişilebilir yüksek riskli dependency bulguları varsa dağıtım öncesi engel olarak ele alınmalı; P2 sınıflaması bunları kabul edilmiş risk yapmaz.

Çıkış kapısı: kimliksiz/kota aşan istek sağlayıcıya gitmemeli; özel ağ hedeflerine yönlendirme engellenmeli; silme vaadi gerçek saklamayla eşleşmeli; izin iptali ve ekran kapanışı güvenli olmalı.

### Aşama 3 — Gerçek yayın adayının doğrulanması

10–11 ve 23: tam Android lint, testli web/API yayını, yeni imzalı AAB, sürüm/hash kaydı; Console iç test kanalı üzerinden Play imzalı kurulum. Release bundle ile yalnız debug APK testi birbirinin yerine geçmez.

Çıkış kapısı: eski sürümden veri koruyan güncelleme; Google giriş/Drive izinleri, bağlantı dönüşleri, gizlilik/veri silme URL'leri; hedef SDK ve Data Safety beyanlarının gerçek artefaktla uyumu. Üretim hesabı, OAuth onayı ve Play gereklilikleri yetkili hesapta kontrol edilmeli.

### Aşama 4 — Kullanılabilirlik ve ölçek

12–13, 18–20, 22 ve 24–26: AI önizleme, erişilebilir modal, yedek bütünlüğü, eşitleme geri bildirimi, büyük veri performansı ve rehber. Genel dağıtıma geçişi iç test kullanıcılarının gerçek cihaz senaryolarıyla destekleyin; hata kayıtları kişisel not içeriği içermesin.

## Sınırlar ve açık doğrulamalar

Bu bir kaynak/bağımlılık/konfigürasyon incelemesidir; her cihaz, her ekran ve her üretim servisi için tüketici testi değildir. Sömürülebilirlik kanıtlamak amacıyla canlı SSRF, gerçek AI faturası, Drive yazımı veya hesap silme yapılmadı. Bu oturumda yeni web release build/AAB üretimi ve telefonda yeni kurulum yapılmadı. Önceki kurulumun varlığı güncel kaynakların tüm denetimleri geçtiğinin kanıtı değildir.

Play Console erişimi, gerçek OAuth yayın/onay durumu, üretim Google/Supabase yetkileri, Play imzalı sertifika eşleşmesi ve mağazanın güncel hesap özelindeki gereklilikleri doğrulanmadı. Kamuya açık URL sonuçları kontrol anına aittir. Performans için sayısal gecikme/bellek ölçümü yapılmadı. Güvenlik advisory önem dereceleri ile gerçek uygulama riskinin ayrı değerlendirildiği özellikle korunmalıdır.

**Sonuç:** arayüz geliştirmeleri iyi bir temel oluşturmuş olsa da yayın öncesindeki ana yatırım alanı veri güvenilirliği ve testli yayın sürecidir. P1 kabul testleri geçmeden “Play Store'a hazır” ifadesi teknik olarak desteklenmiyor.
