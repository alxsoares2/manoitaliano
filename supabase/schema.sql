-- Run this in the Supabase SQL Editor (Database > SQL Editor)

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  address text not null,
  address_number text not null,
  neighborhood text not null,
  complement text,
  reference text,
  items jsonb not null,
  total numeric(10, 2) not null,
  status text not null default 'recebido'
    check (status in ('recebido', 'em_preparo', 'saiu_para_entrega', 'entregue'))
);

alter table public.orders enable row level security;

-- Anyone (including anonymous customers) can place an order.
create policy "Anyone can insert orders"
  on public.orders for insert
  to anon
  with check (true);

-- Only authenticated users (admins) can view and manage orders.
create policy "Authenticated users can view orders"
  on public.orders for select
  to authenticated
  using (true);

create policy "Authenticated users can update orders"
  on public.orders for update
  to authenticated
  using (true);

-- Realtime updates for the admin dashboard.
alter publication supabase_realtime add table public.orders;

-- Ensure UPDATE events broadcast the full row (needed for the admin dashboard
-- to receive the new status without an extra fetch).
alter table public.orders replica identity full;
