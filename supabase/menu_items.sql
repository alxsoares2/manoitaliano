-- Run this in the Supabase SQL Editor (Database > SQL Editor)

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category_id text not null,
  kind text not null check (kind in ('pizza', 'simple')),
  name text not null,
  description text,
  price numeric(10, 2),
  price_media numeric(10, 2),
  price_grande numeric(10, 2),
  options jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0
);

alter table public.menu_items enable row level security;

-- Anyone (including anonymous customers) can read the menu — the storefront
-- filters out inactive items client-side so realtime updates still arrive.
create policy "Anyone can view menu items"
  on public.menu_items for select
  to anon
  using (true);

create policy "Authenticated users can view menu items"
  on public.menu_items for select
  to authenticated
  using (true);

create policy "Authenticated users can insert menu items"
  on public.menu_items for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update menu items"
  on public.menu_items for update
  to authenticated
  using (true);

create policy "Authenticated users can delete menu items"
  on public.menu_items for delete
  to authenticated
  using (true);

-- Realtime updates for the storefront and admin dashboard.
alter publication supabase_realtime add table public.menu_items;
alter table public.menu_items replica identity full;
