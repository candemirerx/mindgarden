# Veri Güvenliği Formu Cevapları

Play Console → **Politikalar → Uygulama içeriği → Veri güvenliği**.
28 Ekim 2026 güncellemesi. Bu belge beyan taslağıdır; Console'daki mevcut seçimler,
Google'ın güncel veri tanımları ve tüm etkin SDK'larla karşılaştırılmalıdır.
Bir API yüklemesi, Veri güvenliği beyanının güncellendiği anlamına gelmez.

---

## Genel bakış

Notlar ve sohbet geçmişi cihazda tutulur. İsteğe bağlı bulut AI sohbet mesajı,
gerekli geçmiş ve makro metnini Vercel üzerinden sağlayıcıya iletir. Hazır AI'da
anahtar yalnız sunucudadır; kişisel sağlayıcıda kullanıcı anahtarı kullanılır.
Kota için IP'nin gizli anahtarlı özeti Upstash'te en fazla 48 saat tutulur.
Kullanıcı ayrıca onaylayarak yanıt bildirirse seçilen AI yanıtının ilk 4.000
karakteri, neden, açıklama ve zaman geliştirici incelemesi için en fazla 30 gün
Upstash'te saklanır. Diğer sohbetler/notlar otomatik eklenmez. Seçilen yanıtta
kişisel veri bulunabilir. Bulut sağlayıcılarının kendi saklama koşulları geçerlidir.
Drive yedeği kullanıcının kendi Google hesabına yapılır.

---

## 1. Veri toplama ve paylaşma

**Soru:** Uygulamanız gerekli kullanıcı verilerini topluyor veya paylaşıyor mu?
**Cevap:** **Evet**

---

## 2. Toplanan / paylaşılan veri türleri

### 30 Ekim — 1.0.13 (95) yayın öncesi beyan kontrolü

Bilge Ağaç görsel analizi eklenmiştir. Bu sürüm dağıtılmadan önce Console'da
**Fotoğraflar ve videolar → Fotoğraflar** beyanı güncellenmelidir: isteğe bağlı,
uygulama işlevselliği, bulut sağlayıcıda işleme; sağlayıcı saklaması doğrulanmadığı
için kısa süreli işleme iddiası yoktur. Görsel göndermede ayrı onay vardır.
Fotoğraflar cihazda küçültülür, EXIF taşınmaz, uygulama geçmişine kalıcı yazılmaz.
Çevrimiçi TTS seçeneği okunacak metni ses motoru sağlayıcısına gönderebilir;
ayrı onay ve gizlilik açıklaması eklenmiştir. Önceden gönderilen 1.0.8 Alpha
paketi bu yeni özellikleri içermez; bu not mevcut Play beyanını değiştirmez.

Seçimleri veri akışına göre doğrulayın. Hizmet sağlayıcı ve kullanıcının açıkça
başlattığı aktarım istisnaları Google'ın tanımlarına göre değerlendirilmelidir;
üçüncü bir hizmete aktarım her durumda otomatik olarak “paylaşım” sayılmaz.

| Veri türü | Toplanıyor | Paylaşılıyor | Zorunlu mu | Amaç | Not |
|---|---|---|---|---|---|
| **Kişisel bilgiler → E-posta adresi** | Evet | Hayır | Hayır (isteğe bağlı) | Uygulama işlevselliği, Hesap yönetimi | Google ile giriş yapılırsa alınır |
| **Kişisel bilgiler → Ad** | Evet | Hayır | Hayır (isteğe bağlı) | Uygulama işlevselliği | Google profili ile gelir |
| **Uygulama etkinliği → Diğer kullanıcı içeriği** | Evet | Sağlayıcı istisnasını doğrulayın | Hayır (isteğe bağlı) | Uygulama işlevselliği, güvenlik | AI girdileri/sohbet; onaylanan yanıt bildirimi 30 gün saklanır, geçici işleme değildir |
| **Mesajlar → Diğer uygulama içi mesajlar** | Evet (ihtiyatlı beyan) | Sağlayıcı istisnasını doğrulayın | Hayır (isteğe bağlı) | Uygulama işlevselliği | Bilge Ağaç'a gönderilen mesaj ve gerekli sohbet geçmişi; kullanıcı içeriklerine ek olarak Console tanımını doğrulayın |
| **Ses → Ses kayıtları** | Evet | Evet | Hayır (isteğe bağlı) | Uygulama işlevselliği | Yalnızca Dikte kullanıldığında. Varsayılan tanımayı Android'in konuşma tanıma servisi yapar. Kullanıcı bulut dikteyi (OpenAI, Gemini, Groq, Deepgram veya özel API, kendi anahtarıyla) seçerse konuşma bölümleri doğrudan o servise gönderilir; uygulama ses kaydı saklamaz |
| **Fotoğraflar ve videolar → Fotoğraflar** | Evet | Evet (sağlayıcı istisnası doğrulanana kadar ihtiyatlı beyan) | Hayır (isteğe bağlı) | Uygulama işlevselliği | Kullanıcının AI analizi için seçtiği görsel sağlayıcıya gönderilir; kısa süreli işleme iddiası yoktur. Not içindeki yerel görseller kendiliğinden AI'ya gönderilmez |
| **Dosyalar ve dokümanlar → Dosyalar ve dokümanlar** | Evet (ihtiyatlı beyan) | Sağlayıcı istisnasını doğrulayın | Hayır (isteğe bağlı) | Uygulama işlevselliği | 1.0.13 (99): YZ ağacına yüklenen PDF/Word/metin belgelerinin metni cihazda çıkarılır ve saklanır; kullanıcı soru sorduğunda yalnız ilgili bölümler seçili AI sağlayıcısına gönderilir. Google ile girişte talimat ve belge metinleri kullanıcının kendi Drive uygulama klasörüne yedeklenir. Dosyanın kendisi gönderilmez |
| **Cihaz veya diğer kimlikler** | Evet (ihtiyatlı beyan) | Hizmet sağlayıcı istisnasını doğrulayın | AI kullanılırsa | Güvenlik, sahtekârlık önleme | IP'den HMAC ağ özeti, kota sayaçları 48 saat; reklam/cihaz kimliği yok |

**1.0.13 (99) notu:** YZ ağacı belgeleri için **Dosyalar ve dokümanlar** satırı
Console'da da işaretlenmelidir; bu satır üretime başvurmadan önce beyana eklenmeli.

Diğer kategoriler (konum, kişiler, takvim, sağlık,
ödeme bilgileri, uygulama içi arama geçmişi) için: **Hayır**.

**Fotoğraflar ve dosyalar:** Mini galeriye eklenen görseller ve dosyalar cihazın uygulamaya özel
deposunda tutulur. Kullanıcı seçtiği görselleri veya dosyaları kendi bilgisayarına veya PC panosuna
gönderebilir; uygulama bunları kendiliğinden bulut yapay zekâya göndermez. Play
formunu doldururken bu kullanıcı tarafından başlatılan aktarımın güncel veri
toplama/paylaşma istisnalarını karşılayıp karşılamadığını değerlendirin; fotoğraf
ve dosya kategorilerine yalnızca eski kılavuza bakarak otomatik **Hayır** vermeyin.

### Cihazda kalan, toplanmayan veriler

Android’de yerel yapay zekâ modeliyle işlenen metin cihazda kalır; Vercel’e veya
bulut yapay zekâ sağlayıcısına gönderilmez. İlk model indirmesi, kullanıcının
tarayıcıda Hugging Face hesabıyla kabul ettiği lisans ve hizmet koşullarıyla yapılır.
Tarayıcıdaki yerel mod metni kullanıcının yapılandırdığı Ollama sunucusuna gönderir.

Aşağıdakiler yalnızca cihazda veya kullanıcının kendi cihazları arasında işlenir;
uygulamanın bir sunucusuna gönderilmez:

| Veri | Ne için kullanılır | Nereye gider |
|---|---|---|
| Bluetooth eşleşme bilgisi (cihaz adı/adresi) | Kart veya bilgisayarla bağlantı kurmak | Yalnızca telefon ile eşleşen cihaz arasında |
| Yerel ağ adresi (kart/PC IP'si) | Wi‑Fi üzerinden bağlanmak | Yalnızca kullanıcının kendi yerel ağı |
| Panoya gönderilen metin | Bilgisayarın panosuna kopyalamak | Kullanıcının kendi bilgisayarı |
| Mini galeri görselleri ve dosyaları | Kameradan/seçiciden ekleme; seçilenleri bilgisayara veya PC panosuna gönderme | Cihazın özel deposu; kullanıcı gönderirse kendi bilgisayarı |
| Mikrofon sesi | Dikteyi yazıya çevirmek | Android'in konuşma tanıma servisi (cihazda ya da servis sağlayıcısının, ör. Google'ın, sunucusunda işlenebilir; bu yüzden yukarıdaki tabloda "Ses kayıtları" toplanıyor ve paylaşılıyor olarak beyan edilir) |

> Bluetooth ve yerel ağ izinleri yalnızca eşleştirme ve bağlantı için kullanılır;
> arka planda cihaz taraması yapılmaz, listeler hiçbir yere gönderilmez.

---

## 3. Veri güvenliği ayrıntıları

**Soru:** Veriler aktarım sırasında şifreleniyor mu?
**Cevap:** **Hayır (mevcut özel sağlayıcı HTTP desteği nedeniyle)**

Hazır AI, Google Drive ve uygulamanın bulut aktarma rotaları HTTPS kullanır.
Android özel sağlayıcısı ve kullanıcı ayarlı Ollama HTTP kabul eder; bu yolda
metin ve varsa kişisel API anahtarı şifrelenmeden iletilebilir. Bu nedenle
mevcut özellikler korunurken “toplanan tüm veriler aktarımda şifreli” denemez.
Bilgisayar araçlarındaki yerel ağ trafiği (telefon ile kullanıcının kendi bilgisayarı
arasında) şifrelenmez; bu özellik yalnızca güvenilen yerel ağlarda kullanılmalıdır.

**Soru:** Kullanıcı verilerinin silinmesini talep edebiliyor mu?
**Cevap:** **Evet**

Silme yolları:
- Uygulama içinde **Ayarlar → Veri yönetimi** bölümünden kayıtlar silinebilir
- Uygulamayı kaldırmak cihazdaki tüm verileri siler
- Drive yedeği kullanıcının kendi Drive'ında olduğu için kullanıcı oradan da silebilir
- Ayrıntılı silme sayfası: `https://mindgarden-neon.vercel.app/veri-silme`
- AI yanıt bildirimleri bildirim UUID'siyle geliştiriciye e-posta gönderilerek erken silinebilir; uygulamayı kaldırmak bunları silmez. Normal TTL 30 gündür.

Play Console'da **veri silme URL'i** olarak yukarıdaki `/veri-silme` adresini ver.
Bu sayfada adım adım silme, silinen veri listesi ve e-posta ile talep yolu anlatılır.

---

## 4. Yapay zekâ özelliği için ayrı beyan

Veri güvenliği formunda yapay zekâ için şu açıklamayı ekle:

> AI isteğe bağlıdır. Sınırlı ücretsiz Hazır AI, kişisel anahtar ve cihaz içi model
> seçenekleri vardır. Bulut kullanımı paylaşım onayı ister. Hazır AI B.ai'ye Vercel
> üzerinden gider; anahtar istemciye verilmez. Kullanım güvenliği için ağ özeti
> ve sayaçlar Upstash'te 48 saat, ayrıca onaylanan AI yanıt bildirimleri 30 gün
> saklanır. Ham IP, anahtar veya diğer notlar bildirim deposuna yazılmaz.
> Android yerel modelinde metin cihazdan çıkmaz. Uygulama AI olmadan kullanılabilir.

---

## 5. Bilgisayar araçları için ayrı beyan

Uygulamadaki bilgisayar araçları **isteğe bağlıdır**. Kullanıcı kurduğu bağlantının
uygulama açılışında veya yeniden ön plana gelişte otomatik denenmesini seçebilir.
Bağlantının kurulması tek başına not veya görsel göndermez; gönderme, canlı yazma
ve dikte işlemleri kullanıcı tarafından başlatılır.

- **Amaç:** Telefonu bilgisayarın klavyesi, faresi ve panosu gibi kullanmak.
- **Kullanılan izinler:** Bluetooth/Yakındaki cihazlar (Android 12+) veya eski
  sistemlerde konum, mikrofon (yalnızca Dikte için), ağ durumu.
- **Veri akışı:** Yazılan metin, fare komutları ve pano içeriği doğrudan kullanıcının
  kendi bilgisayarına gönderilir. Bu veriler uygulamanın sunucusuna veya üçüncü bir
  tarafa gitmez.
- **Bağlantı yolları:** Bilgisayar Wi‑Fi, Tailscale, bilgisayar Bluetooth, Kart Wi‑Fi,
  Kart AP ve Kart Bluetooth. Tailscale yolunda kullanıcının kendi Tailscale ağı
  kullanılır; bu hizmetin koşulları ayrıca geçerlidir.
- **Güvenlik uyarısı:** Telefon ile bilgisayar arasındaki yerel ağ trafiği şifrelenmez.
  Bu özellik yalnızca güvenilen yerel ağlarda kullanılmalı, bilgisayar tarafındaki
  yardımcı program internete açılmamalıdır.
- **Üçüncü taraf:** Bilgisayar tarafında çalışan yardımcı program Play Store paketinin
  parçası değildir; kullanıcı onu kendi bilgisayarında başlatır.

---

## 6. Google Drive yedekleme için ayrı beyan

> Kullanıcı Google hesabıyla giriş yaptığında notları, kullanıcının kendi Google
> Drive hesabındaki uygulamaya özel gizli klasöre (appDataFolder) yedeklenir. Bu
> veri yalnızca kullanıcının kendi hesabında tutulur ve uygulama dışında kimseyle
> paylaşılmaz. Kullanıcı otomatik senkronu kapatabilir.

---

## 7. Reklam ve analitik

| Soru | Cevap |
|---|---|
| Uygulama reklam içeriyor mu? | **Hayır** |
| Üçüncü taraf analitik var mı? | **Hayır** |
| Veriler reklam için kullanılıyor mu? | **Hayır** |
| Veriler kredi/uygunluk için kullanılıyor mu? | **Hayır** |

---

## 8. Güvenlik pratikleri

| Soru | Cevap |
|---|---|
| Veriler aktarımda şifreleniyor mu? | Hayır (özel sağlayıcı HTTP desteği; bölüm 3) |
| Kullanıcı silme talebinde bulunabilir mi? | Evet |
| Bağımsız güvenlik incelemesinden geçti mi? | Hayır |
| Çocuklara yönelik mi? | Hayır |
| Play Aile politikalarına uygun mu? | Hayır (hedef kitle 13+; 13 yaş altı seçilmedi) |

---

## Özet (formun sonunda sorulan özet ekranı için)

> Not Bahçesi notlarınızı cihazınızda saklar. Yalnızca siz istediğinizde, seçtiğiniz
> yapay zekâ sağlayıcısına metin gönderilir; yalnızca Google ile giriş yaptığınızda
> notlarınız kendi Drive hesabınıza yedeklenir. Bilgisayar araçlarını kullandığınızda
> metin ve komutlar yalnızca kendi bilgisayarınıza gider. Mikrofon yalnızca Dikte
> sırasında kullanılır. Reklam ve izleme yoktur.
