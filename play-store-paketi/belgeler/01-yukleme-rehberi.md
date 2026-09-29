# Not Bahçesi — Play Store Yükleme Rehberi

Bu rehber, uygulamayı Google Play Store'da yayınlayana kadar sırayla yapılacakları anlatır.
Her adımı sırasıyla tamamla; bir adım kilitliyse Play Console hangi adımın eksik olduğunu söyler.

---

## Hazır olanlar

| Gereken | Durum |
|---|---|
| Yayın paketi (AAB) | Hazır — `uygulama/not-bahcesi-2.2.1.aab` |
| Uygulama ikonu 512×512 | Hazır — `gorseller/uygulama-ikonu-512.png` |
| Öne çıkan görsel 1024×500 | Hazır — `gorseller/one-cikan-gorsel-1024x500.png` |
| Telefon ekran görüntüleri (4 adet) | Hazır — `gorseller/ekran-1..4-*.png` (1080×2160) |
| Gizlilik politikası adresi | Adres hazır — https://mindgarden-neon.vercel.app/gizlilik (yayındaki metin hâlâ eski sürüm; aşağıdaki nota bak) |
| Veri silme talebi adresi | Koda eklendi — https://mindgarden-neon.vercel.app/veri-silme (site yeniden dağıtılınca yayına girer) |
| Mağaza açıklama metinleri | Hazır — `belgeler/03-magaza-metinleri.md` |
| Veri güvenliği cevapları | Hazır — `belgeler/04-veri-guvenligi.md` |

**Sürüm bilgisi:** paket adı `com.notbahcesi.app`, sürüm kodu `45`, sürüm adı `2.2.1`,
hedef API seviyesi `36` (Android 16).

> Play, yeni uygulamalarda güncel hedef API seviyesini zorunlu tutar. Paket API 36
> hedeflediği için bu şart karşılanmıştır.

---

## 1. Geliştirici hesabı

Play Console'a gir: https://play.google.com/console

Hesabın yoksa oluştur. **Kişisel** hesap seçersen tek seferlik 25 dolar ücret alınır ve
üretime geçmeden önce 12 test kullanıcısıyla 14 gün kapalı test şartı vardır.
**Kurumsal** hesapta bu şart yoktur ama vergi/şirket bilgisi ister.

---

## 2. Uygulamayı oluştur

1. **Tüm uygulamalar → Uygulama oluştur**
2. **Uygulama adı:** `Not Bahçesi`
3. **Varsayılan dil:** Türkçe (tr-TR)
4. **Uygulama veya oyun:** Uygulama
5. **Ücretsiz / Ücretli:** Ücretsiz
6. Beyan kutularını işaretle → **Uygulama oluştur**

> Paket adı sonradan değiştirilemez. İlk AAB yüklendiğinde `com.notbahcesi.app` olarak kilitlenir.

---

## 3. Mağaza girişi (Store listing)

Sol menüden **Büyüme → Mağaza girişi → Varsayılan mağaza girişi**.

Metinleri `belgeler/03-magaza-metinleri.md` dosyasından kopyala:

- **Uygulama adı:** Not Bahçesi (30 karakter sınırı)
- **Kısa açıklama:** 80 karakter sınırı
- **Tam açıklama:** 4000 karakter sınırı

Görselleri `gorseller/` klasöründen yükle:

| Alan | Dosya | Zorunlu mu |
|---|---|---|
| Uygulama ikonu | `uygulama-ikonu-512.png` | Evet |
| Öne çıkan görsel | `one-cikan-gorsel-1024x500.png` | Evet |
| Telefon ekran görüntüleri | `ekran-1/2/3/4-*.png` | En az 2 tane (bizde 4 tane var) |

Ekran görüntüleri 1080×2160 (9:18) hazırdır; Play'in "uzun kenar kısa kenarın en çok
2 katı" kuralına uyar. Sıralama şöyledir: ana sayfa, projeler listesi, editör ve ayarlar.

---

## 4. Ayarlar arayüzü

Uygulamanın ayarları tek bir pencerede toplandı. Pencere iki yerden açılır: editörün
sağ üst köşesindeki **dişli (Ayarlar)** düğmesi ve kenar çubuğundaki **Ayarlar** kartı.
Kenar çubuğu kartı, hesap girişi yapılmamışken de görünür; böylece yerel modda çalışan
kullanıcı da ayarlara erişebilir.

İlk açılışta üstte bir **arama kutusu**, altında gruplanmış bölüm kartları bulunan bir
giriş ekranı görünür. Bölüm adları hem menüde hem açılan sayfanın başlığında aynıdır.

| Bölüm | Ne işe yarar |
|---|---|
| **Kullanım kılavuzu** | Bahçe, editör, yapay zekâ ve yedekleme adımları; ilgili ayara doğrudan geçiş |
| **Hesap ve giriş** | Google ile giriş, e-posta ile giriş, bu cihazdaki oturum ve çıkış |
| **Yapay zekâ** | Sağlayıcı (Gemini / OpenAI / Anthropic / Özel), API anahtarı ve model listesi |
| **AI makroları** | Hazır makroları aç/kapat, kendi makronu yaz |
| **Düzenleme araçları** | Dört yerel araç + bilgisayar araçları: fare, dikte, bilgisayara yaz, pano, kısayollar |
| **Bilgisayar bağlantısı** | Bağlantı yolu, PC yardımcı programı adresi ve erişim anahtarı, araç davranışı |
| **Yedekleme ve senkronizasyon** | Google Drive ile yedekleme ve cihazlar arası birleştirme |
| **Veri yönetimi** | İçe/dışa aktarma (JSON, HTML, PDF) ve kayıt silme |
| **Uygulama hakkında** | Sürüm numarası, gizlilik politikası ve veri silme bağlantıları |

Arama kutusu yazdığın kelimeye göre bölümleri süzer; liste **Hesabınız**, **Yazma
deneyimi**, **Çalışma alanınız**, **Yardım** ve **Uygulama** başlıkları altında
gruplanır. Masaüstünde bölümler iki sütunda, telefonda tek sütunda listelenir.
Klavyeyle gezilebilir; `Esc` tuşu pencereyi kapatır, `Tab` odağı pencerenin içinde
tutar. Çoğu ayar seçildiği anda kaydedilir; makro düzenleyici gibi bazı akışlarda
**Kaydet** düğmesi vardır.

Ayrıntılı kullanım: `belgeler/02-kullanim-kilavuzu.md`. Mağaza görseli:
`gorseller/ekran-4-ayarlar.png`.

---

## 5. Uygulama içeriği formları

Sol menüde **Politikalar → Uygulama içeriği**. Sırayla doldur:

### 5.1 Gizlilik politikası
`https://mindgarden-neon.vercel.app/gizlilik`

Veri silme talebi adresi (form bunu ayrıca sorar):
`https://mindgarden-neon.vercel.app/veri-silme`

> **Bu iki adresi form doldurmadan önce doğrula.** Adresler ancak web sitesi yeniden
> dağıtıldıktan sonra güncel içeriği gösterir: yayındaki `/gizlilik` sayfası şu an eski
> metni (bilgisayar araçları ve mikrofon bölümü olmadan) gösterir, `/veri-silme` ise
> henüz açılmamıştır. Siteyi dağıttıktan sonra iki adresi tarayıcıda açıp yeni bölümlerin
> göründüğünü doğrula.

### 5.2 Uygulama erişimi
**"Tüm işlevler kısıtlı olmadan kullanılabiliyor"** seçeneğini işaretle ve açıklamaya şunu yaz:

> Uygulama şifresiz kullanılabilir. Ana ekranda sol üstteki ağaç simgesine dokunup
> "Giriş Yap" ekranındaki "Yerel Modda Gir" düğmesine basmak yeterlidir; e-posta veya
> şifre gerekmez. İnceleme için herhangi bir hesap bilgisi gerekmiyor.

### 5.3 Reklamlar
**"Uygulamamda reklam yok"** seçeneğini işaretle.

### 5.4 İçerik derecelendirmesi
Anketi doldur. Soruların tamamına **"Hayır"** cevabı uygundur (şiddet, cinsellik,
kumar, uyuşturucu, korku öğesi yok). Kategori: **Herkes / 3+**.

### 5.5 Hedef kitle
**Yaş aralığı:** 18 ve üzeri. (Çocuklara yönelik değil.)
**Çocuklara hitap ediyor mu:** Hayır.

### 5.6 Veri güvenliği
`belgeler/04-veri-guvenligi.md` dosyasındaki cevapları birebir gir.
Bu bölüm en çok reddedilen yerdir; dosyadaki tabloyu takip et.

### 5.7 Haberler / devlet uygulaması / finans
Hepsi **Hayır**.

### 5.8 Veri silme talebi
**"Uygulama verilerinin silinmesini sağlayın"** seçeneğini işaretle.

**Veri silme URL'i:** `https://mindgarden-neon.vercel.app/veri-silme`

Bu sayfa üç silme yolunu anlatır: bahçe/not silme, uygulamayı kaldırma ve Drive
yedeğini silme; ayrıca e-posta ile talep yolu verir.

Kullanıcı verisini uygulama içinden de silebilir: **Ayarlar → Veri yönetimi**.

---

## 6. AAB'yi yükle (kapalı test)

1. Sol menüden **Test etme → Kapalı test → Yeni sürüm oluştur**
2. "Play App Signing" şartlarını kabul et
3. `uygulama/not-bahcesi-2.2.1.aab` dosyasını yükle
4. Sürüm notlarına şunu yaz:

> Ayarlar ekranı yenilendi: yapay zekâ, makrolar, araçlar, bilgisayar, senkronizasyon
> ve veri yönetimi artık tek pencerede. Bilgisayar araçları eklendi (fare, dikte,
> bilgisayara yazma, panoya gönderme). Tema ve görsel tutarlılık iyileştirildi,
> yedekten geri yükleme artık dosyayı önce doğrular (bozuk yedek notlarınızı silmez),
> silinen notların içeriği cihazdan temizlenir ve misafir notlarınız hesap açtığınızda
> hesabınıza aktarılır. Küçük hata düzeltmeleri yapıldı.

5. **Kaydet → Sürümü incele → Kapalı teste gönder**

---

## 7. Play App Signing SHA-1 (kritik)

Google, uygulamayı kendi anahtarıyla yeniden imzalar. Google ile girişin çalışması için
bu anahtarın parmak izini Google Cloud'daki Android istemcisine eklemek zorundasın.

1. Play Console → **Sürüm → Kurulum → Uygulama imzalama**
2. **Uygulama imzalama anahtarı sertifikası** altındaki **SHA-1** değerini kopyala
3. https://console.cloud.google.com/apis/credentials adresine git
4. Android türündeki OAuth istemcini aç (yoksa **Kimlik bilgisi oluştur → OAuth istemci kimliği → Android**)
5. **Paket adı:** `com.notbahcesi.app`
6. **SHA-1:** kopyaladığın değeri yapıştır → **Kaydet**

> Bu adımı atlarsan uygulama Play Store'dan kurulduğunda "Google ile giriş başarısız" hatası alırsın.

---

### Uygulama bağlantıları (assetlinks.json)

Uygulama, Google giriş dönüşünü `https://mindgarden-neon.vercel.app/auth/callback`
adresine bağlar. Android'in bu bağlantıyı doğrulayabilmesi için site kökünde
`/.well-known/assetlinks.json` dosyası bulunmalıdır; dosya projede
`public/.well-known/assetlinks.json` olarak duruyor ve yükleme (upload) anahtarının
parmak izini içeriyor.

Play, uygulamayı **kendi uygulama imzalama anahtarıyla** yeniden imzalar. Play'den
kurulan uygulamada bağlantının doğrulanması için Play anahtarının parmak izini de
ekle:

1. Play Console → **Sürüm → Kurulum → Uygulama imzalama**
2. **Uygulama imzalama anahtarı sertifikası** altındaki **SHA-256** değerini kopyala
3. `public/.well-known/assetlinks.json` içindeki `sha256_cert_fingerprints`
   listesine bu değeri ikinci satır olarak ekle
4. Değişikliği gönder (`git push origin main`); Vercel birkaç dakika içinde yayınlar
5. Tarayıcıdan doğrula: https://mindgarden-neon.vercel.app/.well-known/assetlinks.json

> Dosya yayında 404 dönüyorsa Google giriş dönüşü tarayıcıya düşer; uygulama
> çalışır ama bağlantı doğrulanmamış olur.

---

## 8. Test kullanıcılarını ekle

**Kapalı test → Test kullanıcıları** bölümüne en az 12 kişinin Google e-posta adresini ekle.
Onlara katılım bağlantısını gönder. Kişisel geliştirici hesabında 14 gün boyunca
testçilerin uygulamayı kullanması gerekir; sonra üretime geçebilirsin.

---

## 9. Üretime geçiş

14 gün dolduktan sonra:

1. **Üretim → Yeni sürüm oluştur**
2. Aynı AAB'yi yükle (veya yeni sürüm koduyla yeni bir tane üret)
3. Ülkeleri seç (Türkiye ve istersen tüm ülkeler)
4. **Sürümü incele → Üretime gönder**

İnceleme genellikle 1–7 gün sürer.

---

## Yeni sürüm çıkarmak istersen

Her yeni yüklemede **sürüm kodu artmak zorundadır**. Proje klasöründe:

`android/app/build.gradle` dosyasını aç, şu iki satırı güncelle:

```
versionCode 44       ← her yüklemede 1 artır (43 → 44 → 45 ...)
versionName "2.2.0"  ← kullanıcıya görünen sürüm
```

Sonra paketi yeniden üret (Windows'ta `GRADLE_USER_HOME` verilmezse derleme
"Could not initialize native services" hatasıyla durur):

```
npm run build:android
cd android
set GRADLE_USER_HOME=%CD%\..\.gradle-user
gradlew.bat bundleRelease
```

PowerShell kullanıyorsan `set` yerine:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:GRADLE_USER_HOME='C:\projelerim\notbahcesi\.gradle-user'
.\gradlew.bat bundleRelease
```

Yeni AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Sık karşılaşılan ret sebepleri

| Ret mesajı | Çözüm |
|---|---|
| "Veri güvenliği formu eksik/uyumsuz" | `04-veri-guvenligi.md` dosyasındaki cevapları birebir gir |
| "Uygulama erişimi sağlanamadı" | 5.2'deki açıklamayı yaz; yerel mod düğmesini tarif et |
| "Gizlilik politikası erişilemiyor" | Adresin tarayıcıda açıldığını kontrol et |
| "Hedef API seviyesi düşük" | Paket zaten API 36 hedefliyor, sorun olmamalı |
| "Minimum işlevsellik" | Ekran görüntüleri ve açıklama gerçek işlevi gösteriyor |
