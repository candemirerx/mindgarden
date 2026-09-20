# Veri Güvenliği Formu Cevapları

Play Console → **Politikalar → Uygulama içeriği → Veri güvenliği**.
Bu bölüm en çok reddedilen yerdir; aşağıdaki cevapları birebir gir.

---

## Genel bakış

Uygulama **hiçbir veriyi kendi sunucusuna kaydetmez**. Notlar kullanıcının cihazında
tutulur. Yapay zekâ özelliği kullanıldığında metin, kullanıcının kendi seçtiği
sağlayıcıya gönderilir. Yedekleme kullanıcının kendi Google Drive hesabına yapılır.

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
| **Uygulama etkinliği → Diğer kullanıcı içeriği** | Evet | Evet | Evet | Uygulama işlevselliği | Not metinleri; yapay zekâ kullanıldığında seçilen sağlayıcıya gönderilir |

Diğer tüm kategoriler (konum, kişiler, takvim, fotoğraf, dosyalar, sağlık, mesajlar,
cihaz kimlikleri, ödeme bilgileri) için: **Hayır**.

---

## 3. Veri güvenliği ayrıntıları

**Soru:** Veriler aktarım sırasında şifreleniyor mu?
**Cevap:** **Evet** (HTTPS)

**Soru:** Kullanıcı verilerinin silinmesini talep edebiliyor mu?
**Cevap:** **Evet**

Silme yolları:
- Uygulama içinde **Ayarlar → Veri Yönetimi** ile kayıtlar silinebilir
- Uygulamayı kaldırmak cihazdaki tüm verileri siler
- Drive yedeği kullanıcının kendi Drive'ında olduğu için kullanıcı oradan da silebilir

---

## 4. Yapay zekâ özelliği için ayrı beyan

Veri güvenliği formunda yapay zekâ için şu açıklamayı ekle:

> Uygulamadaki yapay zekâ özelliği isteğe bağlıdır. Kullanıcı kendi API anahtarını
> girer ve bir makro çalıştırdığında seçili notun metni, kullanıcının kendi seçtiği
> yapay zekâ sağlayıcısına (Google, OpenAI, Anthropic veya kullanıcının belirttiği
> OpenAI uyumlu bir servis) gönderilir. Metin ve anahtar uygulamanın kendi
> sunucusunda saklanmaz; yalnızca isteği iletmek için kullanılır. Kullanıcı bu
> özelliği hiç kullanmayabilir; uygulamanın diğer tüm işlevleri anahtar olmadan çalışır.

---

## 5. Google Drive yedekleme için ayrı beyan

> Kullanıcı Google hesabıyla giriş yaptığında notları, kullanıcının kendi Google
> Drive hesabındaki uygulamaya özel gizli klasöre (appDataFolder) yedeklenir. Bu
> veri yalnızca kullanıcının kendi hesabında tutulur ve uygulama dışında kimseyle
> paylaşılmaz. Kullanıcı otomatik senkronu kapatabilir.

---

## 6. Reklam ve analitik

| Soru | Cevap |
|---|---|
| Uygulama reklam içeriyor mu? | **Hayır** |
| Üçüncü taraf analitik var mı? | **Hayır** |
| Veriler reklam için kullanılıyor mu? | **Hayır** |
| Veriler kredi/uygunluk için kullanılıyor mu? | **Hayır** |

---

## 7. Güvenlik pratikleri

| Soru | Cevap |
|---|---|
| Veriler aktarımda şifreleniyor mu? | Evet |
| Kullanıcı silme talebinde bulunabilir mi? | Evet |
| Bağımsız güvenlik incelemesinden geçti mi? | Hayır |
| Çocuklara yönelik mi? | Hayır |
| Play Aile politikalarına uygun mu? | Hayır (hedef kitle 18+) |

---

## Özet (formun sonunda sorulan özet ekranı için)

> Not Bahçesi notlarınızı cihazınızda saklar. Yalnızca siz istediğinizde, seçtiğiniz
> yapay zekâ sağlayıcısına metin gönderilir; yalnızca Google ile giriş yaptığınızda
> notlarınız kendi Drive hesabınıza yedeklenir. Reklam ve izleme yoktur.
