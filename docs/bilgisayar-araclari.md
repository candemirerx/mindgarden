# Bilgisayar araçları

## Güncel yardımcı indirme akışı — 10 Ekim 2026

Uygulamanın PC yardımcısı bölümünde ve `/pc` indirme sayfasında **Paylaş**, **Linki kopyala** ve **Bilgisayara linki yaz** bulunur. Link yazma, PC yardımcısı olmadan çalışan Bluetooth HID veya kart BLE/Wi-Fi/AP yolunu kullanır; PC Wi-Fi/Tailscale alıcısına düşmez. Önce hedef PC'de tarayıcının adres çubuğuna odak verin (Ctrl+L); link yazıldıktan sonra Enter'a kendiniz basın. Yazma yolunu burada seçmek editörün kayıtlı bağlantısını değiştirmez. Bluetooth yolları Android uygulamasını gerektirir; kartın USB kablosu hedef PC'de olmalı ve PC klavye dili Türkçe Q olmalıdır.

Yeni ZIP düzeni: ana klasörde **BASLAT.cmd** (önerilen Bluetooth/kart girişi), **WIFI.cmd** (mevcut ağ izniyle doğrudan PC Wi-Fi) ve **OKUBENI.txt**; `scripts` içinde birlikte tutulacak teknik bileşenler; `ileri` içinde yalnız yöneticiye özel güvenlik duvarı betiği. Ana başlatıcı admin istemez. ZIP'in tamamını çıkarın, yalnız bir başlatıcı açın, pencereyi açık bırakın. Yeni Tailscale kurulumu ve güvenlik duvarı değişikliği normal kullanıcı akışına dahil değildir. Kurum kısıtlarını aşmayın.

Kontroller: `node scripts/yardimci-indirme-test.mjs` indirme kartının eylemlerini taşıma taklitleriyle sınar; `node scripts/baglanti-tur.mjs` gerçek tarayıcıda uygulama ve `/pc` arayüzünü sınar. Bunlar gerçek Bluetooth/kart donanım testi yerine geçmez. Önceki sürümler için aşağıdaki `scripts/pc_yardimcisi_baslat.cmd` girişi yeni paket içinde de korunur; günlük kullanımda ana klasördeki BASLAT.cmd tercih edilir.

Not Bahçesi editöründe Yazı, Fare, Makro ve Dikte görünümleri bulunur. **Bilgisayara yaz** düğmesi editörün gövde metnini (başlığı değil) PC'deki odaklı alana yazar. Doğrudan PC bağlantısında Windows yardımcısı, kart bağlantısında kartın USB HID klavyesi kullanılır. Kart yolunda kartın USB kablosu hedef PC'ye takılı olmalıdır; kart üzerinden fare ve konum makroları BLE NUS gerektirir.

Fare, Dikte, Köprü Dikte, Bilgisayara Yaz (eski Köprü Yaz ile birleşik), Bilgisayar Panosuna Gönder ve Kısayollar, Ayarlar → Araçlar altında mevcut dört yerel araçla aynı listede ayrı aç/kapat kartlarıdır. Etkin araç sayısı hepsini kapsar. Editörde Kısayollar, Fare, Dikte, Bilgisayara Yaz ve Pano düğmeleri yerel araçların **aynı yatay satırında** görünür; ayrıca üçüncü/dördüncü araç satırı açılmaz. Kapatılan araç bu satırdan kalkar.

Kısayollar düğmesi yazı alanının yerine **makro panosunu** açar. Pano tek ve boş bir kutudur; metin yazma alanı, toplanan metin bölmesi ya da ikinci bir kutu yoktur. Kutuya yalnızca eklediğiniz kişisel kısayollar numpad düzeninde, eklendikleri sırayla buton olarak dizilir ve her biri tek dokunuşla çalışır. Kutunun sonundaki **Makro Ekle** kutusu makro penceresini panonun üzerinde açar; başlıktaki **Makroları ayarla** düğmesi ise Ayarlar → Düzenleme araçları → Kişisel kısayollar bölümüne götürür. İki yol da aynı listeye yazar. Konum ve klavye kısayolu makroları doğrudan bilgisayarda iş görür, hazır metin makrosu bilgisayarın odaklı alanına yazılır; hiçbiri notun metnini değiştirmez. Kişisel kısayollar Araçlar listesinde de tek tek açılıp kapatılır.

Makro eklerken tür, Ayarlar → Düzenleme araçları → Kişisel kısayollar bölümündeki **Makro Ekle** düğmesiyle açılan pencereden seçilir: **Konum**, **Kısayol** veya **Metin**. Pencere telefonda tam ekran açılır; üstte boşluk kalmaz, gövde kaydırılır, alt düğmeler güvenli alanda durur. Kısayol türünde CTRL+C, ALT+TAB gibi hazır düğmeler alanı doldurur. Konum türünde **Konum seç** tam ekran seçiciyi açar: haritaya dokunarak noktayı taşırsınız, **Merkeze al** hem ekrandaki noktayı hem bilgisayar imlecini ortaya getirir, sağ alttaki yönlük İnce/Orta/Kaba adımlarla noktayı ve imleci eş zamanlı hareket ettirir, **PC'de bu konuma tıkla** denemeyi yapar, **Bu noktayı kullan** konumu kaydeder. Yönlük düğmesi basılı tutulduğunda nokta durmadan kayar; tek dokunuş tek adım atar. Kayıtlı konum için tek tık veya çift tık seçilebilir; makro çalıştırıldığında bilgisayar o konuma gidip tıklar. Fare yüzeyinde sürükleme imleci hareket ettirir, kısa tek dokunuş sol tık gönderir; yüzey ekranın kalanını tamamen kaplar ve sol tık/kaydırma düğmeleri alt güvenli alanın üstünde durur.

**Sıralı** türü birden fazla adımı tek makroda birleştirir. Adımlar Metin, Kısayol, Tıklama (kayıtlı konuma tek/çift tık) veya başka bir kayıtlı Makro olabilir; okla sıralanır ve yazıldıkları sırayla, aralarında kısa bir beklemeyle çalışır. Bir adım başarısız olursa makro durur ve hangi adımın hata verdiği gösterilir. Kendini (dolaylı da olsa) çağıran makro zinciri çalıştırılmaz.

Ayarlar → Düzenleme araçları → **Profiller ve kısayol düğmeleri** bölümünde makrolar profillere gruplanır ve sıraları belirlenir. Aynı bölümde istenen sayıda **kısayol düğmesi** eklenir; her düğme bir profile bağlanır. Editör araç çubuğunda her düğme ayrı görünür ve dokunulduğunda makro panosu yalnızca bağlı profilin makrolarıyla açılır. Genel **Kısayollar** düğmesi tüm hazır makroları göstermeye devam eder.

**Köprü Dikte** de aynı Araçlar listesinde açılıp kapatılır; eski **Köprü Yaz**, **Bilgisayara Yaz** ile tek araç oldu: dişlisinden **Düğmeyle** (notun tamamı bir kerede) ya da **Yazdıkça canlı** (notta yazılan anında bilgisayara da yazılır) biçimi ve hedef (bilgisayar / not metni / ikisi birden) seçilir. Hedef yalnız bilgisayarsa canlı yazma kapanınca not açıldığı hâline döner. Köprü Dikte, Ayarlar → Bilgisayar sekmesindeki 5–3600 saniyelik süre boyunca (veya elle durdurulana kadar) konuşmanızı dinler ve konuşma sürerken seçili bağlantı üzerinden doğrudan PC'ye yazar; cümle düzeltildikçe bilgisayardaki metin de düzeltilir, yazılmış sözler kaybolmaz. Not metnini değiştirmez. **Köprü Yaz** açıldığında yazma alanı yerinde kalır: notta yazdığınız metin aynı anda bilgisayara da yazılır, sildiğiniz karakterler bilgisayarda da silinir. Düğme açılırken var olan not içeriği gönderilmez; yalnızca açıkken yazdıklarınız aktarılır. Aktarım sürerken yazmaya devam edebilirsiniz; bağlantı koparsa not çalışmaya devam eder, satırdaki durum yazısı hatayı gösterir ve **Yeniden dene** ile aktarım kaldığı yerden sürer. Aynı düğmeye yeniden dokunmak aktarımı kapatır; panel açılmaz, ekran değişmez. Hedef PC'deki imlecin yazma sırasında başka yere taşınmaması gerekir.

Dikte ve Köprü Dikte'nin ayarları aracın kendi **dişli** simgesindedir (Ayarlar → Düzenleme araçları → Bilgisayar araçları; araç kapalıyken de açılır). **Nereye yazılsın?** üç seçenek sunar: **Not metni** (tanınan konuşma editöre eklenir/değiştirilir), **Bilgisayar** (seçili bağlantı üzerinden PC'deki odaklı alana yollanır, not değişmez) ve **İkisi birden**. Köprü Dikte için ayrıca dinleme süresi (5–3600 sn), "durdurana kadar dinle" ve "konuşurken anında yaz" burada; Dikte için "mevcut metnin sonuna ekle" burada. Ses tanıma motoru (Telefon / Bulut / Yerel) ise Bilgisayar bağlantısı → Dikte motoru bölümündedir. Android ses tanıma bir konuşma oturumu başlatır; uygulama arka planda dinlemez, yalnızca araç açıkken çalışır. Tanıyıcı kısmi sonuç vermezse metin cümle sonunda gelir; Köprü Dikte o durumda da sözü kaybetmez, kesinleşen cümleyi aktarır.

## Bağlantı

Ayarlar → Bilgisayar sekmesinde dört yol görünür:

- **Doğrudan PC (Wi‑Fi):** Kart gerekmez. Hedef Windows bilgisayarda [pc_yardimcisi_baslat.cmd](../scripts/pc_yardimcisi_baslat.cmd) dosyasını açın; pencere 6 haneli eşleştirme kodunu gösterir. Telefonla PC aynı güvenilen yerel ağda olmalı. Metin, fare, kısayol ve pano işlemleri PC yardımcısına gider.
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

1. PC'de masaüstündeki **Not Bahçesi PC Yardımcısı** kısayoluna çift tıklayın ve pencereyi açık bırakın. Kısayol yoksa [pc_yardimcisi_baslat.cmd](../scripts/pc_yardimcisi_baslat.cmd) dosyasına çift tıklayın. Windows'un kendi PowerShell'i kullanılır; Python veya başka paket kurulmaz. Eski `pc_kontrolu_baslat.cmd`, `pc_panoyu_baslat.cmd` ve Python sürümü 2.2.12 ile kaldırıldı; doğrudan yerel ağ için ayrıca `pc_yardimcisi_wifi.cmd` vardır.
2. Programı **yönetici olarak çalıştırmanız gerekmez** ve başlatıcı yönetici penceresi açmaz. Varsayılan başlatıcı kart USB, Bluetooth ve kurulu Tailscale hizmetini kullanır; TCP 8765 yalnız `127.0.0.1` üzerinde dinler. Tailscale bu portu özel ağınıza yönlendirir; mevcut diğer yayınları ve güvenlik duvarını değiştirmez. Doğrudan yerel ağ için `pc_yardimcisi_wifi.cmd` dosyasını açın. Windows gelen Wi-Fi bağlantısını engelliyorsa sistem yöneticisinin verdiği güvenlik duvarı izni gerekir. İlk Tailscale kurulumu ve kurum politikaları ayrıca sistem izni gerektirebilir.
3. Penceredeki adresi telefonda bilgisayar bağlantısına girin; ilk eşleştirmede 6 haneli kodu kullanın. Yardımcı bilgisayar panosunu değiştirmez. Eski `http://PC-IP:8765|anahtar` biçimi yalnız gelişmiş elle kurulum içindir; başlatırken `-ElleSatir` verilirse gösterilir.
4. **Bağlantıyı dene**, ardından isterseniz **Pano aktarımını dene** ile sınayın. Editörde **PC panosu** düğmesi notun tamamını bilgisayarın panosuna kopyalar; gönderim sürerken ve bitince ekranın altında birkaç saniyelik kısa bir bildirim görünür. Windows panosu başka bir uygulamada kısa süre meşgulse yardımcı yazmayı birkaç kez yeniden dener. Klasik Bluetooth seçiliyse IP girmeniz gerekmez.

Uçtan uca doğrulama (28.09.2026, Windows PC): `/health` yanıtı `{"ok":true,"app":"not-bahcesi-clipboard"}`, `/clipboard` isteği panoya yazdı ve `Get-Clipboard` ile birebir eşleşti, yanlış ya da eksik anahtar 401 ile reddedildi, `/input` `ping` isteği kabul edildi. Aynı gün doğrudan Wi-Fi bağlantısı güvenlik duvarı nedeniyle zaman aşımına uğradı. O tarihteki başlatıcının otomatik yönetici isteme adımı 06.10.2026'da kaldırıldı. Yeni varsayılan Tailscale yolunda her iki cihazın Tailscale oturumu, adres ve yardımcı penceresi kontrol edilir; doğrudan Wi-Fi için aynı yerel ağ ve mevcut güvenlik duvarı izni gerekir.

Yardımcı program kullanıcı oturumunda çalışmalı; Windows panosuna yazması için oturum açık olmalıdır. Varsayılan ağ dinleyicisi yalnız loopback üzerindedir; Tailscale özel ağ bağlantısını taşır. Wi-Fi başlatıcısı tüm arabirimlerde dinler. Eşleştirme dışındaki işlemler 256-bit rastgele anahtar ister; anahtar `scripts/.pc_clipboard_token` dosyasında saklanır ve Git tarafından yok sayılır. Yerel Wi-Fi HTTP trafiği şifrelenmez; güvenilen ağ kullanın. İş bitince Ctrl+C ile kapatın. Yardımcı APK'nın parçası değildir; PC'de ayrıca çalıştırılır. Normal yetkili yardımcı, Windows'un koruması nedeniyle yönetici olarak açılmış uygulamalara tuş gönderemeyebilir. Telefon belleğini sürücü harfiyle bağlamak için WebClient hizmeti gerekir; hizmet sistem politikası nedeniyle açılamazsa tarayıcı erişimi kullanılabilir.

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

## Sıralı makronun çalışma biçimi

Sıralı makro düzenleyicisindeki **Düğmeye basınca** bölümünden seçilir; panoda, ekran düzeninde ve ayarlardaki **Çalıştır** düğmesinde aynı davranış geçerlidir:

- **Normal:** dokununca bir kez çalışır (bilgisayar tuşu gibi).
- **Sayılı:** dokununca **Kaç kez** alanındaki sayı kadar (1–1000) art arda çalışır. Çalışırken yeniden dokunmak durdurur.
- **Anahtar:** ilk dokunuş açar, makro yeniden dokunulana kadar baştan tekrar eder.
- **Basılı tut:** düğme basılı tutuldukça tekrar eder, bırakınca durur.

Tekrarlanan biçimlerde **Turlar arası** bekleme (0–600 sn) verilebilir; en az 150 ms ara her zaman bırakılır. Çalışan makronun düğmesi yeşil çerçeveyle vurgulanır ve köşesinde tur sayısı (sayılıda `2/5`) görünür. Durdurma, o anki adım bitince (bekleme adımındaysa hemen) olur. Test: `node scripts/makro-calisma-tur.mjs` (17 kontrol).

## Açılışta otomatik bağlanma (2.2.15)

Bir yol bir kez kurulduysa telefonda her seferinde Ayarlar'ı açıp **Bağlan** demek gerekmez. Uygulama açıldığında (ilk boyamadan ~1,5 sn sonra) ve uygulama arka plandan öne geldiğinde seçili yol kendiliğinden kurulur. Ayarlar → Bilgisayar bağlantısı ekranındaki **Açılışta otomatik bağlan** anahtarıyla kapatılabilir (varsayılan açık).

- **Bilgisayar · Bluetooth:** telefon, kayıtlı bilgisayara yine Bluetooth klavye/fare olarak bağlanır. Bilgisayarın yanında duran telefon (ör. GM24 Pro) için pratik olan yol budur.
- **Bilgisayar · Wi‑Fi / Tailscale:** kayıtlı yardımcıya anahtarlı ping atılır; yanıt gelmezse sessizce bırakılır.
- **Kart · Wi‑Fi:** kayıtlı adres yoklanır; telefon kartın kendi ağına (192.168.4.x) geçmişse kart `192.168.4.1`'den aranır ve bulunursa tercih "Kart · AP"ye kendiliğinden döner.
- **Kart · Bluetooth:** bağlantı açıksa bir şey yapılmaz. Değilse önce kayıtlı kart adresi denenir; kart adresi değişmişse kart yeniden taranır ve adı kart adına benzeyen (KablosuzBellek, USB HID Klavye, can bellek s3 / can00 …) en güçlü aday seçilir. Bağlanan adres bir sonraki açılış için saklanır.

Kurallar: aynı oturumda iki deneme arası en az 90 sn; hata açılışta pencere olarak gösterilmez, durum şeridi gerçek sonucu yazar; tarayıcıda (PWA) otomatik bağlanma denenmez. Otomatik bağlanma için **Yakındaki cihazlar** izninin bir kez verilmiş olması gerekir (izin yoksa Android izin penceresi açılmaz, deneme sessizce başarısız olur).

Ayarlar sayfasındaki **Bağlantı türlerini sına** düğmesi kurulu yolları sırayla, editörün kullandığı fonksiyonlarla gerçek istekle yoklar ve hangisinin yanıt verdiğini yazar.

## İkinci uygulama (yan yana kurulum)

Aynı kaynaktan, farklı paket adı ve farklı görünen adla ikinci bir APK üretilir; iki uygulama aynı telefonda yan yana kurulabilir:

```
cd android
.\gradlew.bat assembleRelease -Puygulama=ikiz
```

- Birincil kopya: `com.notbahcesi.app` · "Not Bahçesi" · Play sürümü. Bayrak verilmeden derlenir; çıktı yolu değişmez (`android/app/build/outputs/apk/release/app-release.apk`).
- İkinci kopya: `com.notbahcesi.app2` · "Not Bahçesi 2". Aynı imza anahtarı ve aynı web paketi kullanılır, bu yüzden iki APK aynı klasöre yazılır: birincil APK'yı önce başka bir adla kopyalayın, sonra ikinci kopyayı derleyin.

İkinci kopyada Google ile giriş ve Drive yedeği kullanılmaz: `google-services.json` yalnız birincil paket için tanımlı, ikinci paket için OAuth istemcisi yok. Bu yüzden Google Hizmetleri eklentisi ikinci derlemede uygulanmaz. Not tutma, bağlantı araçları ve tüm yerel özellikler aynıdır.

## Telefon kabloyla karta bağlanamaz

Kart yollarında **USB kablosu telefondan değil, hedef bilgisayardan geçer**. Kablonun anlamı yönlüdür:

- Kart (ESP32-S3), USB'de bir **cihazdır** (device): bilgisayara USB klavye/fare olarak görünür. Telefon da USB'de cihazdır. İki cihazı birbirine bağlayan bir kablo hiçbir şey yapmaz; aralarında USB **host** yoktur.
- Uygulamanın kartla konuştuğu iki taşıma yolu vardır: **BLE (NUS)** ve **Wi‑Fi HTTP** (`/api/keys`, `/api/rkey`, `/api/rmouse`). USB bu yolların parçası değildir.
- Bu yüzden telefon USB ile karta bağlanmış olsa da kart uygulamada görünmez: USB yığını karta dokunmaz; kartın kendi NUS yayını ya da Wi‑Fi sunucusu kullanılmalıdır.

Yedek telefonda alınan hata bu kuraldan gelir. Doğru kurulum:

1. Kartın USB kablosu **hedef bilgisayarda** kalsın (kart yazsın ve fareyi oynatsın diye).
2. Telefonda **Kart · Bluetooth** yolunu seçip kartı BLE ile bağlayın; ya da **Kart · Wi‑Fi / Kart · AP** yolunu kullanın.
3. Pano gerekiyorsa bilgisayarda PC Yardımcısı açık olsun; kart yollarında pano yalnız onun üzerinden gider.

### Kart taraması boş dönerse (eşleşmiş cihaz yedeği)

Android canlı BLE taraması bazen boş döner: tarama sınırı (kısa sürede çok tarama), ekran kapalıyken tarama, ya da kartın reklam yayınını kesmiş olması. 2.2.15'ten sonra **Kart · Bluetooth** yolu bu durumda telefonda **eşleşmiş** cihazlara da bakar; adı kart adına benzeyen bir aday varsa (KablosuzBellek, can00, USB HID Klavye …) doğrudan o adrese bağlanmayı dener. Bağlanamazsa durum şeridi "Kart bağlantısı kurulamadı (kart açık ve menzilde mi?): …" yazar; açılışta pencere açılmaz. Kart bir kez uygulamadan bağlanınca adresi saklanır ve sonraki açılışlarda önce o adres denenir, tarama hiç gerekmez.

### Tanı: telefon ne görüyor?

Kart görünmüyorsa önce telefondan şunu sorun:

```
adb shell am instrument -w -e teshis 1 -e class com.notbahcesi.app.CardBleDeviceTest#teshis com.notbahcesi.app.test/androidx.test.runner.AndroidJUnitRunner
adb logcat -d -s System.out:I | findstr TESHIS
```

- `TESHIS_PREFS`: kayıtlı tercihler (seçili yol, kayıtlı bilgisayar, otomatik bağlanma anahtarı).
- `TESHIS_WIFI`: telefonun Wi‑Fi IPv4 adresi.
- `TESHIS_BLE`: canlı taramanın bulduğu cihazlar (ad, adres, sinyal).
- `TESHIS_ESLESMIS`: telefonda eşleşmiş cihazlar.
- `TESHIS_KART_ARAMA`: yerel ağdaki kart aramasının sonucu.

Gerçek okuma (iki telefonda alındı): `KablosuzBellek-2331-CBA4` her iki telefonda da **eşleşmiş** listesinde görünüyor, ama canlı taramada yok ve doğrudan bağlanma "BLE bağlantısı kesildi (147)" ya da "zaman aşımına uğradı" ile bitiyor. Bu, kartın o an kapalı ya da menzil dışı olduğunu gösterir; kart açıldığında aynı komut yeşil bağlanma vermelidir.


## Mini galeriden dosya aktarımı

Editörün sol altındaki dördüncü **Dosya ekle** düğmesi PDF, belge, ZIP ve diğer dosyaları notun mini galerisine ekler. Dosya adı ve içeriği korunur. Galeride seçtikten sonra **Bilgisayara** ile **Belgeler → Not Bahçesi** klasörüne kaydedin veya **PC panosuna** ile gönderip bilgisayarda Ctrl+V ile bir klasöre yapıştırın. Yalnız görseller gönderildiğinde Resimler → Not Bahçesi kullanılır. Güncel PC Yardımcısı (sürüm 7 veya üzeri) ile eşleşme gerekir; Wi-Fi/Tailscale veya yardımcı Bluetooth alıcısı kullanılır. Dosya başına 40 MB, aktarım başına 50 öğe ve toplam 200 MB sınırı vardır. Dosyalar yalnız cihazda saklanır; bahçe dışa aktarımına ve Drive yedeğine eklenmez.
