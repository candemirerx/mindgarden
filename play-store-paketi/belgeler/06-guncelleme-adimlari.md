# Güncelleme Adımları

Bir değişiklik yaptığında iki yere ayrı ayrı göndermen gerekir: **web sitesi** ve
**Play Store**. İkisi birbirinden bağımsız çalışır.

---

## A. Web sitesini güncelleme (Vercel)

Site GitHub deposuna bağlıdır. `main` dalına gönderdiğin her değişiklik Vercel
tarafından **kendiliğinden** yayınlanır; ayrıca bir şey yapman gerekmez.

### Adımlar

1. Değişiklikleri kaydet ve gönder:

```
git add -A
git commit -m "kısa açıklama"
git push origin main
```

2. **Yaklaşık 1 dakika bekle.** Vercel yeni sürümü kendisi derleyip yayınlar.

3. Kontrol et: https://mindgarden-neon.vercel.app adresini tarayıcıda aç.
   Değişiklik görünmüyorsa sayfayı `Ctrl + F5` ile yenile (tarayıcı önbelleği).

> Yayının gerçekten çalıştığını görmek için Vercel panelinde **Deployments**
> sekmesinden son dağıtımın "Ready" olduğuna bakabilirsin.

---

## B. Play Store'u güncelleme

Play Store'a yüklenmiş bir uygulamaya güncelleme göndermek için **sürüm kodunu
artırmak zorundasın**. Aynı sürüm kodunu ikinci kez yükleyemezsin.

### Adımlar

**1. Sürüm numarasını artır**

`android/app/build.gradle` dosyasını aç:

```gradle
versionCode 9          // her yüklemede 1 artır (8 -> 9 -> 10 ...)
versionName "1.8.0"    // kullanıcının gördüğü sürüm
```

**2. Yeni paketi üret**

```
npm run build:android
```

Sonra:

```
cd android
gradlew.bat bundleRelease
```

Yeni dosya: `android/app/build/outputs/bundle/release/app-release.aab`

**3. Play Console'a yükle**

1. https://play.google.com/console adresine gir
2. Uygulamayı seç
3. **Test etme → Kapalı test → Yeni sürüm oluştur**
   (üretime çıkmışsa **Üretim → Yeni sürüm oluştur**)
4. Yeni AAB dosyasını yükle
5. **Sürüm notları** alanına kullanıcıya görünecek kısa notu yaz
6. **Kaydet → Sürümü incele → Yayına gönder**

> İlk yüklemeden sonra sonraki sürümler genelde birkaç saat içinde yayınlanır.

---

## C. Sürüm notu nasıl yazılır

Kısa, madde madde ve kullanıcı dilinde olmalı. Teknik terim kullanma.

İyi örnek:

```
• Notlarına artık renk verebilirsin
• Metin editöründe onayla/geri al düğmeleri büyütüldü
• Yapay zekâ makroları hızlandırıldı
```

Kötü örnek:

```
• CORS başlıkları eklendi, max_tokens değeri güncellendi
```

---

## D. Sık yapılan hatalar

| Hata | Sebep ve çözüm |
|---|---|
| "Bu sürüm kodu zaten kullanılıyor" | `versionCode` artırılmamış. Bir artır ve yeniden üret. |
| Site güncellenmedi | `git push` yapılmamış ya da Vercel hâlâ derliyor. Vercel panelinden kontrol et. |
| Play Store güncellemesi görünmüyor | Google incelemesi sürüyor olabilir; 1–7 gün sürebilir. |
| Telefonda eski sürüm görünüyor | Play Store'da uygulama sayfasından güncellemeyi elle tetikle. |

---

## E. Sürüm geçmişi

| Sürüm kodu | Sürüm adı | Not |
|---|---|---|
| 7 | 1.6.0 | Play Store hazırlığı |
| 8 | 1.7.0 | Çoklu AI makroları, dal renkleri, yeni ikon, AI hız düzeltmeleri |
| 9 | 1.8.0 | (sıradaki sürüm için ayrıldı) |

---

## F. Önemli hatırlatmalar

- **Paket adı** `com.notbahcesi.app` bir kez seçildi, değiştirilemez.
- **İmza dosyaları** (`notbahcesi-release.jks`, `keystore.properties`) proje
  klasöründe duruyor ve **gizli kalmalı**. Bunları kaybedersen uygulamaya bir
  daha güncelleme yayınlayamazsın. Güvenli bir yere yedekle.
- **Her yüklemede sürüm kodu artmalı.** Aynı numarayı tekrar kullanamazsın.
- Site ve Play Store **ayrı** güncellenir; birini güncellemek diğerini etkilemez.
