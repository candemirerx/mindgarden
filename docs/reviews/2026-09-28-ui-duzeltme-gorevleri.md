# Not Bahçesi — UI, erişilebilirlik ve hata düzeltme görevleri (28.09.2026)

Bu dosya, üç ayrı kolda paralel yürütülen düzeltme işlerini tanımlar. Her kol
yalnızca kendi **DOSYA SAHİPLİĞİ** listesindeki dosyaları düzenler; başka kolun
dosyasına dokunmaz. Çakışmayı önlemek için bölümleri harf harf uygula.

## ORTAK KURALLAR (A, B ve C için)

1. **Koyu tema altyapısı kuruldu ve hazır.** `tailwind.config.js` içinde tüm
   paletler artık CSS değişkeni (`'rgb(var(--sand-600) / <alpha-value>)'`),
   `white` → `var(--surface)`, `darkMode: 'class'`. `app/globals.css` içinde
   açık/koyu ölçekler tanımlı. `app/layout.tsx` içinde ilk boyama betiği ve
   `components/ui/KokAyarlari.tsx` (framer-motion `reducedMotion="user"`) var.
   - Yeni hex/rgba renk **yazma** (dal renkleri hariç). Mevcut palet sınıflarını
     kullan: `bg-sand-100`, `bg-white`, `text-bark-900`, `border-sand-200`,
     `bg-moss-700`. Koyu temaya otomatik uyarlar.
   - Metin için `text-sand-400` (2,53:1) ve `text-sand-500` (4,35:1) kullanma;
     ikincil metin `text-sand-600` (koyu temada 7,63:1). Açık zeminde
     `text-clay-600` = 4,47:1 → metin olarak kullanıldığı yerde `text-clay-700`.
   - 10–11 px metinleri `text-xs` (12 px) yap.
   - Dokunma hedefi en az **44×44 px**: ikon düğmelerine
     `min-h-[44px] min-w-[44px] inline-flex items-center justify-center`.
   - Kontrol: koyu temayı `document.documentElement.classList.add('dark')` ile
     dene, kontrastı düşen yer bırakma.

2. **Şu dosyalara dokunma:** `app/globals.css`, `tailwind.config.js`,
   `app/layout.tsx`, `lib/tema.ts`, `components/ui/KokAyarlari.tsx`,
   `components/ui/TemaSecici.tsx`, `android/**`, `app/gizlilik/**`,
   `app/veri-silme/**` + başka kolun dosyaları.

3. **`next dev` / `next build` çalıştırma.** `.next` dizini paylaşıldığı için
   paralel çalıştırma projeyi bozuyor (daha önce 404/500 ve
   `Unexpected end of JSON input` hataları bu yüzden çıktı). Doğrulama olarak
   yalnızca `npx tsc --noEmit` ve `npx next lint` kullan. Görsel/axe
   doğrulamasını tur sonunda ana ajan yapacak.

4. **git commit/push yok.** Çalışma ağacı kirli; başka dosyaların
   değişikliklerini geri alma.

5. Bitirince kısa Türkçe rapor: değiştirilen dosyalar, her düzeltmenin tek
   satır özeti, `tsc`/`lint` sonucu, emin olmadığın noktalar.

---

## A) Editör ve ayarlar alanı

**DOSYA SAHİPLİĞİ:** `app/editor/page.tsx`, `components/editor/**`,
`components/ui/settings.tsx`

1. **Mobil editör taşması (390 px):** üst çubukta "Oto" onay kutusu ekranın
   dışına taşıyor, başlık kırpılıyor, 5 ikon sıkışıyor; AI makro şeridi ve
   yerel araç şeridi sağdan kesiliyor ve kaydırma ipucu yok. Şeritleri
   `overflow-x-auto scrollbar-none snap-x` + kenar solma ipucu ile
   kaydırılabilir yap; şeride `role="group"` + `aria-label` + `tabIndex={0}`
   ekle. Üst çubuğu yeniden yerleştir (onay kutusunu ikon grubundan ayır veya
   kompaktlaştır, başlığa `min-w-0 truncate`).
2. **axe critical — erişilebilir adı olmayan ikon düğmeleri:** metin
   `hidden sm:inline` içinde olduğu için mobilde ad yok → `aria-label` +
   `title`.
3. **axe serious — `aria-prohibited-attr`:** role sahip olmayan `span`/`div`
   üzerine konmuş `aria-label` geçersiz; etiketi görünür metne/`title`'a çevir
   ya da doğru role sahip öğeye taşı.
4. **axe serious — `scrollable-region-focusable`:** `app/editor/page.tsx` ~897
   civarındaki kaydırılabilir bölgeye `tabIndex={0}` + `role="region"` +
   `aria-label`.
5. **Etiketsiz form alanları:** editör başlık `input`'u ve gövde `textarea`'sı
   (ve varsa diğerleri) `<label>` veya `aria-label` almalı.
6. **Dokunma hedefleri ≥44 px:** 14×14 otomatik kaydet kutusu, makro kutuları,
   ayar/araç ikonları.
7. **Ayar penceresi kapanınca odak**, pencereyi açan düğmeye dönsün (şu an
   `textarea`'ya düşüyor; `aria-modal` ve odak tuzağı zaten çalışıyor).
8. **Kontrast:** `text-sand-400`/`text-sand-500` metinleri `text-sand-600`;
   editördeki devre dışı makro kutusu 1,98:1 → okunur hale getir.
9. **Tema seçicisini Ayarlar panosuna ekle:**
   `import TemaSecici from '@/components/ui/TemaSecici'` — "Görünüm" bölümü
   olarak SettingsHome (veya uygun ayar bölümü) içine yerleştir. Bileşen hazır:
   Açık/Koyu/Sistem, `lib/tema.ts` ile kaydediyor.
10. **`landmark-no-duplicate-banner`:** ayar penceresi açıkken çift `<header>`
    senin dosyalarından kaynaklanıyorsa (Modal/SettingsHome) düzelt.

---

## B) Projeler listesi, ağaç/canvas ve bahçe bileşenleri

**DOSYA SAHİPLİĞİ:** `app/projeler/page.tsx`, `components/canvas/**`,
`components/bahce/**`, `lib/branchColors.ts`

1. **Hydration hatası:** `components/canvas/MindMapNode.tsx` (162 ve 331
   civarı) `ul > li > li` üretiyor; React konsolu "li cannot be a descendant of
   li / hydration error" veriyor. Yapıyı düzelt: alt düğümler için araya `ul`
   sarmalayıcı koy, `data-agac-alani` taşıyıcısını iç içe `li` oluşturmadan
   kur.
2. **"İlk Ağacı Dik" sessiz çıkmaz:** `app/projeler/page.tsx:39` ve 167–187 —
   bahçe yokken `addNode('')` çağrılıyor ve sonuç `if (created)` ile
   yutuluyor; kullanıcı hiçbir geri bildirim almıyor. Bahçe yoksa otomatik
   oluştur **veya** `role="alert"` ile anlaşılır hata göster.
3. **axe critical:** `app/projeler/page.tsx:846` ve `:853` ikon-only
   düğmelerin erişilebilir adı yok (`hidden sm:inline`) → `aria-label`
   (örn. "Canvas", "Yeni Ağaç") + `title`.
4. **Dokunma hedefleri ≥44 px:** projeler sayfasında 17, ağaç görünümünde 21
   öğe 44 px altında; en kötüleri 20×20 "Dalları kapat" (~396) ve 28×28 düğüm
   düğmeleri.
5. **Eksik `<main>` landmark ve başlık sırası** senin dosyalarında varsa
   düzelt. `app/bahce_view/page.tsx` C kolunun — dokunma.
6. Projeler sayfasındaki arama `input`'una erişilebilir ad; `text-sand-400`
   metinlerini `text-sand-600` yap.
7. **Koyu tema uyumu:** sabit `#f6f3ee`/`rgba(...)` zemin ve gölgeler token
   kullansın. `GardenCanvas.tsx` ~385'teki `rgba(91, 60, 51, 0.16)` nokta
   deseni koyu zeminde görünmez — koyu temada görünür bir tona bağla.
8. **Dal/düğüm renkleri:** `app/projeler/page.tsx:34 LEVEL_COLORS` ve
   `lib/branchColors.ts` sabit hex listeleri koyu temada soluk kalmasın.

---

## C) Ana sayfa, bahçe görünümü, kabuk ve ortak UI

**DOSYA SAHİPLİĞİ:** `app/page.tsx`, `app/bahce_view/page.tsx`,
`components/layout/**`, `components/mobile/**`,
`components/ui/AnchoredDropdown.tsx`, `components/ui/ConfirmModal.tsx`,
`components/ui/PromptModal.tsx`

1. **Eksik `<main>` landmark** (`app/bahce_view/page.tsx`, axe
   `landmark-one-main`) ve ana sayfada `h3` ile başlayan başlık sırası →
   h1 → h2 diye düzelt.
2. **Dokunma hedefleri ≥44 px:** ana sayfada 9, bahçe görünümünde 21 öğe 44 px
   altında; ikon-only düğmelere `aria-label` + `title`.
3. **%200 yazı boyutunda yatay taşma bırakma** (gizlilik 458 px, projeler
   484 px taşıyordu; gizlilik ana ajanın, projeler B kolunun). Gerekirse
   `min-w-0`, `break-words`, `flex-wrap`.
4. **ConfirmModal / PromptModal:** açılışta ilk etkileşimli öğeye odak, kapanışta
   odağı tetikleyiciye döndür; `aria-labelledby`; dokunma hedefleri ≥44 px;
   koyu temada `.glass` yüzeyi ve kenarlık kontrolü.
   **AnchoredDropdown:** menü öğeleri dokunma hedefi ≥44 px, erişilebilir ad,
   klavye gezinmesi bozulmasın.
5. **Sidebar ve MobileShell:** sabit renkler koyu temada bozuluyorsa palet
   sınıflarına çevir; dokunma hedefleri ve etiketler; `text-sand-400` →
   `text-sand-600`.
6. **`landmark-no-duplicate-banner`** (çift `<header>`) senin dosyalarından
   kaynaklanıyorsa düzelt.
7. `prefers-reduced-motion` CSS tarafında hazır; yeni sonsuz/döngülü animasyon
   ekleme.

