# Yeni Sürüm Çıkarma

Play Store'a yüklenmiş bir uygulamaya güncelleme göndermek için sürüm kodunu
artırman ve yeni bir paket üretmen gerekir.

---

## 1. Sürüm numarasını artır

`android/app/build.gradle` dosyasını aç ve şu iki satırı güncelle:

```gradle
versionCode 67         // her yüklemede 1 artır — Play bunu zorunlu tutar
versionName "2.2.23"   // kullanıcının gördüğü sürüm
```

> `versionCode` daha önce kullandığın bir değere eşit veya küçük olursa Play yüklemeyi
> reddeder. Yayınlanan en yüksek değerin üzerine çık.

**Şu anki durum:** `versionCode 66`, `versionName "2.2.22"`, hedef API seviyesi 36.
Bir sonraki yükleme en az 67 olmalıdır.

---

## 2. Paketi yeniden üret

Proje klasöründe sırayla:

```
npm run build:android
```

Sonra Android klasöründe:

```
cd android
gradlew.bat bundleRelease
```

**Windows notu:** `GRADLE_USER_HOME` ayarlı değilse Gradle "Could not initialize native
services" hatasıyla durur. PowerShell'de derlemeden önce şu iki satırı çalıştır:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:GRADLE_USER_HOME='C:\projelerim\notbahcesi\.gradle-user'
```

Yeni dosya: `android/app/build/outputs/bundle/release/app-release.aab`

Telefona kurup denemek istersen debug paketini de üretebilirsin:

```
gradlew.bat assembleDebug
```

Mağaza görselleri de tazelenmeli (arayüz değiştiyse):

```
node scripts/play-gorsel-cek.mjs      # 4 ekran görüntüsü (uygulama 3000 portunda çalışırken)
node scripts/play-one-cikan-uret.mjs  # öne çıkan görsel 1024x500
```

Uygulama ikonu değiştiyse `store/play-icon-512.png` dosyasını yeni ikonla güncelle ve aynı
dosyayı `play-store-paketi/gorseller/uygulama-ikonu-512.png` üzerine kopyala.

---

## 3. Play Console'a yükle

1. **Test etme → Kapalı test → Yeni sürüm oluştur**
   (veya doğrudan **Üretim → Yeni sürüm oluştur**)
2. Yeni AAB'yi yükle
3. **Sürüm notları** alanına kullanıcıya görünecek kısa notu yaz, örneğin:

```
• Ana ekranda her bahçenin kaç ağaç olduğu görünüyor
• Görünüm adları sadeleşti: Liste ve Tuval
• Dal rengi seçimin artık kaydediliyor
• Karanlık tema ve okunabilirlik iyileştirmeleri
```

4. **Kaydet → Sürümü incele → Yayına gönder**

---

## 4. Sürüm notu yazma önerisi

İyi bir sürüm notu kısa, madde madde ve kullanıcı dilinde olur. Teknik terim
kullanma. Örnek:

```
• Notlarına artık renk verebilirsin
• Ayarlar artık tek ekranda: yapay zekâ, araçlar ve yedekleme bir arada
• Telefonundan bilgisayarına yazabilir, farenin yerine telefonunu kullanabilirsin
• Metin editöründe onayla/geri al düğmeleri büyütüldü
```

---

## 5. Sürüm geçmişi

| Sürüm kodu | Sürüm adı | Not |
|---|---|---|
| 5 | 1.4.0 | Yedek telefonlarda kurulu eski sürüm |
| 7 | 1.6.0 | Play Store hazırlığı |
| 8 | 1.7.0 | Çoklu AI makroları, dal renkleri, yeni ikon, CORS düzeltmesi |
| 9–40 | 1.8.0–2.1.6 | Ara geliştirme sürümleri |
| 41 | 2.1.7 | Ayarlar arayüzü yenilendi (7 sekme), tema tutarlılığı, bilgisayar araçları |
| 42 | 2.1.8 | Yayın adayı: veri güvenilirliği, güvenlik (SSRF/kota) ve Android lint düzeltmeleri |
| 43 | 2.1.9 | Yayın adayı: not kalıcılığı, veri silme temizliği, içe aktarma doğrulaması, ayar arayüzü tutarlılığı |
| 44 | 2.2.0 | Koyu tema, erişilebilirlik ve kontrast düzeltmeleri, R8 ile küçültme |
| 45 | 2.2.1 | Ana ekranda ağaç sayısı rozeti, görünüm adları (Liste/Tuval), dal rengi kalıcılığı, dokunmatikte yapışan vurgu düzeltmesi |
| 46 | 2.2.2 | Bulut/Yerel yapay zekâ sekmeleri, Gemma 3 indirme rehberi, Android dosya seçicisiyle model ekleme ve yerel motor güncellemesi |
| 47 | 2.2.3 | Kısa yerel model indirme açıklaması, tek Dosya seç düğmesi ve yayın paketinde model yüklemeyi engelleyen R8 alan adı sorununun düzeltmesi |
| 48 | 2.2.4 | Çevrimdışı bildirimi küçük, dokunmaları engellemeyen ve 2,5 saniyede kaybolan bir uyarı hâline getirildi |
| 49 | 2.2.5 | Yerel model tanıtım kartı kaldırıldı; kısa indirme bilgisi, Dosya seç ve cihazdaki model listesi korundu |
| 50 | 2.2.6 | LiteRT-LM motoru ve .litertlm model ekleme; Gemma 4, Qwen ve DeepSeek türevleri için yerel destek |
| 51 | 2.2.7 | Yerel modelleri silme ve liste temizliği; editörde Yerel, Bilgisayar ve Yapay zekâ sekmeleri |
| 52 | 2.2.8 | PC Wi-Fi adres seçimi, kayıtlı Bluetooth bilgisayarıyla yeniden bağlantı ve bağlantı hata bildirimleri |
| 53 | 2.2.9 | PC Wi-Fi güvenlik duvarı engeli düzeltildi; yapay zekâ ayarlarında etkin model adı gösterilir |
| 54 | 2.2.10 | Bilgisayar bağlantısı arayüzü sadeleştirildi; Bluetooth cihazları tarama sırasında listelenir |
| 55 | 2.2.11 | Editörde tam ekran yazma, kalıcı araç sekmesi, tuvalde yeni dala odaklanma, sanal PC klavyesiyle kısayol seçme, Ekran aracı, daha akıcı fare |
