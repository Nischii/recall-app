-- Run this in your Supabase project → SQL Editor

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'home',
  created_at timestamptz default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room_id uuid references rooms(id) on delete cascade,
  spot text,
  notes text,
  member_id uuid references members(id) on delete set null,
  created_at timestamptz default now()
);

-- Seed default rooms
insert into rooms (name, icon) values
  ('Garage', 'car'),
  ('Kitchen', 'tool'),
  ('Bedroom', 'bed'),
  ('Living room', 'sofa'),
  ('Bathroom', 'droplet'),
  ('Basement', 'stairs-down');

-- Seed default family members
insert into members (name) values
  ('Mom'),
  ('Dad'),
  ('Alex'),
  ('Sam');

-- Enable Row Level Security (open access — add auth later if needed)
alter table rooms enable row level security;
alter table members enable row level security;
alter table items enable row level security;

create policy "Public read rooms" on rooms for select using (true);
create policy "Public insert rooms" on rooms for insert with check (true);
create policy "Public update rooms" on rooms for update using (true);
create policy "Public delete rooms" on rooms for delete using (true);

create policy "Public read members" on members for select using (true);
create policy "Public insert members" on members for insert with check (true);

create policy "Public read items" on items for select using (true);
create policy "Public insert items" on items for insert with check (true);
create policy "Public update items" on items for update using (true);
create policy "Public delete items" on items for delete using (true);
