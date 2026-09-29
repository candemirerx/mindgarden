# Not Bahçesi 2.1.9 — Kabuk/Tema Çalışma Kolu: Değişiklikler ve Doğrulama

Tarih: 28 Eylül 2026 · Kapsam: uygulama kabuğu, tema/görünüm, erişilebilirlik altyapısı
· Ölçüm: izole kopyada (paylaşılan çalışma ağacına dokunulmadan) üretim derlemesi + depodaki
kendi UI/axe koşum aracı (docs/reviews/2026-09-28-ui-testi.mjs).

> Bu dosya, [2026-09-28-arayuz-erisilebilirlik-yayin.md](2026-09-28-arayuz-erisilebilirlik-yayin.md)
> raporundaki bazı maddelerin **artık kapandığını** ve kalan maddelerin **güncel ölçümlerini**
> kaydeder. Eski rapor 10:20'de yazıldı; kaynak ağaç o saatten sonra değişti.

## 1. Bu kolda yapılan değişiklikler

| Dosya | Değişiklik |
|---|---|
| app/globals.css | Koyu tema ölçekleri (.dark), prefers-reduced-motion bloğu; koyu temada --sand-400/--sand-500 AA için yukarı çekildi |
| lib/tema.ts | Açık/Koyu/Sistem tercihi, ilk boyamadan önce çalışan betik, sistem teması izleme, Android durum çubuğu eşitlemesi |
| components/ui/KokAyarlari.tsx | Tema eşitlemesi + MotionConfig reducedMotion=user (framer-motion) |
| components/ui/TemaSecici.tsx | Görünüm seçici (gerçek radyo girdileri, 48 px hedefler) |
| components/editor/SettingsHome.tsx | "Yazma deneyimi" grubuna **Görünüm** girdisi (gorunum) |
| components/editor/ModelSettingsModal.tsx | gorunum sekmesi: Tema bölümü + TemaSecici |
| app/layout.tsx | Tema betiği + KokAyarlari; themeColor #F6F3EE (ACIK_ZEMIN ile hizalı) |
| app/gizlilik, app/veri-silme | main landmark (axe artık 0 ihlal) |

## 2. Güncel ölçümler (28.09.2026, 412x915, izole kopya)

| Sayfa | axe ihlali | < 44 px hedef | Koyu tema zemini | Hareket azalt |
|---|---|---|---|---|
| ana sayfa | 1 (heading-order) | 9 | rgb(20,17,14) | 0 geçiş |
| projeler | 2 (button-name, color-contrast) | 17 | rgb(20,17,14) | 0 geçiş |
| editör | 2 (aria-prohibited-attr, scrollable-region-focusable) | 18 | rgb(20,17,14) | 0 geçiş |
| bahçe görünümü | 4 (heading-order, landmark-one-main, listitem, region) | 21 | rgb(20,17,14) | 0 geçiş |
| gizlilik | 0 | 1 | rgb(20,17,14) | 0 geçiş |
| veri silme | 0 | 1 | rgb(20,17,14) | 0 geçiş |

Ekran görüntüleri ve ham JSON: docs/reviews/ui-testi-guncel/ (sonuclar.json).

## 3. Eski raporda kapanan maddeler

1. **Koyu tema yok** → artık var; sistem koyu tercihinde sayfalar koyu zemine geçiyor
   (#F6F3EE yerine rgb(20,17,14)). Ayarlar → Yazma deneyimi → **Görünüm**'den Açık/Koyu/Sistem
   seçilebiliyor (masaustu-ayarlar.png).
2. **prefers-reduced-motion desteği yok** (21-38 öğe) → reduced-motion açıkken **0** animasyon ve
   **0** geçiş; framer-motion tarafı MotionConfig reducedMotion=user ile kapatılıyor.
3. **gizlilik ve veri silme sayfalarında main yok** → ikisi de artık main içeriyor, axe ihlali **0**.
4. **%200 yazı boyutunda yatay taşma** → ölçülen altı sayfada yataySayfaTasmasi=false.
5. **Koyu temada soluk metin kontrastı** → --sand-400/--sand-500 ölçekleri koyu zeminde
   kâğıt/zemin/moss-100 üzerinde 4,6-7,0:1 aralığına çıkarıldı (WCAG AA üstü).

## 4. Hâlâ açık maddeler (sahiplikleri farklı kollar)

- **Dokunma hedefleri**: ana sayfa 9, projeler 17, editör 18, canvas 21 öğe hâlâ < 44 px.
  En kötüleri app/projeler/page.tsx (20x20 "Dalları kapat") ve components/canvas/MindMapNode.tsx.
- **İkon-only düğme adı**: projeler sayfasında button-name (mobilde hidden sm:inline).
- **Canvas geçersiz liste yapısı**: li > li → axe listitem + /bahce_view geliştirme katmanında uyarı.
  Kaynak: components/canvas/MindMapNode.tsx:162,331 ve app/bahce_view/page.tsx:166.
- **Ayar penceresi kapanınca odak** textarea'ya dönüyor (tetikleyici düğmeye dönmeli).
- **Çift header**: ayar penceresi açıkken landmark-no-duplicate-banner (moderate).
- **Açık temada text-sand-400** metin kullanımları (15 yer; 10'u app/projeler/page.tsx) hâlâ 2,5:1;
  koyu temada bu token düzeltildi, açık temada değer değişmedi.
- /editor sayfası bu ölçüm sırasında başka bir kolda düzenleniyordu (ayarDugmesiRef eksikti);
  ölçüm izole kopyada bu referans geçici olarak eklenerek alındı, paylaşılan ağaca dokunulmadı.

