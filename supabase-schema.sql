-- Gardens (Bahçeler) Tablosu
create table gardens (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  view_state jsonb default '{"x": 0, "y": 0, "zoom": 1}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table gardens enable row level security;

-- Policies (Şimdilik herkese açık, ileride authentication eklenebilir)
create policy "Enable read access for all users" on gardens
  for select using (true);

create policy "Enable insert for all users" on gardens
  for insert with check (true);

create policy "Enable update for all users" on gardens
  for update using (true);

create policy "Enable delete for all users" on gardens
  for delete using (true);

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

-- Policies
create policy "Enable read access for all users" on nodes
  for select using (true);

create policy "Enable insert for all users" on nodes
  for insert with check (true);

create policy "Enable update for all users" on nodes
  for update using (true);

create policy "Enable delete for all users" on nodes
  for delete using (true);

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
