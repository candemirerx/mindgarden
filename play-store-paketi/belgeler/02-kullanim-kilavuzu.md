# Not Bahçesi — Kullanma Kılavuzu

Not Bahçesi, notlarını bir ağaç gibi büyütmen için tasarlandı. Her bahçe bir konu,
her not bir ağaç, her alt not bir dal ya da yaprak.

---

## 1. İlk açılış ve giriş

Uygulamayı ilk açtığın ekran:

- **Sol üstteki ağaç simgesi** — ayar panelini açar. Sağ alt köşesindeki küçük dişli
  simgesi de aynı işi yapar.
- **Yeni Bahçe** — sağ üstteki yeşil düğme.

Notlarını kaydetmek için giriş yapman gerekir. İki yol var:

1. **Yerel Modda Gir** — şifre sormaz, veriler yalnızca bu cihazda saklanır.
   İnternet olmadan da çalışır.
2. **Google ile Giriş** — notlarını Google Drive'a otomatik yedekler ve
   diğer cihazlarınla birleştirir.

> Yerel modda başlayıp sonradan Google ile giriş yaparsan, o ana kadar girdiğin
> notlar silinmez; Drive ile birleştirilir.

---

## 2. Bahçe oluşturma

1. **Yeni Bahçe** düğmesine dokun
2. Bahçeye bir ad ver (örn. "Kitap Notları")
3. **Oluştur**

Yeni oluşturduğun bahçe listenin **en başında** görünür.

Her bahçe kartında:

| Öğe | Ne yapar |
|---|---|
| Kartın üstündeki ad | Son kullandığın görünümü açar (Canvas veya Projeler) |
| **Projeler** | Notları liste hâlinde gösterir |
| **Canvas** | Notları görsel ağaç olarak gösterir |
| Üç nokta | *Yeniden adlandır* / *Bahçeyi sil* |

---

## 3. Canvas — görsel ağaç görünümü

Notlarını dallarıyla birlikte bir ağaç olarak gösterir.

- **Düğüme dokun** → üstünde eylem menüsü açılır
- **Başka düğüme dokun** → öncekinin menüsü kapanır, yalnızca tek menü açık kalır
- **Boş alana dokun** → tüm menüler kapanır
- **İki parmakla** büyüt/küçült, **parmakla sürükle** gezin
- Menüdeki simgeler: tam editör, başlığı kopyala, yeni dal ekle, düğüm tipini değiştir
- **Ağaç yönetimi** düğmesi ile ağaçları toplu açıp kapatabilirsin

---

## 4. Projeler — liste görünümü

Notlarını hiyerarşik liste hâlinde gösterir. Aradığın notu bulmak için üstteki
arama kutusunu kullanabilirsin.

### Not ekleme
- **Yeni Ağaç** ile en üst seviyede bir not aç
- Bir notun üç nokta menüsünden **Yeni dal ekle** (alt notu varsa) veya
  **Yeni yaprak ekle** (alt notu yoksa)

### Üç nokta menüsünde neler var

| Seçenek | Ne yapar |
|---|---|
| Tam editörde aç | Notu büyük metin editöründe açar |
| Yeniden adlandır | Başlığı yerinde düzenlemeni sağlar |
| Yeni dal / yaprak ekle | Altına yeni not ekler |
| **Dal rengi** | Notun rengini seçer (aşağıya bak) |
| Sil | Notu ve altındaki tüm dalları siler |

### Dal rengi

Menüde altı hazır renk ve bir **Varsayılan** düğmesi var:

- Yosun yeşili, Bal köşe, Deniz mavisi, Lavanta, Gül kurusu, Kahve
- Renk seçtiğinde notun simgesi ve yanındaki renk şeridi o renge döner
- **Varsayılan** düğmesi rengi seviyeye göre otomatik renge döndürür
- Renkler cihazda saklanır ve Drive yedeklemesiyle diğer cihazlarına da geçer

Renkleri kullanarak bir bahçedeki farklı konu başlıklarını görsel olarak ayırabilirsin.

---

## 5. Metin editörü ve yapay zekâ

Bir notu açtığın büyük editör ekranı.

### Temel işlemler
- **Başlık** ve **içerik** alanlarına yaz
- **Oto** kutusu açıkken değişiklikler kendiliğinden kaydedilir
- Üstteki düğmeler: geri dön, içeriği kopyala, dışa aktar (PDF / Word)
- **Otomatik kaydetme** kapalıysa Kaydet düğmesini kendin basmalısın

### Yapay zekâ makroları

Üst şeritte **AI** etiketinin yanında makro kutuları görünür. Varsayılan olarak:

**İmla Düzelt · Özetle · Resmileştir · Sadeleştir · Genişlet · İngilizceye Çevir**

Bir kutuya dokunduğunda:

1. Notun metni (ya da seçtiğin bölüm) senin API anahtarınla seçtiğin sağlayıcıya gönderilir
2. Gelen cevap nota yazılır
3. Üstte **Sonuç hazır:** yazısıyla **Onayla** ve **Geri Al** düğmeleri çıkar

- **Onayla** → sonucu kalıcı hâle getirir
- **Geri Al** → notu eski hâline döndürür

> Metnin bir bölümünü seçtiysen yapay zekâ yalnızca o bölümü işler.

### Yapay zekâ sağlayıcısını ayarlama

Ayar paneli → **Model, API ve Senkronizasyon** → **Model Ayarları**

1. Sağlayıcı seç: Google Gemini, OpenAI, Anthropic veya **Özel (Custom)**
2. **Özel** seçtiysen:
   - **Base URL** — örn. `https://api.ornek.com/v1`
     (`/v1` adresini ya da doğrudan `/chat/completions` adresini yazabilirsin)
   - **Model adı / Model ID** — sağlayıcının panelinde yazan gerçek model kimliği
3. **API Anahtarı** alanına kendi anahtarını gir
4. **Sağlayıcıyı Ekle**

> API anahtarın yalnızca cihazında saklanır. Yapay zekâyı kullandığında anahtar ve
> işlenecek metin önce uygulamanın sunucu rotasına, oradan seçtiğin sağlayıcıya iletilir.

### Makroları yönetme

Ayar paneli → **Model, API ve Senkronizasyon** → **AI Makroları**

- Her makronun yanındaki **anahtar** ile makroyu kapatıp açabilirsin
- Kapatılan makro **editörde görünmez**, böylece arayüz kalabalıklaşmaz
- Makroya dokunup **Makroyu kaydet** ile görev metnini değiştirebilirsin
- **Makroyu sil** ile kaldırabilirsin
- **Yeni makro ekle** ile kendi görevini yazabilirsin (örn. "Bu notu toplantı
  tutanağına çevir ve kararları madde madde yaz")
- **Varsayılanlar** düğmesi hazır makro setini geri getirir

Makro detay sayfasında üç alan var: **Makro adı** (kutuda görünen ad),
**Alt başlık** (ne yaptığının kısa açıklaması) ve **Yapay zekâya gönderilecek görev**.

---

## 6. Google Drive yedekleme

Ayar paneli → **Model, API ve Senkronizasyon** → **Senkronizasyon**

| Düğme | Ne yapar |
|---|---|
| Google Drive ile Senkron | Drive'daki yedekle bu cihazı güvenle birleştirir |
| Drive'a Yedekle | Bu cihazdaki her şeyi Drive'a yazar |
| Drive'dan Geri Yükle | Drive'daki yedeği cihaza indirir |
| Şimdi Senkronla | Beklemeden hemen senkron yapar |
| Otomatik Senkron | Açıkken değişiklikler kendiliğinden yedeklenir |

Yedekler Drive'ın uygulamaya özel gizli klasöründe tutulur; Drive'ında görünmez.
Alt tarafta son yedekleme zamanı yazar.

---

## 7. Veri Yönetimi

Ayar paneli → **Veri Yönetimi** (varsayılan olarak kapalıdır, dokununca açılır)

- **Dışa Aktar** — bahçelerini JSON, HTML, PDF veya Word olarak kaydeder.
  Hangi bahçelerin dışa aktarılacağını seçebilirsin.
- **İçe Aktar** — daha önce aldığın JSON yedeğini geri yükler.

Bu yolu cihaz değiştirirken veya Drive kullanmadan yedek almak istediğinde kullan.

---

## 8. Sık sorulanlar

**Notlarım kaybolur mu?**
Yerel modda veriler cihazda tutulur; uygulamayı kaldırırsan silinir. Google ile giriş
yapıp otomatik senkronu açarsan Drive'da yedeklenir.

**Telefon ile bilgisayarda aynı notları görebilir miyim?**
Evet. İki cihazda da **aynı Google hesabıyla** giriş yap ve otomatik senkronu aç.
Notlar birleştirilir; çakışmada en son değiştirilen sürüm geçerli olur.

**Yapay zekâ hata veriyor, ne yapmalıyım?**
Hata mesajı sağlayıcının kendi cevabını gösterir. Sık sebepler: anahtar geçersiz,
model adı yanlış yazılmış veya hesabında bakiye/kota kalmamış.

**Yapay zekâ kullanmak zorunda mıyım?**
Hayır. Hiçbir sağlayıcı tanımlamazsan makro kutuları çalışmaz ama uygulamanın
diğer tüm özellikleri normal çalışır.

**İnternet olmadan çalışır mı?**
Evet. Notlar cihazda tutulur; yalnızca Drive senkronu ve yapay zekâ internet ister.

**Bir dalın rengini nasıl değiştiririm?**
Projeler ekranında notun üç nokta menüsüne dokun → **Dal rengi** bölümünden bir renk seç.
