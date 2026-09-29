# Tuval ve editör düzeltmeleri

28 Eylül 2026. Kaynak yedeği: `yedek/tuval-oncesi-20260928-145138`.

- Başlık altındaki dolgu daraltıldı. Kullanıcının metnindeki boş satırlar korunur.
- Kapalı sekmeler DOM'dan kaldırılır; açık kalan bölüm gösterilir.
- Kardeş bağlantıları arasındaki kesintiler kaldırıldı; yuvarlatılmış bağlantılar ve tema uyumlu ızgara kullanıldı.
- Kartların kenarları ve gölgeleri sadeleştirildi; kök kartın aç/kapat düğmesi karta hizalandı.
- Tuval kontrolleri en az 44×44 piksel. Mobil alt boşluk en az 60 piksel; güvenli alan daha büyükse onu izler.
- Yakınlaştırma merkezi korur. Ekrana sığdır düğmesi tüm görünür kartları ve kontrol panelini dikkate alır.
- Klavye kaydırma/yakınlaştırma, kart seçme ve odak göstergeleri eklendi; görünmeyen eylemler odak sırasından çıkarıldı.

`npm run build:android` ve `:app:assembleRelease` başarılı.
`scripts/studio-check.mjs`: kapalı sekmeler, sekme geçişleri, not kalıcılığı,
320/390/1440 piksel taşma kontrolleri, bağlantı sürekliliği, sığdırma,
alt kontrol mesafesi, aç/kapat ve klavye seçimi geçti.
Açık/koyu tema ve masaüstü görüntüleri incelendi.

APK Samsung SM-S721B ve G514'e `install -r` ile kuruldu; açılış ve çalışan
uygulama süreçleri doğrulandı. Cihazlarda notlar silinmedi.
