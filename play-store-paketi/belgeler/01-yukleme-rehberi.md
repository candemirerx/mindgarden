# Not Bahçesi — Play Store Yükleme Rehberi

Bu rehber, uygulamayı Google Play Store'da yayınlayana kadar sırayla yapılacakları anlatır.
Her adımı sırasıyla tamamla; bir adım kilitliyse Play Console hangi adımın eksik olduğunu söyler.

---

## Hazır olanlar

| Gereken | Durum |
|---|---|
| Yayın paketi (AAB) | Hazır — `uygulama/not-bahcesi-1.7.0.aab` |
| Uygulama ikonu 512×512 | Hazır — `gorseller/uygulama-ikonu-512.png` |
| Öne çıkan görsel 1024×500 | Hazır — `gorseller/one-cikan-gorsel-1024x500.png` |
| Telefon ekran görüntüleri (3 adet) | Hazır — `gorseller/ekran-*.png` |
| Gizlilik politikası adresi | Yayında — https://mindgarden-neon.vercel.app/gizlilik |
| Mağaza açıklama metinleri | Hazır — `belgeler/03-magaza-metinleri.md` |
| Veri güvenliği cevapları | Hazır — `belgeler/04-veri-guvenligi.md` |

**Sürüm bilgisi:** paket adı `com.notbahcesi.app`, sürüm kodu `8`, sürüm adı `1.7.0`.

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
| Telefon ekran görüntüleri | `ekran-1/2/3-*.png` | En az 2 tane |

---

## 4. Uygulama içeriği formları

Sol menüde **Politikalar → Uygulama içeriği**. Sırayla doldur:

### 4.1 Gizlilik politikası
`https://mindgarden-neon.vercel.app/gizlilik`

### 4.2 Uygulama erişimi
**"Tüm işlevler kısıtlı olmadan kullanılabiliyor"** seçeneğini işaretle ve açıklamaya şunu yaz:

> Uygulama şifresiz kullanılabilir. Ana ekranda sol üstteki ağaç simgesine dokunup
> "Giriş Yap" ekranındaki "Yerel Modda Gir" düğmesine basmak yeterlidir; e-posta veya
> şifre gerekmez. İnceleme için herhangi bir hesap bilgisi gerekmiyor.

### 4.3 Reklamlar
**"Uygulamamda reklam yok"** seçeneğini işaretle.

### 4.4 İçerik derecelendirmesi
Anketi doldur. Soruların tamamına **"Hayır"** cevabı uygundur (şiddet, cinsellik,
kumar, uyuşturucu, korku öğesi yok). Kategori: **Herkes / 3+**.

### 4.5 Hedef kitle
**Yaş aralığı:** 18 ve üzeri. (Çocuklara yönelik değil.)
**Çocuklara hitap ediyor mu:** Hayır.

### 4.6 Veri güvenliği
`belgeler/04-veri-guvenligi.md` dosyasındaki cevapları birebir gir.
Bu bölüm en çok reddedilen yerdir; dosyadaki tabloyu takip et.

### 4.7 Haberler / devlet uygulaması / finans
Hepsi **Hayır**.

### 4.8 Veri silme talebi
**"Uygulama verilerinin silinmesini sağlayın"** seçeneğini işaretle.
Kullanıcı verisini cihazdan silebilir: Ayarlar → Veri Yönetimi. Ayrıca uygulamayı
kaldırmak cihazdaki tüm veriyi siler.

---

## 5. AAB'yi yükle (kapalı test)

1. Sol menüden **Test etme → Kapalı test → Yeni sürüm oluştur**
2. "Play App Signing" şartlarını kabul et
3. `uygulama/not-bahcesi-1.7.0.aab` dosyasını yükle
4. Sürüm notlarına şunu yaz:

> İlk sürüm. Ağaç yapılı notlar, Google Drive yedekleme ve yapay zekâ makroları.

5. **Kaydet → Sürümü incele → Kapalı teste gönder**

---

## 6. Play App Signing SHA-1 (kritik)

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

## 7. Test kullanıcılarını ekle

**Kapalı test → Test kullanıcıları** bölümüne en az 12 kişinin Google e-posta adresini ekle.
Onlara katılım bağlantısını gönder. Kişisel geliştirici hesabında 14 gün boyunca
testçilerin uygulamayı kullanması gerekir; sonra üretime geçebilirsin.

---

## 8. Üretime geçiş

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
versionCode 9        ← her yüklemede 1 artır
versionName "1.8.0"  ← kullanıcıya görünen sürüm
```

Sonra paketi yeniden üret:

```
npm run build:android
cd android
gradlew.bat bundleRelease
```

Yeni AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Sık karşılaşılan ret sebepleri

| Ret mesajı | Çözüm |
|---|---|
| "Veri güvenliği formu eksik/uyumsuz" | `04-veri-guvenligi.md` dosyasındaki cevapları birebir gir |
| "Uygulama erişimi sağlanamadı" | 4.2'deki açıklamayı yaz; yerel mod düğmesini tarif et |
| "Gizlilik politikası erişilemiyor" | Adresin tarayıcıda açıldığını kontrol et |
| "Hedef API seviyesi düşük" | Paket zaten API 35 hedefliyor, sorun olmamalı |
| "Minimum işlevsellik" | Ekran görüntüleri ve açıklama gerçek işlevi gösteriyor |
