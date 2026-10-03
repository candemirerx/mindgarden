# İzin Gerekçeleri ve İnceleme Cevapları

Play Console inceleme sırasında izin gerekçesi sorarsa (ya da "Hassas izinler" uyarısı
çıkarsa) aşağıdaki metinleri kullan. Cevaplar uygulamanın gerçek davranışını anlatır;
manifest ve gizlilik politikası ile aynıdır.

## Mikrofon — `RECORD_AUDIO`

**Neden:** Dikte özelliği. Kullanıcı "Dikte" düğmesine bastığında konuşması metne çevrilip
notuna eklenir; "Köprü Dikte" kullanılırsa aynı metin kullanıcının kendi bilgisayarına yazılır.
Ses yalnızca kullanıcı düğmeye bastığı sürece işlenir. Kayıt cihazda saklanmaz, uygulamanın
sunucusuna gönderilmez; tanımayı Android'in konuşma tanıma servisi yapar. Arka planda dinleme
yoktur, uygulama ön planda değilken mikrofon kullanılmaz.

## Bluetooth — `BLUETOOTH`, `BLUETOOTH_ADMIN` (Android 11 ve altı), `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`

**Neden:** Kullanıcı kendi bilgisayarını ya da BLE kartını uygulamaya bağlar; fare, klavye ve
dikte köprüsü bu bağlantı üzerinden çalışır. `BLUETOOTH_SCAN` beyanı `neverForLocation` ile
verilmiştir: tarama konum çıkarımı için kullanılmaz. Arka planda cihaz taraması yapılmaz,
bulunan cihaz listesi hiçbir yere gönderilmez; yalnızca kullanıcıya gösterilir.

## Bluetooth görünürlüğü — `BLUETOOTH_ADVERTISE`

**Neden:** "Bilgisayar · Bluetooth" özelliğinde telefon, kullanıcının kendi bilgisayarına standart
Bluetooth klavye ve fare (HID cihaz profili) olarak bağlanır; bilgisayara program kurulmaz. İlk
eşleştirmede kullanıcı "Telefonu görünür yap" düğmesine dokunduğunda Android'in onay penceresiyle
telefon 120 saniye görünür olur. Arka planda reklam yapılmaz, konum çıkarımı yoktur.

## Konum — `ACCESS_FINE_LOCATION` (yalnızca `maxSdkVersion=30`)

**Neden:** Android 11 ve altında BLE taraması için sistem bu izni zorunlu tutar. Uygulama
konumu okumaz, kaydetmez ve iletmez. Android 12 ve üzerinde bu izin hiç istenmez.

## Şifrelenmemiş yerel bağlantı — `usesCleartextTraffic="true"`

**Neden:** Bilgisayar araçları, telefon ile kullanıcının **kendi bilgisayarında** çalışan
yardımcı program arasında yerel ağ üzerinden çalışır (örn. `http://192.168.1.20:8765`). Bu
trafik kullanıcının kendi güvenilen ağındaki kendi cihazına gider, internete çıkmaz.
Uygulamanın internete giden tüm trafiği (hesap, yedekleme, yapay zekâ sağlayıcıları) HTTPS'tir.

## Diğer izinler

- `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`: İsteğe bağlı hesap ve Drive
  yedeklemesi, yapay zekâ sağlayıcısı çağrıları ve yerel ağdaki bilgisayarı bulmak için.
- `MODIFY_AUDIO_SETTINGS`: Dikte sırasında ses akışının yönetimi için.

## İncelemede sık sorulan sorular

| Soru | Cevap |
|---|---|
| Uygulama hesap gerektiriyor mu? | Hayır. "Yerel Modda Gir" ile hesap açmadan tüm özellikler kullanılabilir. |
| Ses kaydı sunucuya gidiyor mu? | Hayır; yalnızca cihazdaki Android konuşma tanıma servisine. |
| Arka planda çalışan servis var mı? | Hayır, ön plan servisi veya kalıcı arka plan işi yok. |
| Reklam var mı? | Hayır. |
| Uygulama içi satın alma var mı? | Bu sürümde yok. |
| Kullanıcı verisi satılıyor mu? | Hayır, hiçbir veri satılmaz veya reklam amacıyla kullanılmaz. |
| Veriler nerede tutuluyor? | Notlar cihazda; yedekleme (açılırsa) kullanıcının kendi Google Drive hesabında. |
| Silme talebi nasıl iletilir? | https://mindgarden-neon.vercel.app/veri-silme sayfasındaki adımlar veya aynı sayfadaki e-posta. |

