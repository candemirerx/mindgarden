# Not Bahçesi — Play Store'a İlk Yükleme Rehberi

Bu rehber, Play Store'a **hiç uygulama yüklememiş** biri için yazıldı. Adımları
sırayla izle; her adımın sonunda "✅ Bitti mi?" kontrolü var. Takıldığın yerde
dur, ekranda ne yazdığını bana söyle, birlikte çözelim.

---

## 0. Önce kavramlar (2 dakikalık ders)

| Kavram | Ne demek |
|---|---|
| **Play Console** | Google'ın geliştirici paneli: uygulamanı buradan yükler, mağaza sayfasını buradan düzenlersin. Adresi: https://play.google.com/console |
| **AAB** (`.aab`) | Play'e yüklenen paket. Google bunu her telefona uygun küçük APK'lara böler. Bizim dosya: `uygulama/not-bahcesi-1.0.1.aab` |
| **APK** (`.apk`) | Doğrudan telefona kurulan paket. Play'e **yüklenmez**; yalnız kendi telefonlarına elle kurmak için. |
| **Yükleme anahtarı** | AAB'yi senin imzaladığın anahtar (`android/app/notbahcesi-release.jks`). **Kaybetme!** (bkz. 1.3) |
| **Play App Signing** | Google, kullanıcıya giden uygulamayı kendi anahtarıyla yeniden imzalar. Bu yüzden Google girişi için Play'in anahtar parmak izini ayrıca eklememiz gerekir (Adım 7). |
| **Dahili test** | En fazla 100 kişilik, incelemesiz, dakikalar içinde açılan test. Önce kendimiz deneriz. |
| **Kapalı test** | Kişisel hesaplarda **zorunlu**: en az **12 test kullanıcısı**, kesintisiz **14 gün** boyunca uygulamaya katılmış olmalı. |
| **Üretim (Production)** | Herkesin Play Store'da görüp indirebildiği sürüm. |

### Yol haritası

```
Bugün          → Hesap aç, kimliğini doğrula (Google birkaç gün sürebilir)
Hesap onaylanınca → Uygulamayı oluştur, formları doldur, dahili teste yükle, kendin dene
Aynı gün       → Kapalı teste yükle, 12 test kullanıcısını davet et
14 gün         → Testçiler uygulamada kalır, sen geri bildirim toplarsın
15. gün        → "Üretime erişim" başvurusu → onay → Üretim sürümü → Play Store'da!
```

---

## Hazır olanlar (senin için hazırladıklarım)

| Gereken | Dosya / durum |
|---|---|
| Yayın paketi (AAB) | `uygulama/not-bahcesi-1.0.1.aab` — sürüm kodu **68**, sürüm adı **1.0.1**, yükleme anahtarıyla imzalı |
| Kendi telefonun için APK | `uygulama/not-bahcesi-1.0.1.apk` (Play'e yüklenmez) |
| Uygulama ikonu 512×512 | `gorseller/uygulama-ikonu-512.png` |
| Öne çıkan görsel 1024×500 | `gorseller/one-cikan-gorsel-1024x500.png` |
| Telefon ekran görüntüleri (7 adet, 1080×2160) | `gorseller/ekran-1 … ekran-7` |
| Mağaza metinleri (ad, kısa/tam açıklama, sürüm notu) | `belgeler/03-magaza-metinleri.md` |
| Veri güvenliği formu cevapları | `belgeler/04-veri-guvenligi.md` |
| İzin gerekçeleri (Bluetooth, mikrofon…) | `belgeler/07-izin-gerekceleri.md` |
| Kullanım kılavuzu (5 seviye) | `belgeler/02-kullanim-kilavuzu.md` |
| Gizlilik politikası | https://mindgarden-neon.vercel.app/gizlilik |
| Veri silme sayfası | https://mindgarden-neon.vercel.app/veri-silme |

**Paket bilgisi:** paket adı `com.notbahcesi.app` (yüklendikten sonra **asla değişmez**),
hedef API 36 (Android 16), en düşük Android 7.0 (API 24).

---

## 1. Geliştirici hesabı

### 1.1 Hesabı aç
1. https://play.google.com/console adresine, uygulamayı yayınlayacağın Google hesabıyla gir.
2. Hesap türü: **Kişisel (Personal)** seç. (Şirketin yoksa doğru seçim budur.)
3. Tek seferlik **25 ABD doları** kayıt ücretini kartla öde.
4. Geliştirici adı: mağazada uygulamanın altında görünecek ad (ör. `Can Demirer`).
5. İletişim e-postası ve telefonunu doğrula.

### 1.2 Kimlik ve cihaz doğrulaması
- Google **kimlik belgesi** (nüfus cüzdanı / pasaport) ister; adın, ödeme kartındaki adla aynı olmalı.
- Ayrıca **Play Console uygulamasını** bir Android telefona kurup hesabınla giriş yapman istenir (cihaz doğrulaması).
- Onay birkaç saatten birkaç güne kadar sürebilir. Onay e-postası gelince devam et.

### 1.3 Anahtarını yedekle (çok önemli)
Şu iki dosyayı **USB belleğe ve bulut depolamana** kopyala; kimseyle paylaşma:

- `C:\projelerim\notbahcesi\android\app\notbahcesi-release.jks`
- `C:\projelerim\notbahcesi\android\keystore.properties` (şifreleri içerir)

Bunlar olmadan güncelleme yükleyemezsin (Google destekten anahtar sıfırlatmak haftalar sürer).

✅ **Bitti mi?** Play Console ana sayfasını görüyorsun ve anahtar yedeğin iki yerde duruyor.

---

## 2. Uygulamayı oluştur

1. **Uygulama oluştur** düğmesine bas.
2. **Uygulama adı:** `Not Bahçesi`
3. **Varsayılan dil:** Türkçe – tr-TR
4. **Uygulama mı oyun mu:** Uygulama
5. **Ücretsiz mi ücretli mi:** Ücretsiz (sonradan ücretliye çevrilemez; ücretsiz doğru seçim)
6. Geliştirici Program Politikaları ve ABD ihracat yasaları kutularını işaretle → **Uygulama oluştur**

✅ **Bitti mi?** Sol menüde uygulamanın **Kontrol paneli** açıldı; "Uygulamanızı ayarlayın" görev listesi görünüyor.

---

## 3. Uygulama içeriği formları

Kontrol panelindeki "Uygulamanızı ayarlayın" listesini yukarıdan aşağı doldur
(ya da sol menü **Politika ve programlar → Uygulama içeriği**).

### 3.1 Gizlilik politikası
`https://mindgarden-neon.vercel.app/gizlilik`

### 3.2 Uygulama erişimi
**"Tüm işlevler özel erişim olmadan kullanılabilir"** seçeneğini işaretle. Açıklama gerekirse:

> Uygulama hesapsız kullanılabilir. Ana ekranda sol üstteki ağaç simgesine dokunup
> "Giriş Yap" ekranındaki "Yerel Modda Gir" düğmesine basmak yeterlidir. Bilgisayar
> araçları isteğe bağlıdır ve bir Windows bilgisayar ya da Bluetooth eşleşmesi gerektirir;
> uygulamanın geri kalanı bunlar olmadan tam çalışır.

### 3.3 Reklamlar
**"Hayır, uygulamamda reklam yok."**

### 3.4 İçerik derecelendirmesi
1. **Anketi başlat** → e-posta adresini yaz → kategori: **Diğer tüm uygulama türleri** (Referans, Verimlilik…).
2. Şiddet, cinsellik, kumar, uyuşturucu, korku, kullanıcılar arası iletişim sorularının hepsine **Hayır**.
   (Uygulamada kullanıcıların birbirine mesaj atması yok.)
3. **Kaydet → Derecelendirmeyi gönder.** Sonuç genelde "3+ / Herkes" olur.

### 3.5 Hedef kitle ve içerik
- **Hedef yaş:** **13-15, 16-17 ve 18 yaş ve üstü** seç; 13 yaş altını seçme. (Yalnız 18+ seçmek uygulamayı yaşı doğrulanmamış kullanıcılardan gizleyebilir; 13 altı ise sıkı Aileler politikasını devreye sokar.)
- "Uygulama çocukların ilgisini çekebilir mi?" → **Hayır**.

### 3.6 Veri güvenliği
`belgeler/04-veri-guvenligi.md` dosyasındaki cevapları **birebir** gir.
Bu form en çok ret alınan yerdir; dosyadaki tabloyu satır satır izle.

### 3.7 Diğer beyanlar
- Haber uygulaması: **Hayır** · Devlet uygulaması: **Hayır** · Finansal özellikler: **Hiçbiri**
- Sağlık uygulaması: **Hayır** · COVID-19: **Hayır**
- Reklam kimliği (Advertising ID): **Hayır, kullanmıyor**

### 3.8 Veri silme
- **Veri silme URL'si:** `https://mindgarden-neon.vercel.app/veri-silme`
- Kullanıcı verisini uygulama içinden de silebilir: **Ayarlar → Veri yönetimi**.

### 3.9 Uygulama kategorisi ve iletişim
**Büyüme → Mağaza ayarları:** Kategori **Verimlilik**, e-posta adresin,
web sitesi `https://mindgarden-neon.vercel.app`.

✅ **Bitti mi?** "Uygulama içeriği" sayfasında tüm maddeler yeşil tik.

---

## 4. Mağaza sayfası (Ana mağaza girişi)

Sol menü **Büyüme → Mağaza varlığı → Ana mağaza girişi**.

| Alan | Nereden |
|---|---|
| Uygulama adı | `03-magaza-metinleri.md` → "Uygulama adı" |
| Kısa açıklama (80) | `03-magaza-metinleri.md` → "Kısa açıklama" |
| Tam açıklama (4000) | `03-magaza-metinleri.md` → "Tam açıklama" (3992 karakter, sığar) |
| Uygulama simgesi | `gorseller/uygulama-ikonu-512.png` |
| Öne çıkan grafik | `gorseller/one-cikan-gorsel-1024x500.png` |
| Telefon ekran görüntüleri | `gorseller/ekran-1` → `ekran-7` sırasıyla (en az 2, en çok 8) |

Tablet ekran görüntüsü zorunlu değil; boş bırak. **Kaydet**.

✅ **Bitti mi?** Sayfanın altında "Kaydedildi" yazıyor, hata yok.

---

## 5. Önce dahili test (kendin dene)

Neden? Play'den indirilen sürüm Google'ın anahtarıyla imzalanır; Google girişi ancak
Adım 7'den sonra çalışır. Bunu kapalı testten **önce** kendimiz görmeliyiz.

1. Sol menü **Test et ve yayınla → Test → Dahili test → Yeni sürüm oluştur**.
2. İlk seferde **Play App Signing**'i kabul et (Google'ın anahtarı yönetmesi — önerilen ve zorunlu).
3. **Uygulama paketleri** alanına `uygulama/not-bahcesi-1.0.1.aab` dosyasını sürükle.
4. **Sürüm adı:** `1.0.1` (kendiliğinden dolar).
5. **Sürüm notları:** `03-magaza-metinleri.md` → "Sürüm notları — ilk sürüm" metnini `<tr-TR>` etiketleri arasına yapıştır.
6. **Sonraki → Kaydet ve yayınla.**
7. **Testçiler** sekmesinde bir e-posta listesi oluştur, kendi Gmail adresini ekle.
8. **Katılım bağlantısını kopyala**, telefonda aç, **Test kullanıcısı ol** → Play Store'dan indir.

Telefonda dene: yerel mod, not yazma, Bluetooth klavye ile bilgisayara yazma, PC panosu.
Google ile giriş henüz hata verebilir — Adım 7 bunu düzeltir.

✅ **Bitti mi?** Uygulama Play Store'dan telefonuna kuruldu ve açılıyor.

---

## 6. Kapalı test ve 12 test kullanıcısı

1. **Test → Kapalı test → Kanal oluştur** (adı: `Kapalı test`) → **Yeni sürüm oluştur**.
2. **Kitaplıktan ekle** ile dahili teste yüklediğin aynı AAB'yi seç (yeniden yükleme gerekmez).
3. Aynı sürüm notunu yapıştır → **Kaydet → İncelemeye gönder**.
4. **Testçiler** sekmesi: en az **12 kişinin** Gmail adresini bir listeye ekle
   (en kolayı bir **Google Grubu** açıp grubu eklemek; yeni kişiyi gruba eklemen yeter).
5. Kapalı test **incelemeden** geçince (birkaç saat – birkaç gün) katılım bağlantısını testçilere gönder.

**Testçiler ne yapmalı?**
- Bağlantıyı açıp **Test kullanıcısı ol**'a basmalı ve uygulamayı Play Store'dan indirmeli.
- **14 gün boyunca test programından çıkmamalı** (uygulamayı silse de katılım sayılır ama
  açıp kullanmaları ve geri bildirim vermeleri başvurunu güçlendirir).
- 12 kişiden az kalırsa 14 günlük sayaç durur. Güvenli olmak için **15–20 kişi** davet et.

Bu 14 günde testçilerden gelen hataları bana getir; düzeltip **yeni sürüm kodu (57, 58…)**
ile kapalı teste yeni sürüm yükleriz. Bu, Google'ın "aktif test" şartını da güçlendirir.

✅ **Bitti mi?** Kapalı test "Yayında", Testçiler sekmesinde 12+ kişi katılmış görünüyor.

---

## 7. Google ile giriş için Play anahtarını ekle (kritik)

İlk AAB yüklendikten sonra yapılır.

1. Play Console → **Test et ve yayınla → Kurulum → Uygulama imzalama**.
2. **Uygulama imzalama anahtarı sertifikası** altındaki **SHA-1** ve **SHA-256** değerlerini kopyala.
3. **SHA-1 → Google Cloud:** https://console.cloud.google.com/apis/credentials →
   Android OAuth istemcisini aç (yoksa **Kimlik bilgisi oluştur → OAuth istemci kimliği → Android**),
   paket adı `com.notbahcesi.app`, SHA-1'i yapıştır → **Kaydet**.
   (Mevcut yükleme anahtarının SHA-1'i de kalsın; ikisi birlikte durabilir.)
4. **SHA-256 → assetlinks.json:** bana değeri ver; `public/.well-known/assetlinks.json`
   dosyasına ikinci satır olarak ekleyip siteyi yayınlayayım.
5. Dahili testteki uygulamada **Google ile giriş**'i yeniden dene.

> Bu adım atlanırsa Play'den kurulan uygulamada "Google ile giriş başarısız" hatası çıkar.

✅ **Bitti mi?** Play'den kurulan uygulamada Google ile giriş çalışıyor.

---

## 8. Üretime erişim başvurusu (14 gün sonra)

Kontrol panelinde **"Üretime erişim başvurusunda bulunun"** düğmesi açılır. Google birkaç soru sorar.
Dürüst ve somut cevap ver. Örnek cevaplar:

- **Testçileri nasıl buldunuz?** "Arkadaşlarım, ailem ve iş çevremden, uygulamayı gerçekten
  not tutmak ve bilgisayarla birlikte kullanmak isteyen 15 kişiyi Google Grubu ile davet ettim."
- **Testçiler uygulamayı nasıl kullandı?** "Bahçe ve not oluşturma, Drive yedekleme, yapay
  zekâ makroları ve bilgisayar araçlarını (Bluetooth klavye, PC panosu) denediler."
- **Geri bildirimleri nasıl topladınız, ne değiştirdiniz?** Testte düzelttiğimiz gerçek
  hataları yaz (bunları birlikte not alacağız).
- **Uygulama üretime hazır mı?** "Evet; testteki hatalar düzeltildi, son sürüm kapalı testte."

Başvuru incelemesi genelde **7 güne kadar** sürer.

---

## 9. Üretim sürümü

1. **Test et ve yayınla → Üretim → Ülkeler/bölgeler:** Türkiye (istersen tüm ülkeler).
2. **Yeni sürüm oluştur → Kitaplıktan ekle** → kapalı testteki son AAB.
3. Sürüm notu → **Kaydet → İncelemeye gönder**.
4. **Kademeli yayın** önerisi: önce %20, sorun yoksa %100.

İnceleme birkaç saat ile 7 gün arası sürer. Onaylanınca uygulama Play Store'da aranabilir olur. 🎉

---

## Güncelleme yüklemek (ileride)

Her yüklemede **sürüm kodu bir artmalı** (56 → 57 → 58…). Ayrıntı: `05-yeni-surum.md`.
Bana "yeni sürüm hazırla" demen yeterli: sürüm kodunu artırır, paketi üretir, notunu yazarım.

---

## Sık karşılaşılan ret sebepleri

| Ret mesajı | Çözüm |
|---|---|
| Veri güvenliği formu uyumsuz | `04-veri-guvenligi.md` cevaplarını birebir gir |
| Uygulama erişimi sağlanamadı | 3.2'deki açıklamayı yaz; "Yerel Modda Gir" düğmesini tarif et |
| Gizlilik politikası erişilemiyor | Adresi tarayıcıda aç; açılmıyorsa bana söyle |
| İzin gerekçesi eksik (Bluetooth / mikrofon) | `07-izin-gerekceleri.md` metinlerini kullan |
| Kapalı test şartı karşılanmadı | 12+ testçi 14 gün kesintisiz katılımda kalmalı; sayacı Kontrol panelinde izle |
| Minimum işlevsellik | Ekran görüntüleri ve açıklama gerçek işlevi gösteriyor; yeterli |
