# Not Bahçesi — Play Store Paketi

Bu klasör, uygulamayı Google Play Store'a yükleyip yayınlamak için gereken her şeyi içerir.

**Sürüm:** 2.2.1 (sürüm kodu 45) · **Paket adı:** com.notbahcesi.app · **Hedef API:** 36

---

## Klasör içeriği

```
play-store-paketi/
├── OKUBENI.md                    ← bu dosya
├── basla.html                    ← telefondan okumak için başlangıç sayfası
├── belgeler/
│   ├── 01-yukleme-rehberi.md     ← Play Console'da sırayla yapılacaklar
│   ├── 01-yukleme-rehberi.html   ← aynısının telefondan okunabilir hâli
│   ├── 02-kullanim-kilavuzu.md   ← uygulamayı nasıl kullanacağın
│   ├── 02-kullanim-kilavuzu.html ← aynısının telefondan okunabilir hâli
│   ├── 03-magaza-metinleri.md    ← mağazaya kopyalanacak açıklama metinleri
│   ├── 04-veri-guvenligi.md      ← veri güvenliği formu cevapları
│   ├── 05-yeni-surum.md          ← yeni sürüm çıkarırken yapılacaklar
│   ├── 06-guncelleme-adimlari.md ← web sitesi ve Play Store güncelleme akışı
│   ├── 07-izin-gerekceleri.md   ← izin gerekçeleri ve inceleme cevapları
│   └── 08-gelir-modeli.md       ← para kazanma planı ve fiyat taktiği
├── gorseller/
│   ├── uygulama-ikonu-512.png            ← mağaza ikonu (512×512)
│   ├── one-cikan-gorsel-1024x500.png     ← öne çıkan görsel
│   ├── ekran-1-ana-sayfa.png
│   ├── ekran-2-projeler.png
│   ├── ekran-3-editor.png
│   └── ekran-4-ayarlar.png
└── uygulama/
    └── not-bahcesi-2.2.1.aab     ← Play Console'a yüklenecek dosya
        (arsiv/ klasöründe eski derlemeler durur; bunları yükleme)
```

> **Not:** `uygulama/` klasöründeki AAB dosyası sürüm kontrolüne eklenmez; derleme
> çıktısıdır ve kaynaktan yeniden üretilir (`05-yeni-surum.md`). Klasörün bu kopyasında
> dosya hazır duruyor.

> **Paket kaydı (2.2.1 / sürüm kodu 45):** `not-bahcesi-2.2.1.aab` — 5.049.934 bayt,
> SHA-256 `A3A43BB67A35C4043E0A39CDA4DB93F56E6B164B357715FAF32741846CC99EC2`
> (29 Eylül 2026, 22:25). Telefon testi için üretilen imzalı APK:
> `not-bahcesi-2.2.1.apk` — 4.736.878 bayt, SHA-256
> `DA4C73B5A0122CBA2C3E9B97DB6406CBF37299B7B8251441D0938E33CBED4E23`. AAB'yi yeniden
> üretirsen özeti `Get-FileHash uygulama/not-bahcesi-2.2.1.aab -Algorithm SHA256` ile
> yenile ve bu satırı güncelle; Console'a yüklediğin dosyanın özeti bu kayıtla aynı olmalı.

---

## Nereden başlamalı

**Telefondan okuyorsan:** `basla.html` dosyasını aç. Tüm belgelerin bağlantıları
oradadır ve telefon ekranına uygun biçimde görünür.

**Bilgisayardan okuyorsan:** Önce `belgeler/01-yukleme-rehberi.md` dosyasını aç ve
sırayla ilerle.

---

## En kısa yol

1. Play Console'da uygulamayı oluştur (`01-yukleme-rehberi.md` → 2. adım)
2. Mağaza metinlerini ve görselleri yükle (`03-magaza-metinleri.md` + `gorseller/`)
3. Uygulama içeriği formlarını doldur (`04-veri-guvenligi.md`)
4. `uygulama/not-bahcesi-2.2.1.aab` dosyasını kapalı teste yükle
5. Play App Signing SHA-1'ini Google Cloud'daki OAuth istemcisine ekle
   (**bu adımı atlarsan Google ile giriş çalışmaz**)
6. 12 test kullanıcısı ekle, 14 gün bekle
7. Üretime gönder

---

## Bu sürümde (2.2.1)

- **Ana ekranda ağaç sayısı:** Her bahçe kartı, tarihin yanında kaç ağaç (en üst
  seviye not) olduğunu gösteriyor; sayım alınamazsa rozet çizilmiyor.
- **Görünüm adları sadeleşti:** "Projeler" → **Liste**, "Canvas" → **Tuval**.
  Kartlardaki iki düğme artık eşit ağırlıkta; ayrım yalnızca ikon renginde.
- **Dal rengi kaydediliyor:** Seçilen renk notun kendisine yazılıyor; uygulama
  kapanıp açılsa da korunuyor. Kaydedilemezse görünür uyarı çıkıyor.
- **Dokunmatikte yapışan vurgu düzeltildi:** Karta dokununca ağaç simgesi
  yeşilde kalmıyor; hover stilleri yalnızca fare/kalem olan cihazlarda çalışıyor.

### Önceki sürümden (2.1.9) devralınan yenilikler

- **Ayarlar yenilendi:** Üstte arama kutusu, altında gruplanmış bölüm kartları bulunan
  tek giriş ekranı. "Hesabınız", "Yazma deneyimi", "Çalışma alanınız", "Yardım" ve
  "Uygulama" başlıkları altında 9 bölüm: Kullanım kılavuzu, Hesap ve giriş, Yapay zekâ,
  AI makroları, Düzenleme araçları, Bilgisayar bağlantısı, Yedekleme ve senkronizasyon,
  Veri yönetimi, Uygulama hakkında. Bölüm adları menüyle birebir aynıdır. Editörün sağ
  üstündeki dişli düğmesinden ve kenar çubuğundaki **Ayarlar** kartından açılır.
- **Bilgisayar araçları:** Fare, Dikte, Bilgisayara Yaz, PC panosuna gönderme,
  Köprü Dikte/Köprü Yaz ve kişisel kısayollar. Ayrıntı: `docs/bilgisayar-araclari.md`
- **Tema ve görsel tutarlılık:** ortak ayar bileşenleri, tek tip düğme/modallar ve
  odak stilleri.
- **Play Store hazırlığı:** `targetSdk 36`, `versionCode 43`; mağaza görselleri
  1080×2160 (4 ekran görüntüsü) olarak yenilendi.
- **Veri güvenilirliği:** kaydetme artık kaybolmuyor (çıkışta ve arka planda bekleyen
  kayıt tamamlanır), depolama hatası "kaydedildi" diye gösterilmiyor, içe aktarma
  mevcut veriyi ezmeden önce doğrulanıyor, eşitleme daha yeni metni görünüm
  değişikliğiyle ezmiyor.
- **Güvenlik:** yapay zekâ uç noktası kimliksiz kullanılamaz, özel sağlayıcı adresinde
  SSRF koruması güçlendirildi, Android `lintRelease` sıfır hatayla geçiyor.

---

## Paketi masaüstüne zip olarak vermek

Masaüstündeki **Not Bahcesi Guncel.zip** dosyası, Console'a yükleme yaparken
gereken her şeyi tek yerde taşır: AAB, test APK'sı, tüm belgeler (Markdown +
telefondan okunabilir HTML), mağaza görselleri, sürüm özeti ve bilgisayar
yardımcısı. Güncel sürümü zip'e koymak için proje klasöründe:

```
node scripts/paket-zip.mjs
```

Betik sürüm bilgisini kaynaktan okur, `SURUM-BILGILERI.txt` dosyasını (boyut ve
SHA-256 özetleriyle) yeniler, mevcut zip'i "- onceki <tarih>.zip" olarak
yedekler ve yenisini masaüstüne yazar. Sıra: `npm run build:android` →
`cd android` → `gradlew assembleRelease bundleRelease` →
`node scripts/paket-zip.mjs`. Zip içeriği:

```
uygulama/not-bahcesi-2.2.1.aab   Play Console'a yuklenecek dosya
uygulama/not-bahcesi-2.2.1.apk   telefonda denemek icin imzali paket
belgeler/01..08                  yukleme, guvenlik, izin, gelir belgeleri
gorseller/                       ikon, one cikan gorsel, dort ekran goruntusu
bilgisayar-yardimcisi/           PC koprusu yardimcisi (Play icin gerekmez)
SURUM-BILGILERI.txt              surum, boyut, SHA-256, imza parmak izi
OKUBENI.md, basla.html           bu belge ve telefon baslangic sayfasi
```

---

## Önemli notlar

- **Paket adı** `com.notbahcesi.app` ilk yüklemede kilitlenir, sonradan değiştirilemez.
- **Her yeni yüklemede sürüm kodu artmalıdır.** Ayrıntı: `05-yeni-surum.md`
- **İmza dosyaları** (`notbahcesi-release.jks`, `keystore.properties`) bu pakete
  dahil edilmedi; proje klasöründe duruyor ve gizli kalmalıdır. Bunları kaybedersen
  uygulamaya bir daha güncelleme yayınlayamazsın.
- Gizlilik politikası adresi: https://mindgarden-neon.vercel.app/gizlilik
- Veri silme talebi adresi: https://mindgarden-neon.vercel.app/veri-silme
- **Site yayında ve doğrulandı (29.09.2026):** `/gizlilik` 200 (bilgisayar araçları ve
  dikte bölümleri ekli), `/veri-silme` 200 (üç adımlı silme yönergesi,
  candemirerx@gmail.com, 30 gün). Play Console formlarına bu iki adresi yazabilirsin.
