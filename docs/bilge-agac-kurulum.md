# Bilge Ağaç ve Hazır AI

Ana sayfadaki Bilge Ağaç paneli ve AI makroları aynı Hazır AI servisini kullanır.
Yeni kullanıcıdan API anahtarı istenmez. Daha önce çalışan kişisel sağlayıcı veya
yerel model seçmiş kullanıcıların tercihleri korunur. Ayarlar → Yapay zekâ
bölümünde iki kullanım biçimi arasında geçiş yapılır. Abonelik/ödeme ekranı yoktur.

## Sunucuda açma

1. Sohbette paylaşılmış sağlayıcı anahtarını iptal edip yenisini oluşturun.
2. `.env.bilge.example` içindeki değişkenleri Vercel projesinin gizli ortam
   değişkenlerine ekleyin. `BILGE_AI_API_KEY` yalnız sunucudadır; hiçbir gizli
   değişken `NEXT_PUBLIC_` ile başlamamalı. Gerçek değerleri Git'e eklemeyin.
3. Sağlayıcı adresi `https://api.b.ai/v1`, model `gpt-6-luna` olarak hazırdır.
   Bunlar özel sağlayıcı değerleridir; modelin varlığı/uyumluluğu sağlayıcıya
   bağlıdır. Sunucu OpenAI uyumlu `POST /chat/completions` protokolünü kullanır.
4. Upstash Redis REST bağlantısının URL ve token değerlerini ekleyin. Sayaçlar
   bütün Vercel örnekleri ve sohbet/makro uçları arasında ortaktır. Redis EVAL
   komutu çalışabilmelidir. Kota kayıtlarına kullanıcı notları veya ham IP yazılmaz.
   Ayrıca onaylanan AI yanıt bildirimleri aşağıdaki ayrı saklama kuralına tabidir.
5. `BILGE_AI_ID_SALT` için en az 32 karakter rastgele gizli değer oluşturun.
6. Sağlayıcı hesabında ayrıca harcama limiti/uyarısı belirleyin. Ardından
   `BILGE_AI_ENABLED=true` yapıp web sunucusunu yeniden dağıtın.
7. Önce bir sohbet, ardından kısa bir özetleme makrosu deneyin. Kota ve hata
   davranışlarını doğrulamadan genel erişimi açmayın. Android statik paket
   sunucu kodunu içermez; `/api/ai` isteğini `lib/config.ts` içindeki web
   sunucusuna yapar. Web dağıtımı ve Android güncellemesi ayrı gereklidir.

Redis/anahtar/salt eksikse sistem kapalı kalır; kullanıcıya açıkça belirtilir.
Yerel geliştirici sunucusunda bile kalıcı Redis gereklidir; bellek içi sayaçla
üretime yanlışlıkla sınırsız geçiş yoktur. Yerelde bütün istekler loopback
ağı kotasını paylaşır. Üretimde Vercel'in kendisinin yazdığı
`x-vercel-forwarded-for` başlığı kullanılır; istemcinin verdiği
`x-forwarded-for` değerine güvenilmez. Başka barındırma için güvenilir proxy
kimliği ayrıca uygulanmalıdır; mevcut üretim kodu Vercel dışındayken kapanır.

## Erken erişim sınırları

- Kimlik doğrulaması gerektirmeden anahtarsız deneme sağlamak için kota ağ
  bazlıdır. Aynı Wi-Fi/NAT kullanıcıları ortak hakkı paylaşır. IPv6 /64 birlikte
  sayılır. Bu bir hesap/abonelik yetkilendirmesi değildir. VPN/proxy rotasyonu
  tamamen engellenmez; küresel sınır bundan bağımsız koruma sağlar.
- Varsayılan ağ kotası: günde en çok 20 istek ve 100.000 kullanım birimi.
- Varsayılan toplam kota: günde en çok 500 istek ve 2.000.000 kullanım birimi.
- 27 Ekim 2026 kapalı test kurulumu toplam kotası daha düşük: günde 100 istek ve
  500.000 kullanım birimi. Upstash ücretsiz planında otomatik ücretli yükseltme kapalıdır.
- Ağ başına dakikada 6 istek. Günlük haklar Europe/Istanbul gece yarısında
  yenilenir. Cevapta kalan hak ve yenilenme zamanı vardır; 429 cevaplarında
  `Retry-After` bulunur.
- Makro: 12.000 karakter metin, 3.000 karakter komut. Sohbet: mesaj başına
  4.000 karakter, en çok 12 geçmiş mesaj, toplam 12.000 karakter.
- Çıktı tavanı 2.048 token. Kesilmiş cevap başarı kabul edilmez; nota
  uygulanmaz. Uzun makrolar için daha kısa metin veya kişisel sağlayıcı gerekir.
- Kullanım birimi; giriş UTF-8 byte sayısı, mesaj payı ve çıktı tavanına göre
  muhafazakâr rezervasyondur. Kesin token veya TL/USD hesabı değildir.
  Başarısız/iptal edilmiş sağlayıcı çağrılarında rezervasyon iade edilmez;
  otomatik yeniden deneme yapılmaz. Bu davranış bütçe kaçaklarını sınırlar.
- Küresel sınırlar parasal bütçe garantisi değildir. Sağlayıcı fiyatı, token
  sayımı ve protokol uyumu ayrıca izlenmelidir. Sağlayıcı tarafında bütçe
  sınırı koyun; sınırsız ücretsiz API varsayımı yapmayın.

## Gizlilik ve sonuç güvenliği

Bilge Ağaç kullanıcı notlarını, hesabını veya cihazını kendiliğinden okumaz;
işlem aracı yoktur. Uygulama bilgisi mevcut kullanım kılavuzundan ilgili
parçalarla desteklenir. Sohbet geçmişi cihazda saklanır (40 sohbet, her birinin
son 60 mesajı); geçmişten silinebilir. Yeni sohbet önceki kaydı silmez.
İlk bulut sohbet isteğinde mesaj ve gerekli geçmişin paylaşımı için açık onay
istenir. Sağlayıcının kendi saklama koşulları geçerlidir.

Bulut makroları ilk kullanımda paylaşım onayı ister. Onayı tarayıcıda sıfırlamak
için `nb-ai-text-consent-v1` kaydı kaldırılabilir. Editör mevcut onay akışını
korur. Tuval kartında sonuç önce ayrı önizlemede gösterilir; ancak Nota uygula
ile yazılır. Bu sırada not değişmiş/silinmişse yazma engellenir. Başlık satırı
korunur. Sağlayıcı hatalarının ham gövdeleri, anahtar ve not metinleri yeni
servis tarafından günlüğe/istemciye taşınmaz.

## İleride abonelik

Bu sürüm ödeme veya abonelik sunmaz. Ücretli erişim açılırken sunucuda doğrulanmış
kullanıcı kimliği, ödeme sağlayıcısının imzalı webhook'u ve kalıcı yetki kayıtları
eklenmelidir. İstemcideki `localStorage` veya bir plan adı ücretli yetki kanıtı
olarak kullanılmamalı. Temel kılavuz erişimini ücretsiz tutun.

## Kontroller

## AI yanıt bildirimlerinin incelenmesi

Sohbet ve makro sonuçlarında Yanıtı bildir akışı vardır. Onaylanan tek yanıtın
ilk 4.000 karakteri, neden, isteğe bağlı açıklama ve zaman 30 gün TTL ile Redis'e
kaydedilir. Kayıt başarısızsa başarı mesajı gösterilmez. Ham IP, hesap ve başka
sohbetler eklenmez. Ağ başına günlük 10, toplam günlük 100 bildirim sınırı vardır.
İçerikleri yalnız geliştirici incelemeli, herkese açık günlüklere kopyalamamalıdır.

Gizli ortam ayarları bulunan geliştirici terminalinde:

`node --env-file=.env.production.local scripts/ai-bildirimleri.mjs`

İncelenen kaydı `--resolve UUID`, silme talebini `--delete UUID` ile işle.
Çözümlenen kaydın TTL süresi uzamaz. Bildirim numarasıyla gelen silme taleplerini
karşıla. Sadece sistem talimatı kapsamlı moderasyon garantisi değildir; gerçek
bildirimleri incele, tekrarlanan risklerde sağlayıcıyı kapat veya filtreyi geliştir.

## Testler

### 27 Ekim 2026 — 1.0.8 / kod 90

- Web: `https://mindgarden-neon.vercel.app` güncel; Hazır AI etkin.
- Gerçek sohbet ve makro yanıtı alındı. Sentetik bildirim Redis'ten okunarak TTL
  doğrulandı, ardından yalnız o sentetik kayıt silindi.
- Zararlı istek denemesi sağlayıcı 502 hatasıyla kapandı; bu durum modelin güvenli
  ret davranışının kanıtı değildir. Kapsamlı moderasyon garantisi verilmez.
- 20 AI kontrat grubu, bildirim/onay testleri ve diyalog viewport testi geçti.
  Web/Android Next derlemeleri ve imzalı Gradle APK/AAB derlemesi başarılı.
- Yayın kapısı 14/14: gerçek AAB manifest kodu 90, dört ELF64 kitaplık 16 KB
  hizalı. APK zipalign ve APK/AAB imza kontrolleri geçti. Npm audit: 0 açık.
- Native lint sırasında LiteRT-LM/Kotlin 2.4 metadata uyumsuzluğu mesajları
  görülüyor; Gradle başarılı olsa da bu, tüm native lint analizlerinin eksiksiz
  yapıldığını kanıtlamaz. Yerel model cihaz regresyonu ayrıca yapılmalı.
- Eski Deneme kısayolu CDP cihaz testi bağlı WebView bulamadığı için çalışmadı;
  cihaz testi geçti diye raporlanmamalı. Deneme saklama birim testi geçti.
- Kod 90 AAB Google Play `alpha` kanalına **taslak** kaydedildi. Mevcut tamamlanmış
  sürüm korunur; taslak yeni sürümü testçilere dağıtmaz. Üretim değiştirilmedi.
- Açık tarayıcı Google hesabı geliştirici hesabı yerine kayıt sayfası gösterdi.
  Doğru hesapla mevcut Veri güvenliği/uygulama içeriği beyanları doğrulanıp
  güncellenmeden yeni taslak dağıtıma açılmamalı. Google incelemesi ve Console
  ön lansman raporu henüz doğrulanmış değildir.

`node scripts/bilge-ai-test.cjs` güvenlik, kota, CORS, istek doğrulama ve
sağlayıcı adaptörünü izole sahte taşıma katmanıyla sınar; gerçek para harcamaz.
`npx tsc --noEmit --incremental false` tip kontrolüdür. Web ve Android statik
derlemeleri ayrıca kontrol edilmelidir. Canlı B.ai/Redis doğrulaması ayrı
kurulum gerektirir; bu testlerin geçmesi canlı sağlayıcı bağlantısını kanıtlamaz.

## 29 Ekim 2026 — sohbet deneyimi geliştirmesi (Samsung test kurulumu)

- 28 Ekim'de kod 90 / 1.0.8 yalnız Alpha ve güncel Veri güvenliği beyanıyla
  incelemeye gönderildi. Bu bölümdeki yeni özellikler o AAB'de **yoktur**.
- Yanıtlar güvenli Markdown ile başlık, vurgu, liste ve kod olarak gösterilir.
  HTML çalıştırılmaz; uzaktaki görseller otomatik yüklenmez. Bilge avatarı ve
  kopyala/seslendir/editör işlem satırı, düzenlenebilir PC kısayolları eklendi.
- Hazır AI'da bir mesajla tek JPEG/PNG/WebP ekleme ve pano/Android klavyesinden
  yapıştırma desteklenir. İstemci 1280 piksele küçültüp yeniden kodlar; en fazla
  700.000 karakter data URL, sunucuda 800 KB toplam gövde sınırı vardır.
  Görsel için ek 12.000 kullanım birimi ayrılır. Kişisel/yerel görsel analizi
  henüz desteklenmez; fotoğraf sessizce atılıp metin yanıtı verilmez.
- Görseller geçmişe yazılmaz ve sonraki çağrıda tekrar gönderilmez. Geçmişte
  fotoğraf eklendiğine dair etiket kalır. Göndermede ayrı paylaşım onayı vardır.
- Android BilgeSpeech köprüsü kurulu motorları/Türkçe sesleri listeler; cihaz içi
  Türkçe öncelikli, hız 0.92 ve ton 0.94 varsayılandır. Ses paketi yükleme seçili
  motorun kurulum ekranını açar; uygulama motor/APK indirmez. Çevrimiçi ses için
  ayrıca onay istenir. Samsung ses motorunda gerçek cihaz testi henüz yapılmadı.
- Editör ayrı `deneme=bilge` taslağı kullanır; Deneme ağacının içeriği korunur.
  Aktar, mevcut Bilge Ağaç bahçesini kullanır veya oluşturur, her aktarımda yeni
  kök ağaç ekler. Aynı anda çift aktarım engellenir. Önceki Bilge taslağını
  değiştirmeden önce uyarı verilir; kayıt hatasında taslak korunur.
- `bilge-experience-test.cjs`: Markdown güvenliği, TTS tercih/onayları, bahçe
  tekrar kullanımı ve aktarım hataları. AI testleri 21 grup; dialog testi geçti.
  Web üretim derlemesi ve Android debug Java derlemesi geçti.
- Yerel `.env.production.local` ile tek sentetik renk görseli üzerinden yapılan
  sağlayıcı kontrolü **HTTP 401** döndürdü. Anahtar çıktıya yazılmadı, kullanıcı
  fotoğrafı gönderilmedi. Canlı görsel modeli bu yüzden doğrulanmış değildir.
- Dağıtımdan önce sağlayıcı erişimi düzeltilmeli, Samsung üzerinde ses/klavye ve
  eşleştirilmiş PC kısayolları denenmeli. Yeni Android sürümü hazırlanmalı;
  Play beyanına Fotoğraflar kategorisi eklenmeli. Bu çalışma otomatik yayın,
  Vercel dağıtımı veya mevcut Alpha sürümünü değiştirme işlemi yapmaz.

### Samsung kurulumu — 1.0.9 / kod 91

- Release APK derlendi; APK imza doğrulaması ve 16 KB zipalign kontrolü geçti.
  Gradle başarılı olsa da yukarıdaki Kotlin metadata analiz uyarısı sürüyor.
- SM-S721B üzerine `adb install -r` ile güncelleme kuruldu; sonuç `Success`.
  Paket yöneticisi 1.0.9 / 91 sürümünü doğruladı. Uygulama kaldırılmadı,
  veri temizleme yapılmadı. Telefon arayüzü ve seslendirme ayrıca denenmedi.
- Samsung ve Google TTS motorları, Samsung Türkçe ses paketi cihazda mevcut.
- Sunucu bu çalışmada yayımlanmadı. Görsel gönderimi yalnızca sunucunun
  `supportsImages` bildirmesiyle açılır; eski API fotoğrafı sessizce yok sayamaz.
  Canlı görsel analizi için sağlayıcı erişimi ve sunucu dağıtımı hâlâ gereklidir.
- APK: `play-store-paketi/uygulama/not-bahcesi-1.0.9-bilge-v91.apk`.
  Mevcut Play Alpha ve üretim dağıtımları değiştirilmedi.

## 29 Ekim 2026 — kişisel görsel sağlayıcıları ve gezinme düğmeleri

- 1.0.10 / kod 92: Gemini `inlineData`, Anthropic base64 görsel bloğu,
  OpenAI ve Özel API `image_url` gönderimi eklendi. Android Özel API doğrudan
  seçili sunucuya gönderir. Bir görsel tek çağrıdır; parçalara bölünmez,
  reddedilince fotoğrafsız yeniden denenmez veya farklı modele geçilmez.
  Cihaz içi metin modeli görsel kabul etmez ve bunu açıkça bildirir.
- Kişisel rota da akış okurken 800 KB tavan uygular; fotoğrafsız isteklerde
  önceki 64 KB sınırı korunur. Ortak sunucu anahtarı bu rotaya açılmadı.
  Fotoğraf paylaşım onayı ve gizlilik metni kişisel sağlayıcıları kapsar.
- Modelin ürettiği izinli `/bilge/...` bağlantıları kısa gezinme düğmeleridir:
  Ayarlar, Yapay zekâ, Bilge ses/uzunluk ayarları, makrolar, bilgisayar bağlantısı,
  yedekleme, kılavuz ve Deneme ağacı. Yalnız tıklamada ilgili ekran açılır.
  Silme/yazma/eşleştirme gibi otomatik işlemler veya uydurma kart kimlikleri yoktur.
  İnternet kaynakları kısa etiketli bağlantılardır; Android'de Browser ile açılır.
  Bu özellik internette arama veya kaynağın güncelliğini doğrulama değildir.
- Web sunucusu `dpl_5G1vMFFjkpuVyh2LzXQsbKkoucCZ` dağıtımıyla
  `https://mindgarden-neon.vercel.app` adresine yayımlandı. Sağlayıcı sırları
  değiştirilmedi. Eski yerel anahtarın önceki 401 sonucu güncel üretim
  anahtarının bozuk olduğu anlamına gelmiyordu; canlı metin/görsel testleri geçti.
- Canlı Hazır AI ve kişisel Gemini testleri, yalnız sentetik görselde bulunan
  rastgele dört rakamı doğru okudu (rakamlar soruda verilmedi). Android CORS
  doğrulandı. Kişisel Gemini yerelde ve canlı sunucuda sınandı. OpenAI,
  Anthropic ve Özel API aktarım/başarı/hata testleri sahte taşıma katmanıyla
  geçti; bu üçü gerçek kişisel anahtarlarla canlı doğrulanmadı.
- Canlı model, model değiştirme sorusuna izinli Yapay zekâ ayarı bağlantısı,
  genel yazım sorusuna adlandırılmış web kaynağı verdi. Bağlantı biçimi ve
  tıklama callback'i, zararlı hedeflerin engellenmesi ile birlikte test edildi.
  İnternet hedeflerinin erişilebilirliği veya telefon ekranında dokunma testi
  yapılmış sayılmaz.
- Web ve Android statik derlemeleri, lint/tip kontrolü; sağlayıcı görsel,
  deneyim, 21 grup AI, diyalog, Deneme saklama ve bildirim testleri geçti.
  İmzalı APK derlendi, imza/16 KB zipalign kontrolleri geçti. Bilinen native
  Kotlin metadata lint uyarısı sürüyor; cihaz içi LLM regresyonu doğrulanmadı.
- Test için indirilen geçici ortam dosyası kaldırıldı. Gerçek kullanıcı
  fotoğrafı kullanılmadı, anahtarlar çıktıya veya istemci paketine yazılmadı.
  Google Play Alpha/üretim kanalları bu çalışmada değiştirilmedi.
- Samsung SM-S721B'ye `adb install -r` kurulumu `Success` ile tamamlandı;
  paket yöneticisi 1.0.10 / kod 92 sürümünü doğruladı. Uygulama kaldırılmadı,
  veri temizlenmedi. Telefon arayüzünde gerçek dokunma testi yapılmadı.
  APK: `play-store-paketi/uygulama/not-bahcesi-1.0.10-gorsel-baglantilar-v92.apk`.

## 29 Ekim 2026 — biçimli editör ve tek seferlik aktarım

- 1.0.11 / kod 93: kelime işlemcisi kalın, italik, üstü çizili, başlık ve
  listeleri gerçek biçimleriyle düzenler. Markdown saklama biçimi korundu;
  istenirse düz metin/Markdown görünümüne geçilebilir. Bilge yanıtı editöre
  açılırken biçimlendirmesi artık silinmez. Kopyalama görünür metni, destekleyen
  web panolarında ayrıca HTML biçimini kullanır. Mevcut dosya dışa aktarma
  işlemlerinin biçimli Word/PDF ürettiği iddia edilmez.
- Aktarım sıkışık üst çubuktan ayrı bir taslak kartına taşındı. Başarılı
  aktarım kayıtlı ağacı açar; kart kaybolur ve düzenleme aynı ağaçta sürer.
  Tekrarlı tıklama kilidi yönlendirme tamamlanana kadar korunur; hata tekrar
  denenebilir. Kaydetme sonrası bahçe listesinin yenilenememesi ikinci bir
  ağaç oluşturmayı tetiklemez.
- Gerçek tarayıcı testi, yalnızca 127.0.0.1:3012 üzerindeki ayrı yerel test
  verileriyle yapıldı. 390 ve 360 piksel genişlikte düğme çakışması/yatay sayfa
  taşması kontrol edildi. Biçimlendirme, yeniden açma, bahçeye aktarım ve
  aktarım sonrası aynı ağacı düzenleyip yeniden açma geçti. Gerçek ekran
  görüntüleri `.codex/bicimli-editor-v93.png` ve `.codex/bilge-aktarim-v93.png`.
- Açılışta editörün boş güncelleme üretip taslağı silmesi engellendi;
  yüklenen içerik geri alma geçmişine eklenmez ve ağaç değişince editör
  geçmişi sıfırlanır. Seçili metin makroları tekrarlanan kelimeleri metin
  aramasıyla değil, belge içindeki seçimin gerçek konumuyla değiştirir.
- Biçimli editör, Bilge deneyimi ve Deneme saklama testleri geçti. Üretim
  web derlemesi lint/tip kontrolüyle geçti; `dpl_EnMy47MxS4mvkFE1zWe1RgGtocEP`
  dağıtımı `https://mindgarden-neon.vercel.app` adresinde hazır, `/editor`
  HTTP 200 döndürüyor. Sunucu anahtarları ve Play kanalları değiştirilmedi.
- Android statik dışa aktarma, Capacitor eşitleme ve release derlemesi geçti.
  APK imzası ve 16 KB zipalign kontrolü başarılı; paket `com.notbahcesi.app`,
  1.0.11 / 93. Bilinen LiteRT-LM/Kotlin metadata analiz uyarısı sürüyor;
  cihaz içi LLM bu değişiklik kapsamında doğrulanmadı. Hazır AI durum çağrısı
  `available: true`, `supportsImages: true` döndürdü (yeni ücretli model
  çağrısı veya kullanıcı fotoğrafı gönderimi yapılmadı).
  APK: `play-store-paketi/uygulama/not-bahcesi-1.0.11-bicimli-editor-v93.apk`.
- Samsung SM-S721B güncellemesi `adb install -r` ile `Success` döndürdü;
  cihaz paket yöneticisi 1.0.11 / 93 ve 29 Ekim 10:05:36 güncelleme zamanını
  doğruladı. Uygulama kaldırılmadı, veriler temizlenmedi, telefon arayüzüne
  müdahale edilmedi. Mobil görünüm testleri tarayıcıda yapıldı; bu kayıt
  Samsung klavyesiyle gerçek dokunma testi yapıldığı anlamına gelmez.

## 29 Ekim 2026 — dört yerel araç ve kompakt görseller (1.0.12 / 94)

- Yerel araçlara Yazı biçimi (Markdown/biçimli geçiş), Çiz ve yaz,
  El yazısı görünümü ve Görsel ekle eklendi. Geçiş düğmesi belge alanından
  kaldırıldı. Ayarlarda araçlar kapatılabilir/silinebilir; eski kapalı veya
  silinmiş araç tercihlerine dokunmadan yalnız dört yeni araç eklenir.
- El yazısı OCR değildir: düzenlenebilir metin cihazdaki Caveat fontuyla
  gösterilir. Tercih bu cihazdaki nota bağlı saklanır. Font ve OFL lisansı
  `public/fonts/` içinde; çalışma anında harici font servisine başvurulmaz.
- Parmak/kalem çizimi renk, kalınlık, son çizgiyi geri alma ve onaylı
  temizleme içerir. Kaydetmeden kapatma onay ister; eklemede boş kenarlar
  kırpılır. Görsel/dosya seçicisi öncesindeki imleç yakalanır; not veya
  düğüm değişmişse eski konuma körlemesine ekleme yapılmaz.
- Hazırlanmış yerel görseller notun Markdown içeriğinde inline saklanır;
  60x52 küçük önizlemeye dokununca büyür. Uzak izleme URL'leri, SVG ve
  script düğümleri kabul edilmez. Not görsel ekleme sınırı yaklaşık 2 MB,
  tek sıkıştırılmış görsel tavanı 700.000 karakterdir. Kaydetme/depo hataları
  gizlenmez. Not resimleri AI makrolarına otomatik iletilmez; yalnız metin
  seçimi istenir. Word/PDF metin çıktısı görüntü yerine kısa işaret kullanır,
  resimlerin bu biçimlere aktarıldığı iddia edilmez.
- Bilge fotoğrafları gönderim öncesinde ve mesajda küçük, dokunulabilir
  önizlemelerdir. Hazırlama MIME'sız Android dosyalarını gerçek piksel
  çözümlemesiyle açar; büyük fotoğraflarda kalite/boyut yerelde aşamalı
  düşürülür. HEIC gibi cihazda çözülemeyen biçimler JPEG/PNG öneren açık
  hata verir. Aktif SVG reddedilir. Hazırlanmış görsel JPEG olarak yeniden
  kodlanır, EXIF/GPS taşınmaz. İlk durum çağrısı başarısızsa gönderimde
  görsel desteği yeniden kontrol edilir; bu ön kontrol çift çağrı kilitlidir.
- Gerçek 390 px tarayıcı testi: dosya seçme, küçük önizleme ve büyütme,
  metnin ortasına elle çizim ekleme, Markdown gidiş/dönüş, yenileyince metin/
  görsel/el yazısını koruma ve yatay taşma kontrolü geçti. Test verileri
  yalnız 127.0.0.1:3013 kökeninde, kullanıcı fotoğrafı olmadan oluşturuldu.
  Ekran görüntüleri `.codex/yerel-araclar-v94.png` ve
  `.codex/bilge-fotograf-mobil-v94.png`; bunlar Samsung dokunma testi değildir.
- Biçimli editör, adaptif medya/araç göçü, Bilge deneyimi, dört sağlayıcının
  görsel aktarımı, Deneme saklama, 21 AI grubu ve diyalog testleri geçti.
  Tip/lint kontrolleri geçti. Kişisel Gemini canlı testi yalnız fotoğrafta
  bulunan rastgele dört rakamı doğru okudu ve Samsung CORS kontrolü geçti.
- Hazır AI canlı görsel denemesi HTTP 429 ile **ağın günlük kotasına**
  takıldı; bu yeni bir başarılı görsel analizi sayılmaz. Sınırlama mantığı
  incelendi, sayaçlar/limitler sıfırlanmadı veya yükseltilmedi. Sağlayıcıya
  erişmeden kota kontrolü yapılıyor; haklar İstanbul gece yarısında yenilenir.
  Anahtarlar çıktıya/istemciye yazılmadı, Play kanalları değiştirilmedi.
- Web son dağıtımı `dpl_6NZRqZULhkprpSR2WFaikkivdwm6` ile üretim adresine
  yayınlandı. `/editor` ve `/fonts/Caveat.ttf` HTTP 200 döndürüyor.
  Web ve Android statik derlemeleri tip/lint ile geçti. Android release
  derlemesi, imza ve 16 KB zipalign kontrolü başarılı; paket 1.0.12 / 94.
  Bilinen LiteRT-LM/Kotlin metadata analiz uyarısı sürüyor; cihaz içi LLM
  bu sürümde ayrıca doğrulanmadı.
  APK: `play-store-paketi/uygulama/not-bahcesi-1.0.12-yerel-araclar-v94.apk`.
- Samsung SM-S721B'ye `adb install -r` güncellemesi `Success` ile tamamlandı.
  Paket yöneticisi 1.0.12 / 94 ve 29 Ekim 17:11:25 güncelleme zamanını
  doğruladı. Uygulama kaldırılmadı, veri temizlenmedi; telefon arayüzü açılıp
  gerçek dokunma/klavye testi yapılmadı. Play Alpha/üretim değiştirilmedi.

## 30 Ekim 2026 — web ve Alpha taslağı 1.0.13 / 95

- Web üretim dağıtımı: `dpl_8VF3LjSvRdHirYuVb7NeDzq4tETj`, sabit adres
  `https://mindgarden-neon.vercel.app`. `/pc`, `/editor`, `/gizlilik`, `/veri-silme`
  ve assetlinks HTTP 200. Canlı PC ZIP SHA-256 yerel paketle aynı:
  `3f3640131a478d5b561d0ec0740bb138b629a8978f0f91df853d27813d6707fe`.
- Ortak USB yardımcısı 2.7.0 paketlendi. 40 arşiv dosyasının kaynak hash'i,
  14 PowerShell dosyasının sözdizimi, kişisel veri dışlama ve onay protokolü
  testleri geçti. Kullanıcının Windows başlangıcı veya mevcut kurulumu değiştirilmedi.
- Kaynak görseli, editör medyası, zengin editör, sağlayıcı görseli, Bilge deneyimi,
  21 AI grubu, sohbet, bağlantı kararlılığı, USB ve deneme saklama testleri geçti.
  TypeScript/lint, Vercel ve Android statik derlemeleri başarılı.
  Canlı Hazır AI sentetik fotoğraftaki rastgele rakamları doğru okudu; Android CORS geçti.
- İmzalı APK ve AAB: `play-store-paketi/uygulama/not-bahcesi-1.0.13.{apk,aab}`.
  Yayın kapısı 14/14, gerçek manifest 95/1.0.13, APK imza/zipalign ve AAB
  jarsigner doğrulaması başarılı. Android lint 0 hata/33 uyarı; önceki
  LiteRT-LM Kotlin metadata analiz uyarısı sürüyor, yerel LLM ayrıca sınanmadı.
- Alpha API yüklemesi tamamlandı ve yeniden sorgulanarak doğrulandı:
  95 (1.0.13) `draft`, önceki 90 (1.0.8) `completed` korundu; production boş.
  Yeni sürüm testçilere dağıtılmıyor. Düzenleme: `13806530456003568408`.
  AAB SHA-256: `60e61bc88f9effb0e9334cdb06754ad1281ab73578551b081c55f09be354802b`.
- Play Veri güvenliği arayüzünde Fotoğraflar seçili DEĞİL. Diğer mevcut seçimler
  değiştirilmedi, form kaydedilmedi. Fotoğraf analizi için isteğe bağlı,
  uygulama işlevselliği amaçlı toplama/paylaşma beyanını kaydetmek ve sürümü
  incelemeye göndermek için kullanıcıdan işlem anı onayı istenecek.
  Kanıt: `.codex/play-fotograf-beyani-v95.jpg`.

## 31 Ekim 2026 — küçük görsel kartları ve isteğe bağlı biçim çubuğu

- Editör görselleri/çizimleri satır içinde 72×60 px karttır; dokununca tam
  ekran önizleme açılır. Sohbette gönderilmiş ve bekleyen fotoğraflar da aynı
  küçük boyutta kalır; fotoğrafın kendisi küçültülerek yeniden kaydedilmez.
- Görsel önizlemesi ve çizim başlığı güvenli üst boşluğu yatay/dikey
  ekranlarda korur; önizlemenin altı da sistem gezinme alanını hesaba katar.
- Kalın/italik/başlık/liste çubuğu başlangıçta gizlidir; Yerel araçlar →
  Biçim ile açılır/kapanır. Fotoğraf/çizim eklemek çubuğu kendiliğinden açmaz.
  Araç listesi v5 geçişi kapalı ve silinmiş araç tercihlerini korur.
- Markdown teknik görünümü “İşaretler” olarak açıklandı; normal yazıya dönüş
  düğmesi eklendi. Biçimlendirme için bu teknik görünümü açmak gerekmez.
- Medya, zengin editör, kaynak görseli, Bilge deneyimi, sağlayıcı görseli ve
  diyalog testleri geçti. Statik Android web derlemesi tip/lint ile başarılı.
  390×844 tarayıcı kontrolünde küçük kartlar, çubuk aç/kapa ve kaynak
  görünümünden üç görsel korunarak dönüş doğrulandı; bu fiziksel klavye
  veya Android sistem çubuğu testi sayılmaz.
- Mobil görünüm: `.codex/editor_kucuk_gorseller_son_20261031.jpg`.
  Web üretim dağıtımı ve Play Alpha taslağı bu düzeltmelerle değiştirilmedi.
- Android release APK derlemesi, imza ve 16 KB hizalama kontrolleri başarılı.
  Önceki LiteRT-LM/Kotlin metadata lint analiz uyarısı sürüyor; yerel LLM
  bu çalışma kapsamında doğrulanmadı. Samsung SM-S721B'ye `adb install -r`
  `Success` ile tamamlandı; uygulama kaldırılmadı, veri temizlenmedi.
  APK: `android/app/build/outputs/apk/release/app-release.apk`.
  SHA-256: `9df0bffe1356ceea0d8bc3fce5ebafe2acacfa68dcd971c52529dba06f91c550`.
  Bu yerel telefon güncellemesi 95/1.0.13 etiketini taşır; Play'deki 95
  AAB taslağının dosyası değiştirilmedi. Bu düzeltmeleri Play'e göndermek
  için yeni sürüm kodu (en az 96) ve yeni AAB gerekir.
