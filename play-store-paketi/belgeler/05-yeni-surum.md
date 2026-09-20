# Yeni Sürüm Çıkarma

Play Store'a yüklenmiş bir uygulamaya güncelleme göndermek için sürüm kodunu
artırman ve yeni bir paket üretmen gerekir.

---

## 1. Sürüm numarasını artır

`android/app/build.gradle` dosyasını aç ve şu iki satırı güncelle:

```gradle
versionCode 9          // her yüklemede 1 artır — Play bunu zorunlu tutar
versionName "1.8.0"    // kullanıcının gördüğü sürüm
```

> `versionCode` daha önce kullandığın bir değere eşit veya küçük olursa Play yüklemeyi
> reddeder. Yayınlanan en yüksek değerin üzerine çık.

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

Yeni dosya: `android/app/build/outputs/bundle/release/app-release.aab`

Telefona kurup denemek istersen debug paketini de üretebilirsin:

```
gradlew.bat assembleDebug
```

---

## 3. Play Console'a yükle

1. **Test etme → Kapalı test → Yeni sürüm oluştur**
   (veya doğrudan **Üretim → Yeni sürüm oluştur**)
2. Yeni AAB'yi yükle
3. **Sürüm notları** alanına kullanıcıya görünecek kısa notu yaz, örneğin:

```
• Dallara renk verme eklendi
• Yapay zekâ makroları artık açılıp kapatılabiliyor
• Küçük hata düzeltmeleri
```

4. **Kaydet → Sürümü incele → Yayına gönder**

---

## 4. Sürüm notu yazma önerisi

İyi bir sürüm notu kısa, madde madde ve kullanıcı dilinde olur. Teknik terim
kullanma. Örnek:

```
• Notlarına artık renk verebilirsin
• Metin editöründe onayla/geri al düğmeleri büyütüldü
• Drive yedekleme hızlandırıldı
```

---

## 5. Sürüm geçmişi

| Sürüm kodu | Sürüm adı | Not |
|---|---|---|
| 5 | 1.4.0 | Yedek telefonlarda kurulu eski sürüm |
| 7 | 1.6.0 | Play Store hazırlığı |
| 8 | 1.7.0 | Çoklu AI makroları, dal renkleri, yeni ikon, CORS düzeltmesi |
| 9 | 1.8.0 | (sıradaki sürüm için ayrıldı) |
