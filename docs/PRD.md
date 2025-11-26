# Not Bahçesi - Ürün Gereksinim Dokümanı (PRD)

## 1. Ürün Özeti

**Not Bahçesi**, ağaç ve bahçe temalı, görsel bir zihin haritası not tutma uygulamasıdır. Kullanıcılar fikirlerini "bahçeler" içinde "ağaçlar" olarak organize edebilir, hiyerarşik düğümler (dallar) oluşturabilir ve sonsuz bir canvas üzerinde notlarını yönetebilir.

### Vizyon
"Fikirlerinizi toprağa ekin, ağaca dönüşsün."

### Teknoloji Stack
- **Frontend:** Next.js 15, React 18, TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Database:** Supabase (PostgreSQL)
- **AI Integration:** Google Gemini 2.0 Flash
- **Export:** jsPDF, docx

---

## 2. Kullanıcı Hikayeleri

### Ana Sayfa
- Kullanıcı olarak, tüm bahçelerimi (not koleksiyonlarımı) görebilmeliyim
- Kullanıcı olarak, yeni bir bahçe oluşturabilmeliyim
- Kullanıcı olarak, mevcut bir bahçeyi silebilmeliyim
- Kullanıcı olarak, bir bahçeye tıklayarak içine girebilmeliyim

### Bahçe Canvas
- Kullanıcı olarak, sonsuz bir canvas üzerinde gezinebilmeliyim (pan & zoom)
- Kullanıcı olarak, yeni ağaçlar (root node) oluşturabilmeliyim
- Kullanıcı olarak, ağaçlara dallar (child node) ekleyebilmeliyim
- Kullanıcı olarak, dalları silebilmeliyim
- Kullanıcı olarak, dalları genişletip daraltabilmeliyim
- Kullanıcı olarak, canvas pozisyonumu kaydedebilmeliyim

### Not Editörü
- Kullanıcı olarak, bir nota tıklayarak detaylı editöre girebilmeliyim
- Kullanıcı olarak, not başlığını ve içeriğini düzenleyebilmeliyim
- Kullanıcı olarak, notumu kaydedebilmeliyim
- Kullanıcı olarak, not içeriğini kopyalayabilmeliyim
- Kullanıcı olarak, notumu PDF veya Word formatında indirebilmeliyim
- Kullanıcı olarak, AI ile imla düzeltmesi yapabilmeliyim

---

## 3. Özellikler

### 3.1 Bahçe Yönetimi
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Bahçe Oluşturma | ✅ Tamamlandı | Modal ile yeni bahçe oluşturma |
| Bahçe Listeleme | ✅ Tamamlandı | Kartlar halinde bahçeleri görüntüleme |
| Bahçe Silme | ✅ Tamamlandı | Onay ile bahçe ve içeriğini silme |
| Bahçe Renklendirme | ✅ Tamamlandı | Otomatik renk paleti atama |

### 3.2 Infinite Canvas
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Pan (Sürükleme) | ✅ Tamamlandı | Mouse ve touch desteği |
| Zoom | ✅ Tamamlandı | Mouse wheel ve pinch-to-zoom |
| View State Kaydetme | ✅ Tamamlandı | Pozisyon ve zoom seviyesi Supabase'e kaydedilir |
| Grid Arka Plan | ✅ Tamamlandı | Toprak dokusu pattern |

### 3.3 Ağaç/Node Yönetimi
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Root Node Oluşturma | ✅ Tamamlandı | Yeni ağaç ekleme |
| Child Node Ekleme | ✅ Tamamlandı | Dallara alt dal ekleme |
| Sibling Node Ekleme | ✅ Tamamlandı | Yan dal ekleme |
| Node Silme | ✅ Tamamlandı | Cascade silme (alt dallarla birlikte) |
| Node Genişletme/Daraltma | ✅ Tamamlandı | Dalları gizleme/gösterme |
| Inline Başlık Düzenleme | ✅ Tamamlandı | Canvas üzerinde başlık düzenleme |
| Başlık Kopyalama | ✅ Tamamlandı | Tek tıkla başlık kopyalama |
| İçerik Kopyalama | ✅ Tamamlandı | Tek tıkla içerik kopyalama |

### 3.4 Not Editörü
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Tam Ekran Editör | ✅ Tamamlandı | Ayrı sayfa olarak açılır |
| Başlık Düzenleme | ✅ Tamamlandı | Üst kısımda başlık alanı |
| İçerik Düzenleme | ✅ Tamamlandı | Textarea ile içerik yazma |
| Otomatik Kaydetme Uyarısı | ✅ Tamamlandı | Kaydedilmemiş değişiklik uyarısı |
| Kelime/Karakter Sayacı | ✅ Tamamlandı | Footer'da istatistikler |
| İçerik Kopyalama | ✅ Tamamlandı | Tek tıkla kopyalama |

### 3.5 AI Özellikleri
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| İmla Düzeltme | ✅ Tamamlandı | Gemini AI ile Türkçe imla düzeltme |
| Seçili Metin Düzeltme | ✅ Tamamlandı | Sadece seçili kısmı düzeltme |
| Düzeltme Onay/İptal | ✅ Tamamlandı | Değişiklikleri kabul/reddetme |
| AI ile Genişletme | 🔄 Placeholder | İçerik genişletme (TODO) |

### 3.6 Export Özellikleri
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| PDF Export | ✅ Tamamlandı | jsPDF ile PDF indirme |
| Word Export | ✅ Tamamlandı | docx ile Word indirme |

---

## 4. Veritabanı Şeması

### Gardens Tablosu
```sql
gardens (
  id: uuid (PK, auto-generated)
  name: text (not null)
  view_state: jsonb (default: {x: 0, y: 0, zoom: 1})
  created_at: timestamptz
  updated_at: timestamptz
)
```

### Nodes Tablosu
```sql
nodes (
  id: uuid (PK, auto-generated)
  garden_id: uuid (FK -> gardens.id, cascade delete)
  parent_id: uuid (FK -> nodes.id, cascade delete, nullable)
  content: text (not null)
  position_x: real (default: 0)
  position_y: real (default: 0)
  is_expanded: boolean (default: true)
  created_at: timestamptz
  updated_at: timestamptz
)
```

### İlişkiler
- `gardens` 1:N `nodes` (bir bahçede birden fazla node)
- `nodes` self-referencing (parent_id ile hiyerarşik yapı)

---

## 5. API Endpoints

### Supabase (Client-side)
Tüm veritabanı işlemleri Supabase JS Client ile yapılır:
- `supabase.from('gardens').select/insert/update/delete`
- `supabase.from('nodes').select/insert/update/delete`

### Next.js API Routes
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/spellcheck` | POST | AI imla düzeltme |

---

## 6. Sayfa Yapısı

```
/                           → Ana sayfa (Bahçe listesi)
/bahce/[id]                 → Bahçe canvas sayfası
/bahce/[id]/editor/[nodeId] → Not editörü sayfası
```

---

## 7. Bileşen Mimarisi

```
app/
├── page.tsx                    # Ana sayfa
├── layout.tsx                  # Root layout
├── globals.css                 # Global stiller
├── bahce/
│   └── [id]/
│       ├── page.tsx            # Bahçe canvas
│       └── editor/
│           └── [nodeId]/
│               └── page.tsx    # Not editörü
└── api/
    └── spellcheck/
        └── route.ts            # AI imla API

components/
├── bahce/
│   └── CreateGardenModal.tsx   # Bahçe oluşturma modal
├── canvas/
│   ├── GardenCanvas.tsx        # Infinite canvas
│   ├── MindMapNode.tsx         # Ağaç node bileşeni
│   ├── TreeManagementModal.tsx # Ağaç yönetim modal
│   └── ...
└── editor/
    ├── Modal.tsx               # Genel modal
    ├── MindTextEditor.tsx      # Inline editör
    └── TextEditorModal.tsx     # TipTap editör (eski)

lib/
├── store/
│   └── useStore.ts             # Zustand store
├── supabaseClient.ts           # Supabase client
└── types.ts                    # TypeScript tipleri
```

---

## 8. Kullanıcı Arayüzü

### Renk Paleti
- **Ana Renkler:** Kahverengi tonları (ağaç gövdesi), Yeşil tonları (yapraklar)
- **Arka Plan:** Bej/krem tonları (#f4f1ea)
- **Vurgu:** Amber, Emerald, Teal

### Tema
- Doğa/bahçe temalı tasarım
- Organik şekiller (rounded corners)
- Yumuşak gölgeler
- Gradient kullanımı

### Responsive
- Mobil uyumlu tasarım
- Touch gesture desteği
- Adaptive font boyutları

---

## 9. Güvenlik

### Row Level Security (RLS)
- Supabase RLS aktif
- Şu an tüm kullanıcılara açık (authentication yok)

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

---

## 10. Gelecek Özellikler (Roadmap)

### Kısa Vadeli
- [ ] Kullanıcı authentication (Supabase Auth)
- [ ] AI ile içerik genişletme
- [ ] Markdown desteği
- [ ] Arama fonksiyonu

### Orta Vadeli
- [ ] Etiketleme sistemi
- [ ] Bahçe paylaşımı
- [ ] Collaborative editing
- [ ] Offline desteği (PWA)

### Uzun Vadeli
- [ ] Mobil uygulama (React Native)
- [ ] AI özetleme
- [ ] Sesli not ekleme
- [ ] Görsel ekleme

---

## 11. Performans Gereksinimleri

- İlk yükleme: < 3 saniye
- Canvas etkileşimi: 60 FPS
- API yanıt süresi: < 500ms
- Debounced view state kaydetme: 1 saniye

---

## 12. Versiyon Geçmişi

| Versiyon | Tarih | Değişiklikler |
|----------|-------|---------------|
| 0.1.0 | - | İlk sürüm, temel özellikler |
| 0.2.0 | - | AI imla düzeltme eklendi |
| 0.3.0 | - | PDF/Word export eklendi |
