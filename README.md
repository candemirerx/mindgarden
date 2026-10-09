# Not Bahçesi 🌳

Bilgisayar araçları (fare, makro, dikte, USB HID ile yazma ve doğrudan PC panosu), bağlantı kurulumu ve Windows pano yardımcısı için [bilgisayar araçları kılavuzuna](docs/bilgisayar-araclari.md) bakın. PC panosuna doğrudan gönderim için hedef bilgisayarda `scripts/pc_panoyu_baslat.cmd` çalışması gerekir; ek yazılım kurulmaz.

Bahçe ve ağaç temalı, modern zihin haritası not tutma uygulaması. Mi Mind'dan ilham alınarak, daha sade ve kullanıcı dostu tasarlanmıştır.

**Sürüm:** 1.0.0 (sürüm kodu 68) · **Platform:** Web (Next.js) + Android (Capacitor)

## Özellikler ✨

- 🌱 **Bahçe Oluşturma**: İstediğiniz kadar not bahçesi oluşturabilirsiniz
- 🌳 **Ağaç Yapısı**: Notlarınızı ağaç yapısında organize edin
- 🎨 **Modern Tasarım**: Yeşil/toprak tonları ve yuvarlak hatlarla premium tasarım
- ♾️ **Infinite Canvas**: Sınırsız tuval üzerinde notlarınızı yerleştirin
- ✏️ **Metin Düzenleyici**: Başlık, madde işareti, numaralı liste ve vurgu araçları
- 🤖 **Yapay Zekâ Makroları**: Kendi API anahtarınızla imla düzeltme, özetleme, çeviri ve özel makrolar
- ☁️ **Drive Yedekleme**: Google Drive'ın uygulamaya özel gizli klasörüne otomatik yedek, cihazlar arası birleştirme
- 💾 **Dışa Aktarma**: JSON, HTML, PDF ve Word biçimlerinde yedek
- 🖥️ **Bilgisayar Araçları**: Fare kontrolü, makro, dikte ve doğrudan PC panosu (yukarıdaki kılavuza bakın)
- 📶 **Çevrimdışı Çalışma**: Notlar önce cihaza yazılır, bağlantı gelince kendiliğinden eşitlenir
- 🔄 **Real-time Data**: Supabase ile anlık veri senkronizasyonu
- 📱 **Responsive**: Tüm cihazlarda mükemmel görünüm

## Teknoloji Stack 🛠️

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **State Management**: Zustand
- **Canvas**: React Flow
- **Rich Text Editor**: Tiptap
- **Icons**: Lucide React

## Kurulum 🚀

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Supabase Kurulumu

Supabase projenizi oluşturun ve aşağıdaki tabloları ekleyin:

#### Gardens Tablosu

```sql
create table gardens (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table gardens enable row level security;

-- Policy: Herkes kendi bahçelerini görebilir (şimdilik herkese açık)
create policy "Enable read access for all users" on gardens
  for select using (true);

create policy "Enable insert for all users" on gardens
  for insert with check (true);

create policy "Enable update for all users" on gardens
  for update using (true);

create policy "Enable delete for all users" on gardens
  for delete using (true);
```

#### Nodes Tablosu

```sql
create table nodes (
  id uuid default gen_random_uuid() primary key,
  garden_id uuid references gardens(id) on delete cascade not null,
  parent_id uuid references nodes(id) on delete cascade,
  content text not null,
  position_x real default 0 not null,
  position_y real default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table nodes enable row level security;

-- Policy: Herkes node'ları görebilir (şimdilik herkese açık)
create policy "Enable read access for all users" on nodes
  for select using (true);

create policy "Enable insert for all users" on nodes
  for insert with check (true);

create policy "Enable update for all users" on nodes
  for update using (true);

create policy "Enable delete for all users" on nodes
  for delete using (true);
```

### 3. Environment Variables

`.env.local` dosyası oluşturun:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Uygulamayı Çalıştırın

```bash
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açın.

## Kullanım 📖

1. **Bahçe Oluştur**: Ana sayfada "Yeni Bahçe Ekle" butonuna tıklayın
2. **Ağaç Ekle**: Bahçenize girdikten sonra "Ağaç Ekle" butonuyla root node oluşturun
3. **Dalları Genişlet**: Node'ların üzerine hover yaparak:
   - ✏️ İçerik düzenle
   - 📋 Kopyala
   - ➕ Alt dal ekle
   - 🌿 Yan dal ekle
4. **Tuval Kullanımı**: 
   - Sürükle-bırak ile node'ları hareket ettirin
   - Zoom in/out yapın
   - Minimap ile genel görünümü takip edin

## Ayarlar Penceresi ⚙️

Ayarlara hem ana sayfadaki sol kenar çubuğundan hem de düzenleyicinin sağ üst
köşesindeki dişli simgesinden ulaşılır. Pencere, üstte **arama kutusu** ve altında
gruplanmış bölüm kartları bulunan tek bir giriş ekranıyla açılır:

| Bölüm | Ne yapar |
|---|---|
| Kullanım kılavuzu | Adım adım kullanım anlatımı ve ilgili ayara doğrudan geçiş |
| Hesap ve giriş | Google/e-posta girişi ve bu cihazdaki oturum |
| Yapay zekâ | Bulut/Yerel sekmeleri; sağlayıcı, model, API anahtarı; Android model dosyası ekleme ve yerel yanıt denemesi |
| AI makroları | Hazır makroları açıp kapatın, kendi makrolarınızı yazın |
| Düzenleme araçları | Yerel düzenleme araçları ve bilgisayar araçları |
| Bilgisayar bağlantısı | PC bağlantı yolu, yardımcı program ve araç davranışı |
| Yedekleme ve senkronizasyon | Google Drive yedekleme ve otomatik eşitleme |
| Veri yönetimi | Dışa/içe aktarma, örnek veri ve sıfırlama |
| Uygulama hakkında | Sürüm, paket adı, iletişim, gizlilik politikası ve veri silme bağlantısı |

Bölüm adları giriş ekranındaki menüyle birebir aynıdır; arama kutusu yazdığınız
kelimeye göre bölümleri süzer.

Ortak yapı taşları `components/ui/settings.tsx` içinde tanımlıdır; yeni bir ayar
eklerken aynı bileşenler kullanılarak pencerenin görsel dili korunur.

## Proje Yapısı 📁

```
not-bahcesi/
├── app/
│   ├── page.tsx               # Ana sayfa (bahçe listesi)
│   ├── editor/page.tsx        # Yazı düzenleyici
│   ├── canvas/                # Zihin haritası tuvali
│   ├── gizlilik/page.tsx      # Gizlilik politikası
│   ├── veri-silme/page.tsx    # Veri silme talebi (Play veri silme URL'i)
│   └── globals.css            # Global stiller ve tasarım belirteçleri
├── components/
│   ├── canvas/                # Tuval, düğümler, dal yönetimi
│   ├── editor/                # Düzenleyici, ayar penceresi ve bölümleri
│   ├── ui/                    # settings.tsx, Modal, ConfirmModal, PromptModal
│   └── layout/Sidebar.tsx     # Kenar çubuğu (giriş ve ayarlar)
├── lib/
│   ├── store/useStore.ts      # Zustand store
│   ├── supabaseClient.ts      # Supabase client / yerel mod
│   ├── driveSync.ts           # Drive yedekleme
│   ├── aiProvider.ts          # Yapay zekâ sağlayıcıları
│   ├── remoteTools.ts         # Bilgisayar araçları tercihleri
│   └── config.ts              # Sürüm ve uç noktalar
├── android/                   # Capacitor Android projesi
└── play-store-paketi/         # Mağaza belgeleri ve görselleri
```

## Play Store Hazırlığı 🏪

Yayın öncesi inceleme [docs/reviews/2026-09-28-play-store-inceleme.md](docs/reviews/2026-09-28-play-store-inceleme.md)
dosyasında, adım adım yayın akışı [play-store-paketi/OKUBENI.md](play-store-paketi/OKUBENI.md) içinde.

- Android `:app:lintRelease` sıfır hatayla geçiyor (izin kontrolleri, API 22 uyumu, App Link etiketleri).
- Yapay zekâ uç noktası kimliksiz isteği reddeder; özel sağlayıcı adresinde SSRF koruması, gövde ve hız sınırı vardır.
- Kaydetme, içe aktarma ve eşitleme veri kaybına karşı korumalıdır; silinen not içeriği cihazda ve yedekte tutulmaz.
- `public/.well-known/assetlinks.json` yayında olmalıdır; Play App Signing SHA-256'sı eklenip doğrulanmalıdır.

Yayın öncesi doğrulama komutları:

```powershell
npx tsc --noEmit                        # tip denetimi
node docs/reviews/probes-a.cjs          # editör kalıcılığı ve misafir→hesap aktarımı
node docs/reviews/probes-b.cjs          # eşitleme/çakışma birleştirmesi
node docs/reviews/probes-c.cjs          # yedek içe aktarma doğrulaması
node docs/reviews/probes-d.cjs          # yapay zekâ uç noktası (SSRF/kimlik/hız sınırı)
npm run dev                             # ayarlar duman testi için uygulamayı aç
node scripts/ayarlar-tur.mjs            # ayarlar arayüzü: arama + 9 bölüm gezintisi
node scripts/onay-penceresi-tur.mjs     # onay penceresi: odak, Enter ve Escape davranışı
node scripts/play-gorsel-cek.mjs        # mağaza ekran görüntülerini yeniden üret
```

## Roadmap 🗺️

- [x] Kullanıcı kimlik doğrulama (e-posta, Google, yerel mod)
- [x] Dışa aktarma (JSON, HTML, PDF, Word)
- [x] Google Drive ile cihazlar arası yedekleme
- [x] Mobil uygulama (Android / Capacitor)
- [ ] Bahçe paylaşma
- [ ] PNG dışa aktarma
- [ ] Tema özelleştirme
- [ ] Klavye kısayolları

## Lisans 📄

MIT

## Katkıda Bulunun 🤝

Pull request'ler memnuniyetle karşılanır. Büyük değişiklikler için lütfen önce bir issue açın.
