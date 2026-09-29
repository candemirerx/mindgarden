# Gelir Modeli ve Fiyatlandırma Taktikleri

Bu belge, Not Bahçesi yayına çıktıktan sonra para kazanmak için izlenecek yolu
anlatır. Kısa cevap: **her şeyi ücretsiz bırak, kendi yapay zekâ anahtarını
dağıtma, "Not Bahçesi Plus" adında tek bir abonelik sat ve onu ancak uygulama
gerçekten kullanılmaya başladıktan sonra aç.**

---

## 1. Önce Play'in zorunlu kuralları

- Uygulama içinden satılan **dijital içerik ve abonelikler yalnızca Google Play
  Faturalandırma** ile satılabilir. Kendi web sitenden ödeme alıp uygulamada
  kilit açmak Play politikasına aykırıdır; uygulama kaldırılır.
- Play, dijital satışlarda **%15 komisyon** alır (ilk 1 milyon dolar yıllık
  gelire kadar; üstünde %30). Aboneliklerde oran **%15**'tir. Güncel oranı
  Play Console → Ödemeler bölümünden teyit et.
- Fiyatı **Play Console'da ürün/abonelik tanımı olarak** oluşturursun; ülke
  bazlı fiyatlandırmayı Play otomatik uyarlar. Türkiye fiyatını sen belirlersin.

## 2. Ücretsiz kalması gerekenler

Bunlar ürünün alışkanlık kuran çekirdeğidir; arkasına ödeme duvarı koymak
kullanıcıyı kaçırır ve mağaza yorumlarını bozar:

- Not ağacı, tuval, metin işlemcisi (yazı atölyesi), makrolar
- Google Drive yedekleme, içe/dışa aktarma
- Kısayol panosu, konum seçici, fare yüzeyi
- Bilgisayar köprüsü (PC panosu, dikte, bilgisayara yaz) — bu özellik
  kullanıcının kendi bilgisayarıyla konuşur, sana maliyeti yoktur
- **Kendi API anahtarını getiren yapay zekâ** (kullanıcı anahtarını Ayarlar →
  Yapay zekâ bölümüne girer, model çağrısını kendi hesabından öder)

Kendi anahtarını tüm kullanıcılara ücretsiz açma. İki nedeni var: maliyeti
kontrol edemezsin (tek bir kötüye kullanım faturasını sen ödersin) ve uygulama
içinde anahtar taşımak Play incelemesinde ve güvenlikte risk yaratır.

## 3. Ücretli katman: Not Bahçesi Plus

Satılan şey **yapay zekâ kolaylığıdır**, not tutma değil:

- Sunucu tarafı anahtarla **aylık yapay zekâ kotası** (örnek: ayda 300 istek).
- Kotayı aşan kullanıcı kendi anahtarını girmeye yönlendirilir; özellik kapanmaz.
- Plus'a özel üç dört küçük kolaylık: uzun belge özeti, toplu makro üretimi,
  gelişmiş yazım/üslup kontrolü, öncelikli destek.

Fiyat önerisi (Play Console'da iki taban plan):

| Plan | Türkiye | Diğer ülkeler | Not |
| --- | --- | --- | --- |
| Aylık | 99,99 TL | 4,99 $ | Varsayılan seçenek |
| Yıllık | 799 TL | 39,99 $ | "2 ay bedava" olarak gösterilir |
| Kurucu üye (ilk 500 kişi, ömür boyu) | 1.499 TL | 79,99 $ | Yalnız tek seferlik ürün; lansmanda duyurulur |

Yıllık planı öne çıkar: Play komisyonu yıllıkta da %15'tir ama tahsilat
maliyeti ve iptal oranı düşer, nakit akışı öne gelir.

## 4. Lansman takvimi

1. **0-2. hafta — kapalı test.** Kişisel geliştirici hesabında üretime geçmeden
   önce kapalı test şartı var (kaç kullanıcı, kaç gün: 01-yukleme-rehberi.md).
   Bu sürede her şey ücretsiz, Plus kapalı.
2. **Yayın günü — 0. gün.** Tüm özellikler ücretsiz açık. Plus ürünleri Play
   Console'da hazır bekler ama uygulamada plusAcik = false bayrağıyla gizlidir.
3. **1-4. hafta.** Kullanım ölçümü: günlük aktif kullanıcı, kişi başı yapay zekâ
   işlemi, en çok kullanılan üç araç. Geri bildirim ve hata düzeltme. Fiyat yok.
4. **4-8. hafta.** Mağaza yorumlarını topla (uygulama içinden yönlendirme),
   kararlılık sürümleri çıkar. Plus'ı duyur, "yakında" ekranı göster.
5. **8-12. hafta.** Plus açılır. İlk 500 kişiye kurucu üye fiyatı. Aynı gün
   mağaza metnine "yeni: Plus" satırı ve sürüm notu eklenir.
6. **Sonra.** Yıllık planı varsayılan seçenek yap; kurucu üye kontenjanı
   dolduğunda aylık/yıllık ikilisine dön.

Bu takvimin mantığı: indirimli lansman, boş bir uygulamada işe yaramaz.
Önce kullanıcı ve yorum biriktir, sonra ödemeyi iste.

## 5. Birim ekonomi (kontrol sayıları)

- 99,99 TL aylık abonelikten net gelir yaklaşık 85 TL (Play %15).
- Bir kullanıcının aylık yapay zekâ maliyeti kotayla sınırlıdır; örneğin ayda
  300 istek kısa yanıt üretiyorsa maliyet 5-15 TL bandında kalır.
- **Kural:** kişi başı yapay zekâ maliyeti fiyatın %30'unu geçtiği ay kotayı
  düşür. Aksi halde çok kullanan azınlık, geliri yer.
- Ücretsiz kullanıcının sana maliyeti sıfırdır; bunu bozacak tek şey kendi
  anahtarını ücretsiz dağıtmaktır.

## 6. Takip edilecek üç sayı

1. Günlük aktif kullanıcı ve 7. gün geri dönüş oranı.
2. Plus ekranını görenlerin satın alma oranı (hedef: %2-4).
3. Kişi başı aylık yapay zekâ maliyeti.

Bu üçünü Play Console'un kendi istatistikleri ve kendi kota tablonla izleyebilirsin.
Üçüncüsü için sunucu tarafında her isteği kullanıcı kimliğiyle say.

## 7. Yapılmaması gerekenler

- Uygulamaya kendi yapay zekâ anahtarını gömüp herkese açmak.
- Play dışı ödeme yönlendirmesi (uygulama içinden "sitemizden öde" demek).
- Fiyatı sürekli değiştirmek; ilk altı ay sabit tut, sonra yıllık güncelle.
- Reklam koymak: reklam eklenirse AD_ID izni, veri güvenliği formu ve gizlilik
  politikası güncellenmeli; ilk sürümde reklamsız kalmak inceleme ve yorumlar
  açısından daha güvenli.

## 8. Play Console ve kod tarafında yapılacaklar

Play Console:

1. **Monetize → Products → Subscriptions**: plus_aylik, plus_yillik taban
   planlarını oluştur; ücretsiz deneme koyma (lansman zaten ücretsiz).
2. **Monetize → In-app products**: kurucu_uye tek seferlik ürünü.
3. Fiyatları ülke bazlı ayarla; Türkiye fiyatını yukarıdaki tabloya göre gir.

Kod tarafı (henüz yapılmadı, Plus açılacağı zaman gerekir):

1. lib/config.ts içine plusAcik bayrağı ve lib/plus.ts içine kota durumu.
2. Abonelik durumunu Play Billing köprüsüyle doğrula (Capacitor eklentisi veya
   kendi Android köprün) ve sunucuda kullanıcıya bağlı tut.
3. /api/ai uç noktasına kota denetimi ve kullanıcı başına sayaç ekle; aşımda
   Türkçe, yönlendirici bir hata döndür.
4. Ayarlar → Yapay zekâ bölümüne "Plus durumu ve kota" kartı ekle; kalan kotayı
   ve yükseltme düğmesini göster.

> Plus açılmadan önce yapılacak en önemli hazırlık, sunucu tarafı anahtarın
> hangi sağlayıcıda duracağına karar vermek ve aylık maliyet üst sınırını
> (örnek: kullanıcı başına 15 TL) yazılı olarak belirlemektir.
