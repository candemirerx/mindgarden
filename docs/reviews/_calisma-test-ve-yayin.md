# Not Bahçesi — Test, Derleme ve Play Store Yayın Öncesi İnceleme (çalışma raporu)

Tarih: 2026-09-28 · İncelenen sürüm: 2.1.9 (versionCode 43) · Dal: `main`

> Bu dosya, "test et → sorunları tespit et → Play Store'a yüklemeden önce öneri ver" görevinin
> **çalıştırarak doğrulanmış** kısmıdır. Arayüz/erişilebilirlik bulguları ayrı kollarda toplanır;
> burada derleme, çalışma zamanı, paket ve mağaza uyumu sonuçları vardır.

---

## 1. Yönetici özeti — yüklemeden önce mutlaka çözülmesi gerekenler

| # | Önem | Sorun | Kanıt |
|---|---|---|---|
| 1 | **P0** | **Üretim dağıtımı, yereldeki güvenlik düzeltmelerini içermiyor.** Canlı `/api/spellcheck` anonim isteği kabul edip sunucudaki yapay zekâ anahtarını kullanıyor. | Canlı istek → `200 {"correctedText":"Merhaba dünya!"}`; yerel kod aynı istekte `401` döner (`app/api/spellcheck/route.ts:408`) |
| 2 | **P0** | **`/veri-silme` ve `/.well-known/assetlinks.json` canlıda 404.** Veri silme URL'i Play formunda zorunlu; App Links doğrulaması da bu dosyaya bağlı. | `curl -L` → 404 (gövde Next 404 sayfası) |
| 3 | **P0** | **Kök neden: `public/` ve `app/veri-silme/` hiç commit edilmemiş.** `git ls-files public app/veri-silme` → **0 dosya**. Vercel `main` dalından dağıtım yaptığı için bu içerik üretimde yok. | `git status` → `?? public/`, `?? app/veri-silme/` |
| 4 | **P1** | **Mağaza metni ile gizlilik politikası çelişiyor:** mağaza açıklaması "Yapay zekâ anahtarınız cihazdan dışarı çıkmaz" diyor; politika ise anahtarın Vercel rotasına ve sağlayıcıya iletildiğini yazıyor. | `play-store-paketi/belgeler/03-magaza-metinleri.md` vs canlı `/gizlilik` metni |
| 5 | **P1** | **Gemini anahtarı döndürülmeli.** Uç nokta kimliksiz çağrılara açık olduğu sürece anahtar üçüncü kişilerce tüketilebilir. | Aynı kanıt (madde 1) |
| 6 | **P2** | Android'de cleartext trafiği **uygulama genelinde** açık; ayrıca silinmiş bir Supabase projesinin alan adı hâlâ yapılandırmada. | `android/app/src/main/res/xml/network_security_config.xml` |

---

## 2. Çalıştırılan kontroller ve sonuçları

| # | Kontrol | Komut | Sonuç |
|---|---|---|---|
| 1 | Tip denetimi | `npx tsc --noEmit` | **Başarılı** (çıktı yok, exit 0) |
| 2 | Lint | `npm run lint` | **Başarılı**, 1 uyarı: `components/editor/AccountSettings.tsx:224` `<img>`; ayrıca `next lint` kullanımdan kaldırılmış |
| 3 | Üretim derlemesi (depoda) | `npm run build` | **Başarısız (exit 1)** — bozuk webpack önbelleği + `Cannot find module for page: /_document`. Nedeni: aynı anda çalışan iki `next dev` sunucusu (PID 20344 → :3100, PID 51532 → :3000) paylaşılan `.next` klasörüne yazıyor |
| 4 | Üretim derlemesi (izole kopya) | `npx next build` (geçici dizin + `node_modules` junction) | **Başarılı**, 14 statik sayfa; ilk yükleme JS 104–260 kB |
| 5 | Android statik dışa aktarımı | `CAPACITOR_BUILD=1 npx next build` (izole kopya) | **Başarılı** (exit 0), `Exporting 2/2`; `out/` içinde 8 HTML sayfa |
| 6 | Dışa aktarım bütünlüğü | `node docs/reviews/_probe-export.mjs` | **111 yerel varlık referansı, 0 eksik**; tüm sayfalar üretilmiş; `assetlinks.json` geçerli JSON; **0 anahtar sızıntısı** |
| 7 | Canlı uç nokta davranışı | `node docs/reviews/_probe-api.mjs` | Anonim AI isteği **200**; bozuk JSON → 500; aşırı uzun metin → 400 (doğru); `/veri-silme` ve `assetlinks.json` → **404** |
| 8 | Güvenlik doğrulaması (yerel kod) | `node docs/reviews/2026-09-28-guvenlik-dogrulama.cjs` | **5/5 başarılı**: anonim istek 401, SSRF (loopback/eşlemeli IPv6/http) engelli, hız sınırı 429 |
| 9 | Regresyon betiği | `node docs/reviews/2026-09-28-probes.cjs` | **ÇÖKÜYOR (exit 1)**: `Error: Unmocked dependency: ./degisim` → betik bakımsız kalmış |
| 10 | Android lint raporu (28.09.2026 08:46) | `android/app/build/reports/lint-results-release.txt` | **0 hata, 28 uyarı** (izin/App Link hataları kapanmış; uyarılar aşağıda) |
| 11 | AAB doğrulaması | Zip/PKCS#7 ile paket incelemesi | versionCode **43**, versionName **2.1.9**, imzalı (CN=Can Demirer, alias NOTBAHCE), sertifika SHA-256 `3B:19:EC:…:F0:90`; web varlıkları güncel `out/` ile **birebir aynı** (hash eşleşmesi) |
| 12 | HTML enjeksiyon yüzeyi | `rg dangerouslySetInnerHTML/innerHTML/new Function` | `app/`, `components/`, `lib/` içinde **kullanım yok** |

---

## 3. Bulgular

### P0-1 — Canlı yapay zekâ uç noktası kimliksiz isteği kabul ediyor (üretim eski sürümde)

**Kanıt.** Anonim `POST /api/spellcheck` → `HTTP 200` ve `{"correctedText":"Merhaba dünya!"}`.
Sahte bearer belirteci de 200 döndü. Bozuk JSON 400 yerine **500** veriyor; bu davranış, yerel koddaki
`readJsonBody` (400) ile uyuşmuyor. `git show HEAD:app/api/spellcheck/route.ts` içinde
`const apiKey = clientApiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : undefined);`
satırı var; yani **üretim, son commit'in (2ccf7e5, 26.09.2026) kodunu çalıştırıyor.**

**Etki.** Uç nokta, geliştiricinin Gemini kotasını harcayan açık bir geçit; ayrıca "kimliksiz istek reddedilir"
iddiası (README ve inceleme dokümanı) şu an **doğru değil**.

**Öneri.** (1) `app/api/spellcheck/route.ts` değişikliğini commit edip `main`e gönderin ve Vercel'de yeniden dağıtın;
(2) `GEMINI_API_KEY`i Google AI Studio'dan döndürün; (3) Vercel ortamında `AI_ALLOW_SERVER_KEY` **tanımlı olmamalı**;
(4) Supabase kimlik bilgileri boş olduğu için "oturum açmış kullanıcıya ortak anahtar" yolu pratikte erişilemez —
ürün kararı olarak netleştirin (kullanıcı kendi anahtarını girer).

### P0-2 — Veri silme ve App Links adresleri üretimde yok

**Kanıt.** `/` `/gizlilik` `/auth/callback` `/projeler` `/editor` `/bahce_view` → 200;
`/veri-silme` → 404; `/.well-known/assetlinks.json` → 404 (içerik tipi `text/html`, yani Next 404 sayfası).

**Etki.** Play Console "veri silme URL'i" kırık olur (mağaza reddi/uyarısı). Android tarafındaki
`autoVerify` App Links doğrulaması başarısız olur; Google ile girişin `https` dönüş bağlantısı uygulamaya
değil tarayıcıya düşer.

**Kök neden.** `git ls-files public app/veri-silme` → **0 dosya**. İki dizin de yalnızca yerel çalışma
ağacında; Vercel git tabanlı dağıtım yaptığı için içerik hiç yayınlanmadı.

**Öneri.** `public/` (özellikle `public/.well-known/assetlinks.json`) ve `app/veri-silme/` dosyalarını
commit edin → push → Vercel dağıtımını tetikleyin → iki adresi **tekrar test edin** (200 beklenir).
Dağıtım sonrası `assetlinks.json` içine **Play App Signing** SHA-256 parmak izini ekleyin; şu an dosyada
yalnızca yükleme anahtarınızın parmak izi var (`3B:19:EC:…:F0:90`).

### P1-1 — Mağaza metni ile gizlilik politikası çelişiyor

**Kanıt.** Mağaza metni: "Yapay zekâ anahtarınız cihazdan dışarı çıkmaz" (03-magaza-metinleri.md, "VERİLERİNİZ SİZDE KALIR").
Canlı gizlilik politikası: "İşlenecek metin, **API anahtarı**, sağlayıcı seçimi … önce Vercel üzerindeki sunucu
rotasına, ardından seçtiğiniz sağlayıcıya iletilir."

**Etki.** Data Safety beyanı ve mağaza metni arasında tutarsızlık; Play politika incelemesinde
yanıltıcı beyan riski.

**Öneri.** Mağaza metnini gerçek akışa göre düzeltin (ör. "Anahtarınız cihazınızda saklanır; yalnızca isteği
iletmek için uygulamanın sunucu rotasından geçer, orada saklanmaz"). Data Safety formundaki
"Uygulama etkinliği → Diğer kullanıcı içeriği" ve AI beyanı bu haliyle doğru.

### P1-2 — Gemini API anahtarı döndürülmeli

**Kanıt.** `.env.local` içinde gerçek bir `GEMINI_API_KEY` var (dosya `.gitignore` kapsamında, git'te yok).
Uç nokta şu an dışarıya açık (P0-1).

**Öneri.** Anahtarı Google AI Studio'dan döndürün; Vercel ortam değişkenlerini güncelleyin. Derleme
çıktısında anahtar sızıntısı **yok** (probe-export → 0 bulgu), yani istemciye sızmamış.

### P1-3 — Android ağ güvenliği yapılandırması fazla geniş

**Kanıt.** `network_security_config.xml`: `<base-config cleartextTrafficPermitted="true">` (tüm alan adları
için şifresiz trafik) + `domain-config` içinde `supabase.co`, `mindgarden-neon.vercel.app` ve
**silinmiş** proje `zojnjnyjavftnscbnikv.supabase.co`. Manifest'te `usesCleartextTraffic="true"`,
`capacitor.config.ts` içinde `allowMixedContent: true`. Lint bunu `InsecureBaseConfiguration` olarak işaretliyor.

**Etki.** Aynı ağdaki bir saldırgan HTTP trafiğini okuyabilir/değiştirebilir; Play incelemesinde
güvenlik gerekçesi sorulabilir.

**Öneri.** `base-config` değerini `false` yapın, yalnızca gerçekten gereken yerel adresleri
`domain-config` ile istisna yazın; ölü domain kaydını silin; `allowMixedContent`i kapatmayı deneyin.
Bilgisayar araçlarındaki düz HTTP, dokümanda "şifrelenmez, güvenilen ağda kullanın" diye zaten beyan edilmiş.

### P2-1 — `.next` paylaşımı derlemeyi bozuyor (bugün iki kez yaşandı)

**Kanıt.** `npm run build` bozuk önbellek hatalarıyla düştü; aynı anda iki `next dev` süreci çalışıyordu.
İzole kopyada derleme sorunsuz geçti. Ayrıca `.codex-build.log` bu hatanın (`Unexpected end of JSON input`)
daha önce de alındığını gösteriyor.

**Öneri.** Derleme öncesi dev sunucusunu durdurun; CI'da `NEXT_DIST_DIR` benzeri ayrı çıktı klasörü kullanın
(`distDir` yapılandırması) veya `npm run build:android`i temiz bir kopyada çalıştırın.
`.codex-build.log` dosyasını silin veya `.gitignore`a ekleyin.

### P2-2 — Otomatik test kapısı yok, mevcut betik bozuk

**Kanıt.** `2026-09-28-probes.cjs` → `Error: Unmocked dependency: ./degisim`; `lib/aiProvider.ts` yeni bir
bağımlılık kazandığında betik kırılmış. Test/CI yapılandırması (`package.json` içinde `test` betiği) yok.

**Etki.** 2.1.9'da düzeltilen davranışlar (kota hatası, silinen içerik, misafir→Google geçişi) bir sonraki
değişiklikte sessizce geri dönebilir.

**Öneri.** Betik sahtekârlıklarını (`./degisim`) güncelleyin; `npm test` altında `tsc --noEmit`, `lint`,
güvenlik betiği ve bu sondaları birleştirin; GitHub Actions ile `main`e giden her değişiklikte çalıştırın.

### P2-3 — `google-services.json` yalnızca web tipi OAuth istemcisi içeriyor

**Kanıt.** Dosyadaki tek `oauth_client` kaydı `client_type: 3` (web); `client_type: 1` (Android) kaydı yok.
Uygulama `GoogleAuth` eklentisini `serverClientId` ile kullanıyor ve Drive yedeklemesi bu oturumun
`accessToken`ına bağlı (`lib/driveSync.ts:165-194`).

**Etki.** Google ile giriş/Drive yedekleme akışı cihazda hata verebilir (ör. DEVELOPER_ERROR). Yalnızca
gerçek cihazda doğrulanabilir; statik analizle kesinleştirilemedi.

**Öneri.** Play Console'a yüklemeden önce imzalı bir APK'yı gerçek cihaza kurup Google ile giriş + Drive
yedeklemeyi test edin. Google Cloud Console'da Android OAuth istemcisinin (paket adı + yükleme
anahtarı SHA-1/SHA-256) tanımlı olduğunu doğrulayın.

### P3 — Küçük maddeler

- `android/app/src/main/res/xml/file_paths.xml` FileProvider'ı `external-path` ve `cache-path` için
  `path="."` ile tüm dizine açıyor; yalnızca gereken alt dizinleri verin.
- `allowBackup="false"` yerine Android 12+ için `android:dataExtractionRules` ekleyin (lint uyarısı).
- Adaptive ikonda `monochrome` katmanı yok → temalı simgelerde ikon görünmüyor (lint `MonochromeLauncherIcon`).
- `AccountSettings.tsx:224` `<img>` → `next/image` (tek lint uyarısı).
- `next lint` yerine ESLint CLI'ye geçin (Next 16'da kaldırılıyor); `caniuse-lite` ve
  `baseline-browser-mapping` verisi 2–10 ay eski.
- Çökme raporlama yok (Play Console/ACRA); ilk sürümde "Android vitals"ı canlı izlemek için önerilir.
- Ubiquitous: `docs/reviews/`, `public/`, `app/veri-silme/`, `components/editor/*` gibi 29 dosya/dizin
  hâlâ **untracked** — sürüm etiketlemeden önce tamamı commit edilmeli.

---

## 4. Play Store'a yüklemeden önce adım adım kontrol listesi

**A. Kaynak ve dağıtım**

1. `public/` ve `app/veri-silme/` dahil tüm untracked dosyaları commit edin; `main`e push edin.
2. Vercel dağıtımının tamamlandığını doğrulayın: `/veri-silme` ve `/.well-known/assetlinks.json` **200** dönmeli.
3. Canlı AI uç noktasına anonim istek atın; **401** beklenir (`node docs/reviews/_probe-api.mjs`).
4. `GEMINI_API_KEY`i döndürün; Vercel'de `AI_ALLOW_SERVER_KEY` tanımlı olmadığından emin olun.

**B. Uygulama paketi**

5. `npm run build:android` (temiz ortam) → `out/` yenilenir ve `cap sync` ile `android/app/src/main/assets/public`e kopyalanır.
6. `android/app/build.gradle` içindeki `versionCode`/`versionName` ile `lib/config.ts` `APP_VERSION` ve
   README sürümünü eşitleyin (şu an üçü de 2.1.9 / 43 — tutarlı, koruyun).
7. `android/keystore.properties` ile release imzalı AAB üretin; AAB'nin imzalı olduğunu doğrulayın
   (mevcut AAB imzalı: CN=Can Demirer, alias NOTBAHCE).
8. Cihaz testi: kurulum, ilk açılış, çevrimdışı açılış, Google ile giriş, Drive yedekleme, bilgisayar araçları,
   dikte, dik yazı tipi/sistem yazı boyutu.

**C. Play Console**

9. App Signing etkinleştirildikten sonra **Play imzalama sertifikasının SHA-256** parmak izini
   `public/.well-known/assetlinks.json` içine ekleyin ve yeniden dağıtın.
10. Veri silme URL'i: `https://mindgarden-neon.vercel.app/veri-silme` (dağıtımdan sonra 200 olmalı).
11. Gizlilik politikası URL'i: `https://mindgarden-neon.vercel.app/gizlilik` (şu an 200).
12. Data Safety formunu `play-store-paketi/belgeler/04-veri-guvenligi.md` ile doldurun; **mağaza metnini**
    P1-1'e göre düzeltin.
13. Mağaza görselleri hazır ve ölçüleri uygun: ikon 512×512, öne çıkan görsel 1024×500, 4 adet 1080×2160
    ekran görüntüsü (kısa açıklama 69/80 karakter). 1080×2160 tam olarak 2× sınırında; Play uyarı verirse
    1080×1920 veya 1440×2560 ile yeniden çekin.
14. İçerik derecelendirmesi (IARC) anketini doldurun, hedef kitle 18+ seçin, reklam yok beyanı verin.
15. Hassas izinler (`RECORD_AUDIO`, `BLUETOOTH_SCAN/CONNECT`, `ACCESS_FINE_LOCATION` maxSdk 30) için
    gerekçe metinlerini hazır tutun; dikte için uygulama içi "öne çıkan açıklama" bulunduğundan emin olun.

**D. Yayın sonrası**

16. Play Console → Android vitals: ANR/çökme oranını izleyin.
17. İlk hafta AI uç noktası isteklerini ve Gemini kotasını izleyin (istismar erken görülsün).

---

## 5. Sınırlar — doğrulanamayan noktalar

- **Gradle/googlegradle derlemesi yeniden çalıştırılmadı.** Android lint sonucu bugün 08:46'da üretilmiş
  raporundan okundu (0 hata, 28 uyarı); kaynak ağacı o saatten beri değişmedi.
- **Cihaz/emülatör testi yapılmadı.** Google ile giriş, Drive yedekleme, BLE/Wi-Fi bilgisayar bağlantısı,
  dikte ve TalkBack yalnızca gerçek cihazda doğrulanabilir (P2-3 bu yüzden "şüphe" olarak işaretlendi).
- **Tarayıcı tabanlı uçtan uca arayüz testi yapılamadı**: bu oturumda bilgisayar kullanımı tarayıcısı
  kullanılamıyor ("Codex auth token is unavailable"). Bu nedenle arayüz akışları HTTP/dışa aktarım
  düzeyinde doğrulandı; ekran etkileşimleri ayrı arayüz kolunun raporunda.
- **Mağaza görsel ölçüsü** Play Console'a yüklenmeden kesinleşmez; 1080×2160 "en fazla 2×" kuralının tam sınırında.
