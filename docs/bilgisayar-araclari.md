# Bilgisayar araçları

Not Bahçesi editöründe Yazı, Fare, Makro ve Dikte görünümleri bulunur. **Bilgisayara yaz** düğmesi editörün gövde metnini (başlığı değil) PC'deki odaklı alana yazar. Doğrudan PC bağlantısında Windows yardımcısı, kart bağlantısında kartın USB HID klavyesi kullanılır. Kart yolunda kartın USB kablosu hedef PC'ye takılı olmalıdır; kart üzerinden fare ve konum makroları BLE NUS gerektirir.

Fare, Dikte, Bilgisayara Yaz, Bilgisayar Panosuna Gönder ve Kısayollar, Ayarlar → Araçlar altında mevcut dört yerel araçla aynı listede ayrı aç/kapat kartlarıdır. Etkin araç sayısı hepsini kapsar. Editörde Kısayollar, Fare, Dikte, Bilgisayara Yaz ve Pano düğmeleri yerel araçların **aynı yatay satırında** görünür; ayrıca üçüncü/dördüncü araç satırı açılmaz. Kapatılan araç bu satırdan kalkar.

Kısayollar düğmesi yazı alanının yerine **makro panosunu** açar. Pano tek ve boş bir kutudur; metin yazma alanı, toplanan metin bölmesi ya da ikinci bir kutu yoktur. Kutuya yalnızca eklediğiniz kişisel kısayollar numpad düzeninde, eklendikleri sırayla buton olarak dizilir ve her biri tek dokunuşla çalışır. Kutunun sonundaki **Makro Ekle** kutusu makro penceresini panonun üzerinde açar; başlıktaki **Makroları ayarla** düğmesi ise Ayarlar → Düzenleme araçları → Kişisel kısayollar bölümüne götürür. İki yol da aynı listeye yazar. Konum ve klavye kısayolu makroları doğrudan bilgisayarda iş görür, hazır metin makrosu bilgisayarın odaklı alanına yazılır; hiçbiri notun metnini değiştirmez. Kişisel kısayollar Araçlar listesinde de tek tek açılıp kapatılır.

Makro eklerken tür, Ayarlar → Düzenleme araçları → Kişisel kısayollar bölümündeki **Makro Ekle** düğmesiyle açılan pencereden seçilir: **Konum**, **Kısayol** veya **Metin**. Pencere telefonda tam ekran açılır; üstte boşluk kalmaz, gövde kaydırılır, alt düğmeler güvenli alanda durur. Kısayol türünde CTRL+C, ALT+TAB gibi hazır düğmeler alanı doldurur. Konum türünde **Konum seç** tam ekran seçiciyi açar: haritaya dokunarak noktayı taşırsınız, **Merkeze al** hem ekrandaki noktayı hem bilgisayar imlecini ortaya getirir, sağ alttaki yönlük İnce/Orta/Kaba adımlarla noktayı ve imleci eş zamanlı hareket ettirir, **PC'de bu konuma tıkla** denemeyi yapar, **Bu noktayı kullan** konumu kaydeder. Yönlük düğmesi basılı tutulduğunda nokta durmadan kayar; tek dokunuş tek adım atar. Kayıtlı konum için tek tık veya çift tık seçilebilir; makro çalıştırıldığında bilgisayar o konuma gidip tıklar. Fare yüzeyinde sürükleme imleci hareket ettirir, kısa tek dokunuş sol tık gönderir; yüzey ekranın kalanını tamamen kaplar ve sol tık/kaydırma düğmeleri alt güvenli alanın üstünde durur.

**Sıralı** türü birden fazla adımı tek makroda birleştirir. Adımlar Metin, Kısayol, Tıklama (kayıtlı konuma tek/çift tık) veya başka bir kayıtlı Makro olabilir; okla sıralanır ve yazıldıkları sırayla, aralarında kısa bir beklemeyle çalışır. Bir adım başarısız olursa makro durur ve hangi adımın hata verdiği gösterilir. Kendini (dolaylı da olsa) çağıran makro zinciri çalıştırılmaz.

Ayarlar → Düzenleme araçları → **Profiller ve kısayol düğmeleri** bölümünde makrolar profillere gruplanır ve sıraları belirlenir. Aynı bölümde istenen sayıda **kısayol düğmesi** eklenir; her düğme bir profile bağlanır. Editör araç çubuğunda her düğme ayrı görünür ve dokunulduğunda makro panosu yalnızca bağlı profilin makrolarıyla açılır. Genel **Kısayollar** düğmesi tüm hazır makroları göstermeye devam eder.

**Köprü Dikte** ve **Köprü Yaz** da aynı Araçlar listesinde ayrı ayrı açılıp kapatılır. Köprü Dikte, Ayarlar → Bilgisayar sekmesindeki 5–3600 saniyelik süre boyunca (veya elle durdurulana kadar) konuşmanızı dinler ve konuşma sürerken seçili bağlantı üzerinden doğrudan PC'ye yazar; cümle düzeltildikçe bilgisayardaki metin de düzeltilir, yazılmış sözler kaybolmaz. Not metnini değiştirmez. **Köprü Yaz** açıldığında yazma alanı yerinde kalır: notta yazdığınız metin aynı anda bilgisayara da yazılır, sildiğiniz karakterler bilgisayarda da silinir. Düğme açılırken var olan not içeriği gönderilmez; yalnızca açıkken yazdıklarınız aktarılır. Aktarım sürerken yazmaya devam edebilirsiniz; bağlantı koparsa not çalışmaya devam eder, satırdaki durum yazısı hatayı gösterir ve **Yeniden dene** ile aktarım kaldığı yerden sürer. Aynı düğmeye yeniden dokunmak aktarımı kapatır; panel açılmaz, ekran değişmez. Hedef PC'deki imlecin yazma sırasında başka yere taşınmaması gerekir.

Dikte hedefini Ayarlar → Bilgisayar sekmesindeki Araç davranışı bölümünden seçin. **Not metnine yaz** tanınan konuşmayı editöre ekler/değiştirir; **Doğrudan bilgisayara yaz** tanınan sözü seçili bağlantı üzerinden PC'deki odaklı alana yollar ve not metnine dokunmaz. Android ses tanıma bir konuşma oturumu başlatır; uygulama arka planda dinlemez, yalnızca araç açıkken çalışır. Tanıyıcı kısmi sonuç vermezse metin cümle sonunda gelir; Köprü Dikte o durumda da sözü kaybetmez, kesinleşen cümleyi aktarır.

## Bağlantı

Ayarlar → Bilgisayar sekmesinde dört yol görünür:

- **Doğrudan PC (Wi‑Fi):** Kart gerekmez. Hedef Windows bilgisayarda [pc_kontrolu_baslat.cmd](../scripts/pc_kontrolu_baslat.cmd) dosyasını açın. Telefonla PC aynı güvenilen yerel ağdayken penceredeki PC adresini ve anahtarı girin. Metin, fare, kısayol ve pano işlemleri PC yardımcısına gider.
- **PC Bluetooth (klasik):** Kart ve COM portu kurulumu gerekmez. Windows ve Android'i Bluetooth ayarlarında eşleştirin, güncel PC yardımcısını açın. Yardımcı kendi Bluetooth alıcısını yayımlar; `vendor` klasörünü yardımcıyla birlikte tutun. Uygulamada **PC Bluetooth** yolunu seçip bağlantı satırını yapıştırın, eşleşmiş bilgisayarınızı seçin ve **Bağlantıyı dene** ile sınayın. Bilgisayar seçimi kaydedilir; sonraki komutta bağlantı yeniden kurulabilir. Eski yardımcılar için gelen COM portu desteği korunur; `-BluetoothPort COM3` yalnız bu eski yol içindir.
- **Kart Wi‑Fi:** Metin `/api/keys`, tuş/kısayol `/api/rkey`, fare `/api/rmouse` ile gider; kısayol, fare yüzeyi ve görünen klavyeler kart Wi‑Fi'da da çalışır. Kart her isteği ~0,3–0,7 sn'de yanıtladığı için görünen klavyede hızlı basılan harfler tek istekte birleştirilir. Bellenim 2.34.0 ve sonrası Wi‑Fi, kendi AP'si ve BLE'yi aynı anda açık tutar. KablosuzBellek kartını BOOT tuşuna uzun basarak Wi‑Fi moduna alın (eski 2.33.x yazılımlarda). Kart AP'sinde varsayılan adres `http://192.168.4.1`'dir; aynı ev/iş ağında kartın aldığı adresi girin veya yerel ağda kart arayın. Kartın USB kablosu hedef PC'de olmalı.
- **Kart BLE:** Kartı BOOT tuşuna uzun basarak Bluetooth moduna alın ve “KablosuzBellek” NUS yayınına bağlanın; eski kartlarda ad “USB HID Klavye” olabilir. Kartın USB kablosu hedef PC'de olmalı. Mevcut 2.33.1 kart yazılımı Bluetooth modunda Wi‑Fi radyosunu kapatır; iki kart yolu aynı anda etkin değildir. Kart güncellendikten sonra bağlantı hemen kesiliyorsa yalnızca ilgili kartın eski eşleştirmesini kaldırıp yeniden eşleştirin.

PC Bluetooth LE (BLE) için Windows bilgisayarın ayrıca uygulamaya uygun GATT sunucusu yayımlaması gerekir. Mevcut PowerShell yardımcısı bunu sağlamaz; doğrudan PC BLE bağlantısı bu sürümde **desteklenmiyor**. Wi‑Fi güç tasarrufu ayrı bir Wi‑Fi protokolü değildir. Uygulama BLE desteği varmış gibi sahte başarı göstermez.

Yerel ağda kart tarama yalnız Android paketinde çalışır ve sadece Kablosuz Bellek durum yanıtı veren adresleri listeler. Tarayıcıda Bluetooth ve Android ses tanıma köprüsü bulunmaz; destekleyen tarayıcılarda Web Speech denenir.

Kartın mevcut Wi‑Fi web sunucusunda parola yapılandırılmışsa bu sürümde `/api/keys` için kimlik doğrulama alanı yoktur; böyle bir kartta Wi‑Fi ile yazma kullanılamaz. BLE yolunu kullanın. Bağlantı sonucunu ekrandaki durum satırında kontrol edin; hata sessizce başarı sayılmaz.

## PC yardımcısı nedir?

Yardımcı program, hedef bilgisayarda açık kalan küçük bir alıcıdır: telefondaki bağlantı üzerinden gelen yazı, fare, kısayol ve pano isteklerini Windows'a uygular. Kurulum gerektirmez (Windows'un kendi PowerShell'i çalışır) ve uygulamanın bir parçası değildir; yalnızca çalıştığı bilgisayarda iş görür.

- Bilgisayar başına bir kez açılır, oturum başına yeniden başlatılır: PC kapanınca alıcı da durur; masaüstündeki **Not Bahçesi PC Yardımcısı** kısayolundan yeniden açılır.
- Başka bir bilgisayarda kullanmak için o PC'de aynı betiği açıp pencerenin kopyaladığı `adres|anahtar` satırını telefonda **Kaydet** ile almak yeterlidir; telefonda yeniden kurulum ya da ayar değişikliği gerekmez.
- Telefon ile bilgisayar aynı güvenilen yerel ağda olmalıdır; her istek erişim anahtarıyla doğrulanır. Yardımcı, Windows kullanıcı oturumu açıkken çalışır ve panoya bu oturumda yazar.

## PC panosuna doğrudan gönderme

Kartın `/api/text` ve BLE `w:` komutu **PC panosuna yazmaz**: SD kartta sonradan PC'de çalıştırılacak dosya üretir. Gerçek, anlık PC pano işlemi için yardımcı program zorunludur:

1. PC'de masaüstündeki **Not Bahçesi PC Yardımcısı** kısayoluna çift tıklayın ve pencereyi açık bırakın. Kısayol yoksa [pc_yardimcisi_baslat.cmd](../scripts/pc_yardimcisi_baslat.cmd) dosyasına çift tıklayın. Windows'un kendi PowerShell'i kullanılır; Python veya başka paket kurulmaz. (Eski `pc_kontrolu_baslat.cmd` ve `pc_panoyu_baslat.cmd` de aynı alıcıyı başlatır.)
2. Windows yönetici izni sorar; **Evet** deyin. Bu izin, telefonun bağlanacağı TCP 8765 kapısını güvenlik duvarına (yalnız **Özel ağ** profili) bir kez eklemek için kullanılır. Kural olmadan telefon PC'ye ulaşamaz: bağlantı denemesi zaman aşımına uğrar, pano ve fare işlemleri çalışmaz. Kuralı elle eklemek için yönetici PowerShell'de `scripts/pc_guvenlik_duvari.ps1` dosyasını çalıştırın.
3. Açılan pencere adresi ve erişim anahtarını **tek satır** olarak panonuza kopyalar: `http://PC-IP:8765|anahtar`. Telefonda Ayarlar → Bilgisayar sekmesindeki **Bağlantı kodu** alanına yapıştırıp **Kaydet** düğmesine dokunun; adres ve anahtar alanları kendiliğinden dolar. Elle de girebilirsiniz: IP'yi `192.168.1.20:8765` biçiminde yazmanız yeterlidir, `http://` eklenmese de kabul edilir.
4. **Bağlantıyı dene**, ardından isterseniz **Pano aktarımını dene** ile sınayın. Editörde **PC panosu** düğmesi notun tamamını bilgisayarın panosuna kopyalar; gönderim sürerken ve bitince ekranın altında birkaç saniyelik kısa bir bildirim görünür. Windows panosu başka bir uygulamada kısa süre meşgulse yardımcı yazmayı birkaç kez yeniden dener. Klasik Bluetooth seçiliyse IP girmeniz gerekmez.

Uçtan uca doğrulama (28.09.2026, Windows PC): `/health` yanıtı `{"ok":true,"app":"not-bahcesi-clipboard"}`, `/clipboard` isteği panoya yazdı ve `Get-Clipboard` ile birebir eşleşti, yanlış ya da eksik anahtar 401 ile reddedildi, `/input` `ping` isteği kabul edildi. Aynı gün telefondan yapılan bağlantı denemesi **zaman aşımına** uğradı: yardımcı 0.0.0.0:8765 üzerinde dinliyor ve Wi-Fi ağı Özel profilde olmasına karşın Windows gelen bağlantıyı engelliyordu. Bu yüzden tek tıkli başlatıcı yönetici izniyle `pc_guvenlik_duvari.ps1` betiğini çalıştırıp TCP 8765 için gelen izni ekler. Yardımcı hâlâ çalışmıyorsa sırayla bakın: pencere açık mı, izin kuralı eklendi mi, telefonla PC aynı ağda mı, ağ profili Özel mi.

Yardımcı program kullanıcı oturumunda çalışmalı; Windows panosuna yazması için oturum açık olmalıdır. Güvenlik Duvarı sorarsa yalnız **Özel ağ** izni verin. Program tüm arabirimlerde dinler fakat her istekte 256-bit rastgele anahtar ister; anahtar `scripts/.pc_clipboard_token` dosyasında saklanır ve Git tarafından yok sayılır. Yerel HTTP trafiği şifrelenmez: ortak/güvenilmeyen ağda veya internete açarak kullanmayın. İş bitince Ctrl+C ile kapatın. Anahtarı başkası gördüyse programı durdurup token dosyasını güvenle değiştirerek yeniden başlatın. Bu yardımcı uygulama Play Store APK'sının parçası değildir; PC'de ayrıca çalıştırılmalıdır. Eski Python sürümü `scripts/pc_clipboard_helper.py` isteğe bağlı olarak kalır ve aynı anahtar dosyasını kullanır.

## Kartla bağlıyken pano

Kablosuz Bellek kartı bilgisayara yalnız klavye ve fare olarak görünür; Windows panosuna yazamaz. Kart Wi‑Fi veya Kart BLE seçiliyken pano için PC yardımcısı yine gerekir. Bilgisayar bağlantısı sayfasındaki **PC panosu (kartla birlikte)** bölümüne bağlantı kodunu yapıştırın; kart bağlantısı değişmeden pano yardımcı üzerinden gönderilir. Yardımcı kurulmamışsa editördeki pano düğmesi bunu açıkça söyler.

## Ekran aracı

Editörün bilgisayar şeridindeki **Ekran** düğmesi, Ayarlar → Düzenleme araçları → **Ekran düzenleri** bölümünde tasarlanan bölmeli ekranı açar. Her düzen iki sütun ve dört bölmeden oluşur; sütun genişliği ile iki sütunun üst bölme yükseklikleri kaydırıcıyla ayarlanır. Her bölmeye fare yüzeyi, yön tuşları, metin yazma, kısayollar (bir profil ya da tüm makrolar) veya boş atanabilir; boş bölme yer kaplamaz. Birden çok düzen varsa ekranın üstünden seçilir.

## Sanal klavyeyle kısayol seçme

Makro düzenleyicide kısayol alanının altındaki **Klavyeden seç** düğmesi sanal PC klavyesini açar. CTRL, ALT, SHIFT ve WIN basılı kalır ve mavi yanar; ardından basılan normal tuşla kombinasyon (ör. `CTRL+S`) alana yazılır ve değiştiriciler bırakılır. Sıralı makrodaki kısayol adımlarında da aynı klavye vardır.

## İzinler ve yayın kontrolü

Android uygulaması BLE tarama/bağlantı için Yakındaki Cihazlar (Android 12+) veya eski sistemlerde konum; Dikte için mikrofon izni ister. Kamera ve diğer not özellikleri bu izinlerden bağımsızdır. Pano ve kart işlemleri kullanıcı eylemiyle başlar, arka planda metin gönderilmez. Mağaza veri güvenliği ve gizlilik açıklamalarında mikrofon, yerel ağ cihazı iletişimi ve PC pano aktarma özelliğini belirtin. Yayına geçmeden gerçek kart + Windows PC üzerinde BLE yazma/fare/makro, Wi‑Fi yazma ve pano uçtan uca denenmeli; USB kart firmware'i bu değişiklikte güncellenmez.

## Kart yazabildiği karakterler ve bellenim 2.35.0

Kart, metni USB klavye olarak **Türkçe Q** düzeniyle yazar; PC'nin klavye dili Türkçe Q olmalıdır. Bellenim 2.35.0 ile AltGr simgeleri (`@ # $ € ₺ { } [ ] \ | < > ~ ^`) ve BLE yolunda Delete/Home/End/PgUp/PgDn/Insert tuşları eklendi. Daha eski bellenimli kartta bu simgeler ve tuşlar sessizce yok sayılır; kartı güncelleyin. Uygulama, kartın hiç yazamadığı bir karakter gönderilmek istendiğinde sessizce atlamak yerine durum satırında uyarı gösterir.

ESP32-S3 N16R8 gibi SD yuvası olmayan kartlarda 2.35.0, dosyaları 16 MB flash içindeki ~9,9 MB'lık `ffat` bölümünde tutar (`/api/status` → `sd.storage: "flash"`). Web/BLE dosya yöneticisi ve pano dosyaları aynı şekilde çalışır; **USB disk modu yalnız SD kartta** çalışır.

Ekran düzeni testi: `npm run dev` açıkken `node scripts/ekran-duzeni-tur.mjs` (sahte PC yardımcısı ve sahte kartla 31 sınama).

## Uçtan uca doğrulama — 3 Ekim 2026

Kart: ESP32-S3 N16R8, bellenim 2.35.2. Her yol, PC'de odaktaki Not Defteri'ne Türkçe harf, AltGr simgeleri, noktalama ve Enter yazdırılıp pano üzerinden birebir karşılaştırılarak sınandı (odak kartın USB faresiyle verildi):

| Yol | Sonuç |
|---|---|
| Kart Wi‑Fi (ev ağı, PC'den) | 7/7: Türkçe, AltGr, noktalama, Enter/Tab, geri sil, Home, tek tek harf |
| Kart Wi‑Fi (ev ağı, telefondan) | geçti |
| Kart AP (telefon "can bellek s3" ağında, 192.168.4.1) | geçti |
| Kart BLE (telefondan) | 3/3 |
| PC Wi‑Fi (yardımcı) | geçti |
| PC Bluetooth (klasik, telefondan) | geçti (PC'de Bluetooth açık olmalı) |

Bulunan ve düzeltilen hatalar: kartta USB HID raporları uç nokta meşgulken düşüyordu (Shift/AltGr ve harf kaybı; 2.35.1–2.35.2); PC yardımcısı hızlı Unicode yazımda karakterleri son harfle değiştiriyordu ("abc 123" → "abc 333"; karakter başına 3 ms ara eklendi, uygulamanın PC parça boyutu 1000 bayta indi).

Notlar: Bu PC'de ShareX tek başına `Oemtilde` tuşunu (TR-Q'da `"`) kısayol olarak yakalar; `"` yazılmaz, yakalama penceresi açılır. Aynı telefondaki başka bir uygulama (ör. KablosuzBellek) karta bağlıyken Android tek ortak bağlantı açar; Not Bahçesi bu bağlantıya katılır ve tarama, bağlı kartı da listeler. Cihaz testleri: `gradlew assembleReleaseAndroidTest -PtestBuildType=release`, sonra `am instrument -e class com.notbahcesi.app.CardBleDeviceTest -e cardAddress … -e cardUrl …` (yazma testleri yalnız `typeB64` verilince çalışır).

## Bağlantı kurulumu (2.2.12)

Ayarlar → Bilgisayar bağlantısı ekranı her yol için numaralı adımlar gösterir; her adım tamamlanınca onay işareti alır, hata aynı yerde açıklanır.

- **Bilgisayar · Wi‑Fi:** PC'de yardımcıyı açın; pencere **6 haneli eşleştirme kodu** gösterir. Telefonda "Ağda bilgisayar ara" yardımcıyı yerel ağda bulur (anahtarsız `/hello` ucu, port 8765), kodu yazınca uzun erişim anahtarı `/pair` ucundan alınır. Bulunamazsa adres elle yazılır; eski "bağlantı satırı" yolu Gelişmiş altında durur.
- **Bilgisayar · Bluetooth:** "Bluetooth ayarlarını aç" ile telefon PC ile eşleştirilir, "Eşleşmiş bilgisayarları göster" önce bilgisayar sınıfındaki cihazları listeler (kulaklık vb. katlanır). Aynı 6 haneli kod RFCOMM üzerinden gider. Wi‑Fi ile eşleşilmişse anahtar ortaktır, kod gerekmez. PC'de Bluetooth açık olmalı.
- **Kart · Wi‑Fi:** Telefon kartın kendi ağındaysa (192.168.4.x) adres kendiliğinden 192.168.4.1 olur; değilse ev ağı taranır (adres başına 1,5 sn bekleme; kart Wi‑Fi'ı BLE ile radyoyu paylaştığı için yanıtı 0,5 sn'yi aşabiliyor). "Dene" kartın yazılım sürümünü ve ev ağı adresini gösterir.
- **Kart · Bluetooth:** Taramada kartlar önce gelir; telefona zaten bağlı kart (başka uygulama üzerinden) da listelenir.

Eşleştirme güvenliği: kod her açılışta rastgele üretilir; yanlış denemede 1 sn beklenir, 5 yanlışta kod yenilenir, toplam 20 yanlışta eşleştirme o oturumda kapanır. `/hello` yalnız uygulama ve bilgisayar adını verir.

Testler: `node scripts/baglanti-tur.mjs` (ekran, 20 sınama); cihazda `CardBleDeviceTest#pairsWithPcHelper -e pcPin <kod> [-e pcAddress <PC BT adresi>]` ve `#findsCardOnLocalWifi -e expectCardUrl http://<kart>`.

## Sıralı makroda bekleme

Sıralı makroya **Bekle** adımı eklenebilir: hazır süreler (0,25 · 0,5 · 1 · 2 · 3 · 5 · 10 sn) ya da 0,05 sn – 10 dk arası istenen süre. İki adımın arasındaki **+ Bekleme** düğmesi tam oraya 1 sn'lik bekleme koyar. Bekleme adımı, adımlar arasındaki varsayılan 150 ms'lik aranın yerine geçer. Test: `node scripts/makro-bekleme-tur.mjs` (ölçülen 1,5 sn bekleme ≈ 1509 ms).

## Canlı bağlantı göstergesi ve tek kullanımlık kod (2.2.12)

- **Gösterge yalnız gerçek durumu söyler.** Ayarlar → Bilgisayar bağlantısı'nın üstünde "Editör bu yolu kullanıyor: … · Bağlı / Bağlantı yok / Kurulmadı" şeridi, editörün Bilgisayar araç satırında da aynı gösterge vardır. Seçili yol editörün kullandığı fonksiyonlarla yoklanır (PC: anahtarla ping; kart Wi‑Fi: `/api/status`; kart BLE: bağlantı açık mı, değilse kayıtlı karta yeniden bağlanma). Ayarlarda 20 sn'de, editörde 30 sn'de bir ve her araç hatasından sonra yenilenir. Eskiden yol kartındaki yeşil nokta yalnız "bilgiler kayıtlı" demekti ve kart kipindeyken PC panosu için yapılan eşleşme "Bilgisayar · Wi‑Fi" kartını da yeşil gösteriyordu; artık seçili kartta "Kullanılıyor/Bağlı/Bağlantı yok", diğerlerinde yalnız gri "kurulu" yazar.
- **Tek program:** "PC yardımcısı" ile "pano yardımcısı" aynı programdır. *Bilgisayara yaz*, görünen klavye ve makrolar metni tuş tuş yazar; *Panoya gönder* metni panoya koyar (Ctrl+V). Kart yollarında yazma/fare/kısayol için yardımcı gerekmez; yalnız pano için gerekir.
- **Tek kullanımlık kod:** Yardımcı açılınca 6 haneli kod gösterir; bir telefon eşleşince kod yenilenir. Eşleşen telefon anahtarı saklar, yardımcı yeniden açılsa da kod sormaz. Yardımcı artık açılırken PC panosuna bağlantı satırı kopyalamaz (eski satır `-ElleSatir` ile pencerede gösterilir).
- **İndirme:** Play Store kullanıcıları yardımcıyı `https://mindgarden-neon.vercel.app/pc` sayfasından indirir (zip: `public/indir/not-bahcesi-pc-yardimcisi.zip`, `node scripts/yardimci-zip.mjs` üretir). Uygulamadaki kurulum adımında "Yardımcı bilgisayarda yok mu?" altında adres ve paylaş düğmesi vardır. Sayfa ve zip ancak site yeniden dağıtıldığında yayına çıkar.

Cihaz doğrulaması (3 Ekim 2026, G514 + ESP32-S3 N16R8 + Windows PC): `CardBleDeviceTest#editorPathsEndToEnd` editörün fonksiyonlarıyla (window.__nbUzak) dört yolu kurup yoklar ve her yoldan Not Defteri'ne satır yazar; dört satır ve kart kipindeki pano birebir doğru. `#statusSignalsAreHonest` yardımcı kapalı/adres yanlış/kurulum eksik durumlarında göstergenin "hata"/"kurulmadi" verdiğini doğrular.
