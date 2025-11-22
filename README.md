# Not Bahçesi 🌳

Bahçe ve ağaç temalı, modern zihin haritası not tutma uygulaması. Mi Mind'dan ilham alınarak, daha sade ve kullanıcı dostu tasarlanmıştır.

## Özellikler ✨

- 🌱 **Bahçe Oluşturma**: İstediğiniz kadar not bahçesi oluşturabilirsiniz
- 🌳 **Ağaç Yapısı**: Notlarınızı ağaç yapısında organize edin
- 🎨 **Modern Tasarım**: Yeşil/toprak tonları ve yuvarlak hatlarla premium tasarım
- ♾️ **Infinite Canvas**: Sınırsız tuval üzerinde notlarınızı yerleştirin
- ✏️ **Rich Text Editor**: Tiptap ile gelişmiş metin düzenleme
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
4. **Canvas Kullanımı**: 
   - Sürükle-bırak ile node'ları hareket ettirin
   - Zoom in/out yapın
   - Minimap ile genel görünümü takip edin

## Proje Yapısı 📁

```
not-bahcesi/
├── app/
│   ├── bahce/[id]/page.tsx    # Bahçe detay sayfası
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Ana sayfa (bahçe listesi)
│   └── globals.css            # Global stiller
├── components/
│   ├── bahce/
│   │   └── CreateGardenModal.tsx
│   ├── canvas/
│   │   ├── InfiniteCanvas.tsx
│   │   ├── TreeNode.tsx
│   │   └── NodeToolbar.tsx
│   └── editor/
│       └── TextEditorModal.tsx
├── lib/
│   ├── store/
│   │   └── useStore.ts        # Zustand store
│   ├── supabaseClient.ts      # Supabase client
│   └── types.ts               # TypeScript types
└── tailwind.config.js         # Tailwind konfigürasyonu
```

## Roadmap 🗺️

- [ ] Kullanıcı kimlik doğrulama
- [ ] Bahçe paylaşma
- [ ] Export (PDF, PNG)
- [ ] Tema özelleştirme
- [ ] Keyboard shortcuts
- [ ] Mobil uygulama

## Lisans 📄

MIT

## Katkıda Bulunun 🤝

Pull request'ler memnuniyetle karşılanır. Büyük değişiklikler için lütfen önce bir issue açın.
