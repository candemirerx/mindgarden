# Yazı atölyesi tasarımı — 28 Eylül 2026

Değişiklik öncesi kaynak yedeği: `yedek/tasarim-oncesi-20260928-135159/`.
Derleme önbellekleri ve bağımlılıklar yedek kapsamı dışındadır. Yedekler Git ve
TypeScript taramasından çıkarılmıştır.

Editör: tema değişkenleriyle kâğıt yüzeyi, sade araç şeritleri, odak modu,
metinle büyüyen ve ekran döndürüldüğünde boyutlanan yazı alanı, görünür kayıt
durumu ve otomatik kayıt anahtarı. Ana sayfa ve Android simgesi aynı filizli
defter işaretini kullanır. Uygulama adı korunmuştur.

Doğrulama:
- TypeScript ve Next üretim derlemesi başarılı.
- `node scripts/studio-check.mjs`: 390 / 320 / 1440 piksel genişlik, yatay
  taşma, odak moduna giriş/çıkış, uzun metin, otomatik kayıt ve yeniden yükleme,
  ekran genişliği değişince metin alanının boyutlanması başarılı.
- Açık/koyu tema ekran görüntüleri görsel olarak incelendi.
- `:app:assembleRelease`: BUILD SUCCESSFUL.
- Samsung SM-S721B ve G514: `adb install -r` başarılı; MainActivity açıldı,
  iki cihazda da uygulama süreci doğrulandı. Uygulama verileri silinmedi.

Yerel güncelleme mevcut 2.2.1 / 45 sürüm numarasıyla kuruldu; mağazaya yayınlanmadı.
APK: `android/app/build/outputs/apk/release/app-release.apk`

SHA-256 (tuval revizyonu): `4FEFD59D39F18A0622801313A893A5684AFEE9E71D7648AA867479E5AA17D008`

## Kompakt revizyon

Üst bölüm tek satır, tüm araçlar tek yatay kaydırılabilir şerit oldu. Mobilde
tekrarlanan başlık ve dekoratif not defteri satırı kaldırıldı. Üst bölümün
115 pikselden kısa olması ve üst butonların en az 44 piksel dokunma yüksekliği
otomatik olarak doğrulandı. Önceki kayıt ve ekran boyutu testleri tekrar geçti.
İmzalı APK Samsung ve G514'e yeniden kuruldu, iki uygulama süreci doğrulandı.
Revizyon öncesi yedek: `yedek/kompakt-oncesi-20260928-141517/`.

## İkon sekmeleri

Geri ve ayarlar arasına araçlar/yapay zekâ sekmeleri eklendi. İkinci satırda
yalnızca seçili bölüm yer alır. Klavye okları, erişilebilir adlar ve seçili durum
tanımlıdır. 379 piksel altındaki ekranlarda kopyalama, dışa aktarma menüsüne
taşınır; dokunma alanları küçülmez. Onay bekleyen sonuçlar görünür kalır.
Sekme geçişi ve önceki tüm arayüz testleri geçti. Samsung ve G514'e imzalı APK
kuruldu, açılışları doğrulandı. Yedek: `yedek/sekmeler-oncesi-20260928-142458/`.

## Kısayol panosu sadeleştirmesi

Kısayol panosu tek ve boş bir kutuya indirildi: "toplanan metin" şeridi, karalama
defteri, panodaki Makro Ekle düğmesi ve "Nota dön" düğmesi kaldırıldı. Panoya
yalnızca eklenen makrolar numpad düzeninde, eklendikleri sırayla dizilir; makro
ekleme ve düzenleme Ayarlar → Düzenleme araçları → Kişisel kısayollar bölümünden
yapılır. Nota dönüş, araç çubuğundaki Kısayollar düğmesine yeniden basmakla olur;
pano açıkken araç sekmesi değişirse veya odak modu açılırsa kendiliğinden nota
dönülür. Hazır metin makrosu artık biriktirilmez, bilgisayarın odaklı alanına
yazılır; ağ kaynaklı hatalar Türkçe anlatılır.

Doğrulama:
- TypeScript ve Next üretim derlemesi başarılı.
- `node scripts/studio-check.mjs`: 53 PASS / 0 FAIL. Boş panonun tek boş kutu
  olması, panoda textarea bulunmaması, ekleme ve geri düğmelerinin kalkması,
  makroların eklendikleri sırayla dizilmesi, ayarlardan ekleme/düzenleme ve
  araç düğmesiyle nota dönüş sınandı.
- Ekran görüntüleri: `kisayol-panosu.png`, `kisayol-panosu-dark.png`,
  `makro-ayarla.png`, `makro-ayarlari.png`, `konum-secici.png`.
- `:app:assembleRelease`: BUILD SUCCESSFUL; Samsung SM-S721B ve G514'e kuruldu.
- APK SHA-256: 76C10F68B10355831337A9E409F4977BB6823E775957CB7FFB46960BB9893C1D

Yedek: `yedek/pano-sadelestirme-oncesi-20260928-1849/`.

## Köprü Dikte oturum yenileme sesi, tam ekran makro penceresi ve PC yardımcısı

Köprü Dikte her beş saniyede bir kendini yeniden başlatıp açılış/kapanış tonu
çalıyordu. Android tarafı Kablosuz Bellek uygulamasındaki çözüme çevrildi:
tanıyıcı artık bölümlü oturumla (`SEGMENTED_SESSION`) çalışır, sessizlik
sınırı oturumu kapatmaz yalnızca segmenti bitirir; kısmi sonuçlar açılır,
segment sonuçları toplanır ve oturum sonucu metni tekrar eklenmez. Sessizlik
sınırları 3 sn / 1,5 sn / 1 sn, hata kodlarına göre bekleme süreleri
(1,2,4,10,11 → 1,5 sn; 5 → 150 ms; 6,7 → 100 ms; 8 → iptal + 400 ms)
tanımlıdır. Dikte boyunca bildirim, sistem ve müzik akışları kısılıp sonunda
geri verilir. Hata mesajları artık ham soket metni yerine nedeni yazar.

Makro ekleme penceresi telefonda tam ekran açılır (`fixed inset-0`,
`100dvh`, güvenli alan dolguları); arkada şeffaf şerit kalmaz. Konum
seçicideki yönlük düğmesi basılı tutulduğunda durmadan kayar.

PC yardımcısı için uygulama içi kurulum üç adıma indirildi ve masaüstüne
**Not Bahçesi PC Yardımcısı** kısayolu eklendi; tek tıkla kurulum (yönetici
izni + TCP 8765 güvenlik duvarı kuralı + panoya bağlantı satırı) çalışır.

Doğrulama:
- `npx tsc --noEmit` ve `npm run lint` temiz; `next build` başarılı.
- `node scripts/studio-check.mjs`: 64 PASS / 0 FAIL.
- `compileReleaseJavaWithJavac` ve `:app:assembleRelease`: BUILD SUCCESSFUL.
- PC yardımcısı uçtan uca (28.09.2026, Windows PC): `/health` →
  `{"ok":true,"app":"not-bahcesi-clipboard"}`, `/clipboard` panoya yazdı ve
  `Get-Clipboard` ile birebir eşleşti, yanlış anahtar 401 ile reddedildi,
  `/input` hareket isteği kabul, geçersiz girdi 400 ile reddedildi. Eksik olan
  tek halka güvenlik duvarı kuralıydı: kural yokken Wi-Fi profili Özel olsa da
  telefon PC'ye ulaşamıyor. Kuralı ekleyen tek tıkli başlatıcı bu yüzden
  birinci adımdır.
- APK iki telefona kuruldu (Samsung SM-S721B, G514); uygulama açılışı,
  ana sayfa ve tuval ekranı cihazda doğrulandı, logcat temiz.
- APK SHA-256: 04D2D26032258B9937153A867FD10B0268DD6CFA7AE924A2B306A9BE0EB1CC8C

Yedek: `yedek/tam-ekran-ve-yaz-senkron-20260928-2034/`.

## Köprü Dikte canlı aktarım, PC yardımcısı kartı ve hydration düzeltmesi

Köprü Dikte konuşma bitmeden yazmıyordu. İki neden vardı: Android eklentisi
tanınan metni canlı bildirmiyordu ve telefondaki kurulum 28.09 tarihli paketti.
Eklenti artık her değişimde tanınan metnin son hâlini (`text`) ve kesinleşen
cümleyi (`kesin`) bildirir; editör ortak önekten sonraki farkı yazar, cümle
düzeltilince bilgisayardaki metin de düzelir ve yazılmış söz kaybolmaz.
Bağlantı koparsa düğmenin "Bitiriliyor…" durumunda kilitlenmesi giderildi.
Köprü Dikte sürerken durum yazısı yazılan karakter sayısını gösterir.

Ayarlar → Bilgisayar bağlantısı → **PC yardımcısı** kartı yeniden tasarlandı:
numaralı üç adım kutusu, başlıkta "Bağlantı hazır / Bağlantı yok" rozeti,
etiketli **Adres** ve **Erişim anahtarı** alanları, tek yönlendirme şeridi ve
sadeleştirilmiş BLE notu. Uzun madde listesi ve üst üste paragraflar kalktı.
Kılavuzun işaret ettiği ama arayüzde bulunmayan **Köprü Dikte’de konuşurken
anında yaz** anahtarı Araç davranışı bölümüne eklendi (varsayılan açık).
Kısayol panosunda makro kutularının üstündeki "Dokunduğunuz makro bilgisayarda
çalışır." satırı kaldırıldı; pano yalnızca makro düğmelerini taşır.

Tema betiği ilk boyamadan önce `<html>` üzerine `style` yazdığı için React
hydration uyuşmazlığı bildiriyordu; `app/layout.tsx` içindeki `<html>` öğesine
`suppressHydrationWarning` eklendi.

Doğrulama:
- `npx tsc --noEmit` ve `npx next lint` temiz; `CAPACITOR_BUILD=1 next build`
  başarılı; `npx cap sync android` ve `:app:assembleRelease` BUILD SUCCESSFUL.
- `node scripts/studio-check.mjs`: 64 PASS / 0 FAIL.
- `/editor` headless Chrome ile açıldı; hydration uyuşmazlığı uyarısı
  düzeltmeden sonra görünmüyor.
- APK iki telefona kuruldu (Samsung SM-S721B, G514), uygulama açıldı,
  logcat’te FATAL/AndroidRuntime hatası yok; kısayol panosu cihazda doğrulandı.
- APK SHA-256: F289EAA0435077DFED392ABD8E4A113ABDB5FC0A00845E22BB689A3ADA9521C1

Yedek: `yedek/kopru-dikte-canli-ve-ayar-tasarim-20260929-0830/`.

## Sade varsayılan: Araçlar ve Yapay zekâ satırları kapalı

Editör ilk açılışta sade bir yazı ekranı gösterir: **Araçlar** ve **Yapay zekâ**
satırları artık varsayılan olarak kapalıdır. `lib/uiPrefs.ts` içindeki
`bolumAcik` yalnızca kayıt `"1"` ise açık döner; kayıt yoksa bölüm kapalıdır.
Kullanıcı bunları **Ayarlar → Düzenleme araçları** bölümündeki iki anahtarla
açar, seçim cihazda kalıcı olur. Kullanım kılavuzuna da bu adım eklendi.

Cihaz testi (Samsung SM-S721B, USB):
- Yeni paket kuruldu; ana sayfa, tuval ve editör gezildi, çökme yok.
- Ayarlar → Düzenleme araçları ekranında yeni açıklama göründü; **Yerel
  araçlar** anahtarı kapatıldığında editörde araç satırı tümüyle kayboldu
  (yalnızca başlık, metin ve üst şerit kaldı) ve ayar kalıcı oldu.
- G514 (ağ üzerinden) güncellendi, uygulama çökmeden açıldı, logcat temiz.

Doğrulama:
- `npx tsc --noEmit` ve `npx next lint` temiz; `CAPACITOR_BUILD=1 next build`
  başarılı; `npx cap sync android` ve `:app:assembleRelease` BUILD SUCCESSFUL.
- `node scripts/studio-check.mjs` hatasız tamamlandı (0 FAIL).
- APK imzası doğrulandı (`apksigner verify`): CN=Can Demirer, OU=NotBahcesi.
  `android/keystore.properties` ve `android/app/notbahcesi-release.jks` git
  tarafından yok sayılıyor; repoda değil.
- APK SHA-256: 2887F0231C953E3116633BB1DA755561D216CFF01CFCAEFEA655DB5C6F772ACF

Yedek: `yedek/sade-varsayilan-20260929-1930/`.

### Play Store paketi (29.09.2026)

`gradlew bundleRelease` ile güncel koddan imzalı AAB üretildi ve
`play-store-paketi/uygulama/` klasörüne yazıldı (önceki kopya 28.09 tarihliydi).

- `not-bahcesi-2.2.1.aab` (5.049.878 bayt) SHA-256:
  `16203E47406739E04EF48C7F3B6C3CAECE261295B41545A32DB14E18AEB3D76B`
- `not-bahcesi-2.2.1.apk` (4.736.787 bayt) SHA-256:
  `2887F0231C953E3116633BB1DA755561D216CFF01CFCAEFEA655DB5C6F772ACF`
- AAB imzası `jarsigner -verify` ile doğrulandı (release anahtarı, kendinden imzalı).
- Sürüm alanları değişmedi: versionCode 45, versionName 2.2.1, targetSdk 36.
- Yayına çıkmadan önce Vercel dağıtımı güncellenmeli: canlı sitede `/gizlilik`
  200 dönerken `/veri-silme` **404** veriyor; Play, hesap silme adresi ister.
