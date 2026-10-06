# Not Bahçesi — Play Store Paketi (BURADAN BAŞLA)

Bu klasör, Not Bahçesi'ni Google Play Store'a **ilk kez** yükleyip yayınlamak için
gereken her şeyi içerir.

**Sürüm:** 2.2.13 (sürüm kodu 57) · **Paket adı:** com.notbahcesi.app · **Hedef API:** 36 (Android 16)

---

## Ne yapmalıyım?

1. **`belgeler/01-yukleme-rehberi.html`** dosyasını aç (çift tıkla, tarayıcıda açılır).
   Play Console'da yapılacak her şey, sırasıyla ve "✅ Bitti mi?" kontrolleriyle orada.
2. Rehber bir dosya istediğinde bu klasörden seç:
   - Yüklenecek paket → `uygulama/not-bahcesi-2.2.13.aab`
   - Görseller → `gorseller/`
   - Kopyalanacak metinler → `belgeler/03-magaza-metinleri.html`
3. Takıldığın yerde ekranda ne yazdığını Claude'a söyle; birlikte çözeriz.

---

## Klasör içeriği

```
Not Bahcesi Play Store/
├── OKUBENI.md                    ← bu dosya
├── basla.html                    ← tüm belgelerin bağlantıları (telefondan da okunur)
├── SURUM-BILGILERI.txt           ← paketin boyutu, özeti, imza parmak izi
├── belgeler/
│   ├── 01-yukleme-rehberi        ← ★ Play Console'da adım adım yapılacaklar
│   ├── 02-kullanim-kilavuzu      ← uygulamanın 5 seviyeli kullanım kılavuzu
│   ├── 03-magaza-metinleri       ← mağazaya kopyalanacak ad, açıklama, sürüm notu
│   ├── 04-veri-guvenligi         ← veri güvenliği formu cevapları
│   ├── 05-yeni-surum             ← ileride güncelleme çıkarırken
│   ├── 06-guncelleme-adimlari    ← web sitesi ve Play güncelleme akışı
│   ├── 07-izin-gerekceleri       ← Bluetooth, mikrofon… izinlerinin gerekçeleri
│   └── 08-gelir-modeli           ← para kazanma planı
│   (her belgenin .md ve .html hâli var; .html'i çift tıklayıp oku)
├── gorseller/
│   ├── uygulama-ikonu-512.png            ← mağaza simgesi (512×512)
│   ├── one-cikan-gorsel-1024x500.png     ← öne çıkan grafik
│   ├── ekran-1-ana-sayfa.png             ← telefon ekran görüntüleri (1080×2160)
│   ├── ekran-2-projeler.png
│   ├── ekran-3-editor.png
│   ├── ekran-4-ayarlar.png
│   ├── ekran-5-ekran-duzeni.png
│   ├── ekran-6-kisayollar.png
│   └── ekran-7-kilavuz.png
├── uygulama/
│   ├── not-bahcesi-2.2.13.aab    ← ★ Play Console'a YÜKLENECEK dosya
│   └── not-bahcesi-2.2.13.apk    ← yalnız kendi telefonuna elle kurmak için (Play'e yüklenmez)
└── bilgisayar-yardimcisi/        ← Windows PC yardımcısı (Wi‑Fi bağlantısı ve pano için)
```

---

## Unutma

- **İmza anahtarını yedekle:** `android/app/notbahcesi-release.jks` ve `android/keystore.properties`
  dosyalarını USB belleğe ve buluta kopyala. Bu klasörde **yoktur** (güvenlik için).
- **Kişisel hesapta** üretime çıkmadan önce **12 test kullanıcısıyla 14 gün kapalı test** zorunludur.
  Rehberin 6. adımı bunu anlatır.
- Paket adı (`com.notbahcesi.app`) ilk yüklemeden sonra **değiştirilemez**.

Bu klasör `node scripts/paket-zip.mjs` ile proje kaynağından yeniden üretilir.
