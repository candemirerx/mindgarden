-- Gardens (Bahçeler) Tablosu
create table gardens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  view_state jsonb default '{"x": 0, "y": 0, "zoom": 1}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table gardens enable row level security;

-- Kullanıcı bazlı RLS politikaları
create policy "Users can view own gardens" on gardens
  for select using (auth.uid() = user_id);

create policy "Users can create own gardens" on gardens
  for insert with check (auth.uid() = user_id);

create policy "Users can update own gardens" on gardens
  for update using (auth.uid() = user_id);

create policy "Users can delete own gardens" on gardens
  for delete using (auth.uid() = user_id);

-- Nodes (Ağaç Dalları) Tablosu
create table nodes (
  id uuid default gen_random_uuid() primary key,
  garden_id uuid references gardens(id) on delete cascade not null,
  parent_id uuid references nodes(id) on delete cascade,
  content text not null,
  position_x real default 0 not null,
  position_y real default 0 not null,
  is_expanded boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index'ler performans için
create index nodes_garden_id_idx on nodes(garden_id);
create index nodes_parent_id_idx on nodes(parent_id);

-- Enable Row Level Security
alter table nodes enable row level security;

-- Nodes için kullanıcı bazlı RLS politikaları (garden üzerinden kontrol)
create policy "Users can view own nodes" on nodes
  for select using (
    exists (select 1 from gardens where gardens.id = nodes.garden_id and gardens.user_id = auth.uid())
  );

create policy "Users can create own nodes" on nodes
  for insert with check (
    exists (select 1 from gardens where gardens.id = nodes.garden_id and gardens.user_id = auth.uid())
  );

create policy "Users can update own nodes" on nodes
  for update using (
    exists (select 1 from gardens where gardens.id = nodes.garden_id and gardens.user_id = auth.uid())
  );

create policy "Users can delete own nodes" on nodes
  for delete using (
    exists (select 1 from gardens where gardens.id = nodes.garden_id and gardens.user_id = auth.uid())
  );

-- Updated_at otomatik güncelleme için trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_gardens_updated_at before update on gardens
  for each row execute procedure update_updated_at_column();

create trigger update_nodes_updated_at before update on nodes
  for each row execute procedure update_updated_at_column();
