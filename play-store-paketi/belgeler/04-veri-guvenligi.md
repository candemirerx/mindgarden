# Veri Güvenliği Formu Cevapları

Play Console → **Politikalar → Uygulama içeriği → Veri güvenliği**.
Bu bölüm en çok reddedilen yerdir; aşağıdaki cevapları birebir gir.

---

## Genel bakış

Uygulama **hiçbir veriyi kendi sunucusunda saklamaz**. Notlar kullanıcının cihazında
tutulur. Bulut yapay zekâ özelliği kullanıldığında metin ve kullanıcının API anahtarı
önce Not Bahçesi'nin Vercel üzerindeki sunucu rotasına, oradan kullanıcının seçtiği
sağlayıcıya iletilir; Vercel rotası isteği yalnızca aktarır, kaydetmez. Yedekleme
kullanıcının kendi Google Drive hesabına yapılır.

---

## 1. Veri toplama ve paylaşma

**Soru:** Uygulamanız gerekli kullanıcı verilerini topluyor veya paylaşıyor mu?
**Cevap:** **Evet**

---

## 2. Toplanan / paylaşılan veri türleri

Aşağıdaki tabloyu birebir gir. "Toplanıyor" = uygulamadan dışarı çıkıyor,
"Paylaşılıyor" = üçüncü tarafla paylaşılıyor.

| Veri türü | Toplanıyor | Paylaşılıyor | Zorunlu mu | Amaç | Not |
|---|---|---|---|---|---|
| **Kişisel bilgiler → E-posta adresi** | Evet | Hayır | Hayır (isteğe bağlı) | Uygulama işlevselliği, Hesap yönetimi | Google ile giriş yapılırsa alınır |
| **Kişisel bilgiler → Ad** | Evet | Hayır | Hayır (isteğe bağlı) | Uygulama işlevselliği | Google profili ile gelir |
| **Uygulama etkinliği → Diğer kullanıcı içeriği** | Evet | Evet | Hayır (isteğe bağlı) | Uygulama işlevselliği | Not metinleri cihazda tutulur; kullanıcı bulut yapay zekâ veya aktarım seçtiğinde dışarı gönderilir |
| **Ses → Ses kayıtları** | Evet | Evet | Hayır (isteğe bağlı) | Uygulama işlevselliği | Yalnızca Dikte kullanıldığında. Tanımayı Android'in konuşma tanıma servisi yapar; uygulama ayrıca ses kaydı saklamaz |
| **Cihaz veya diğer kimlikler** | Hayır | Hayır | — | — | Uygulama reklam kimliği veya cihaz kimliği toplamaz |

Diğer kategoriler (konum, kişiler, takvim, sağlık, mesajlar,
ödeme bilgileri, uygulama içi arama geçmişi) için: **Hayır**.

**Fotoğraflar ve dosyalar:** Mini galeriye eklenen görseller cihazın uygulamaya özel
deposunda tutulur. Kullanıcı seçtiği görselleri kendi bilgisayarına veya PC panosuna
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
| Mini galeri görselleri | Kameradan/seçiciden ekleme; seçilenleri bilgisayara veya PC panosuna gönderme | Cihazın özel deposu; kullanıcı gönderirse kendi bilgisayarı |
| Mikrofon sesi | Dikteyi yazıya çevirmek | Android'in konuşma tanıma servisi (cihazda ya da servis sağlayıcısının, ör. Google'ın, sunucusunda işlenebilir; bu yüzden yukarıdaki tabloda "Ses kayıtları" toplanıyor ve paylaşılıyor olarak beyan edilir) |

> Bluetooth ve yerel ağ izinleri yalnızca eşleştirme ve bağlantı için kullanılır;
> arka planda cihaz taraması yapılmaz, listeler hiçbir yere gönderilmez.

---

## 3. Veri güvenliği ayrıntıları

**Soru:** Veriler aktarım sırasında şifreleniyor mu?
**Cevap:** **Evet**

Buluta giden tüm trafik (yapay zekâ sağlayıcısı, Google Drive) HTTPS ile şifrelenir.
Bilgisayar araçlarındaki yerel ağ trafiği (telefon ile kullanıcının kendi bilgisayarı
arasında) şifrelenmez; bu özellik yalnızca güvenilen yerel ağlarda kullanılmalıdır.

**Soru:** Kullanıcı verilerinin silinmesini talep edebiliyor mu?
**Cevap:** **Evet**

Silme yolları:
- Uygulama içinde **Ayarlar → Veri yönetimi** bölümünden kayıtlar silinebilir
- Uygulamayı kaldırmak cihazdaki tüm verileri siler
- Drive yedeği kullanıcının kendi Drive'ında olduğu için kullanıcı oradan da silebilir
- Ayrıntılı silme sayfası: `https://mindgarden-neon.vercel.app/veri-silme`

Play Console'da **veri silme URL'i** olarak yukarıdaki `/veri-silme` adresini ver.
Bu sayfada adım adım silme, silinen veri listesi ve e-posta ile talep yolu anlatılır.

---

## 4. Yapay zekâ özelliği için ayrı beyan

Veri güvenliği formunda yapay zekâ için şu açıklamayı ekle:

> Uygulamadaki yapay zekâ özelliği isteğe bağlıdır. Kullanıcı kendi API anahtarını
> girer ve bir makro çalıştırdığında seçili notun metni ve anahtar, Not Bahçesi'nin
> Vercel üzerindeki sunucu rotası aracılığıyla kullanıcının kendi seçtiği yapay zekâ
> sağlayıcısına (Google, OpenAI, Anthropic veya kullanıcının belirttiği OpenAI uyumlu
> bir servis) iletilir. Metin ve anahtar bu sunucuda saklanmaz; yalnızca isteği
> iletmek için kullanılır. Android'de yerel model seçilirse metin cihazdan çıkmaz. Kullanıcı bu
> özelliği hiç kullanmayabilir; uygulamanın diğer tüm işlevleri anahtar olmadan çalışır.

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
| Veriler aktarımda şifreleniyor mu? | Evet |
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
