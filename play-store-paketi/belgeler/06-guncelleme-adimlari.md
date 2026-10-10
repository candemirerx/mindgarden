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
versionCode 71         // önceki yükleme 70; her yeni pakette artır
versionName "1.0.3"    // kullanıcının gördüğü sürüm
```

Şu anki sürüm `71` / `1.0.3` (hedef API 36). Bir sonraki yükleme en az 72 olmalıdır.
İlk genel yayın için görünen ad `1.0.3` olarak hazırlandı. Testte kullanılan
kodlar sıfırlanmadı; Play Store güncellemeleri teknik sürüm koduyla sıralar.

**2. Yeni paketi üret**

```
npm run build:android
```

Sonra:

```
cd android
gradlew.bat bundleRelease
```

**Windows notu:** `GRADLE_USER_HOME` verilmezse Gradle "Could not initialize native
services" hatasıyla durur. PowerShell'de:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:GRADLE_USER_HOME='C:\projelerim\notbahcesi\.gradle-user'
.\gradlew.bat bundleRelease
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
• Ayarlar artık tek ekranda: yapay zekâ, araçlar ve yedekleme bir arada
• Telefonundan bilgisayarına yazabilir, farenin yerine telefonunu kullanabilirsin
• Metin editöründe onayla/geri al düğmeleri büyütüldü
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
| 9–40 | 1.8.0–2.1.6 | Ara geliştirme sürümleri |
| 41 | 2.1.7 | Ayarlar arayüzü yenilendi (7 sekme), tema tutarlılığı, bilgisayar araçları |
| 42 | 2.1.8 | Yayın adayı: veri güvenilirliği, güvenlik (SSRF/kota) ve Android lint düzeltmeleri |
| 43 | 2.1.9 | Yayın adayı: not kalıcılığı, veri silme temizliği, içe aktarma doğrulaması, ayar arayüzü tutarlılığı |
| 44–54 | 2.2.0–2.2.10 | Ayrıntılar için 05-yeni-surum.md |
| 55 | 2.2.11 | Editörde tam ekran yazma ve araç iyileştirmeleri (güncel yayın adayı) |

---

## F. Önemli hatırlatmalar

- **Paket adı** `com.notbahcesi.app` bir kez seçildi, değiştirilemez.
- **İmza dosyaları** (`notbahcesi-release.jks`, `keystore.properties`) proje
  klasöründe duruyor ve **gizli kalmalı**. Bunları kaybedersen uygulamaya bir
  daha güncelleme yayınlayamazsın. Güvenli bir yere yedekle.
- **Her yüklemede sürüm kodu artmalı.** Aynı numarayı tekrar kullanamazsın.
- Site ve Play Store **ayrı** güncellenir; birini güncellemek diğerini etkilemez.
