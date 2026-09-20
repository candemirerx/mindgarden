# Not Bahçesi — Play Store Paketi

Bu klasör, uygulamayı Google Play Store'a yükleyip yayınlamak için gereken her şeyi içerir.

**Sürüm:** 1.7.0 (sürüm kodu 8) · **Paket adı:** com.notbahcesi.app

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
│   └── 05-yeni-surum.md          ← yeni sürüm çıkarırken yapılacaklar
├── gorseller/
│   ├── uygulama-ikonu-512.png            ← mağaza ikonu (512×512)
│   ├── one-cikan-gorsel-1024x500.png     ← öne çıkan görsel
│   ├── ekran-1-ana-sayfa.png
│   ├── ekran-2-projeler.png
│   └── ekran-3-editor.png
└── uygulama/
    └── not-bahcesi-1.7.0.aab     ← Play Console'a yüklenecek dosya
```

> **Not:** `uygulama/` klasöründeki AAB dosyası sürüm kontrolüne eklenmez; derleme
> çıktısıdır ve kaynaktan yeniden üretilir (`05-yeni-surum.md`). Klasörün bu kopyasında
> dosya hazır duruyor.

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
4. `uygulama/not-bahcesi-1.7.0.aab` dosyasını kapalı teste yükle
5. Play App Signing SHA-1'ini Google Cloud'daki OAuth istemcisine ekle
   (**bu adımı atlarsan Google ile giriş çalışmaz**)
6. 12 test kullanıcısı ekle, 14 gün bekle
7. Üretime gönder

---

## Önemli notlar

- **Paket adı** `com.notbahcesi.app` ilk yüklemede kilitlenir, sonradan değiştirilemez.
- **Her yeni yüklemede sürüm kodu artmalıdır.** Ayrıntı: `05-yeni-surum.md`
- **İmza dosyaları** (`notbahcesi-release.jks`, `keystore.properties`) bu pakete
  dahil edilmedi; proje klasöründe duruyor ve gizli kalmalıdır. Bunları kaybedersen
  uygulamaya bir daha güncelleme yayınlayamazsın.
- Gizlilik politikası adresi: https://mindgarden-neon.vercel.app/gizlilik
