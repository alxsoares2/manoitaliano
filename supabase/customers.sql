-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- Run AFTER orders.sql / schema.sql (the orders table must already exist).

create table if not exists public.customers (
  phone text primary key,
  name text not null,
  address text,
  address_number text,
  neighborhood text,
  complement text,
  reference text,
  total_spent numeric(10, 2) not null default 0,
  orders_count int not null default 0,
  first_order_at timestamptz not null default now(),
  last_order_at timestamptz not null default now()
);

alter table public.customers enable row level security;

-- Only authenticated users (admins) can view customer records.
create policy "Authenticated users can view customers"
  on public.customers for select
  to authenticated
  using (true);

-- Realtime updates for the admin dashboard.
alter publication supabase_realtime add table public.customers;
alter table public.customers replica identity full;

-- Automatically create/update the customer record whenever an order is placed.
-- SECURITY DEFINER lets this run with the table owner's privileges, so anonymous
-- customers placing orders don't need direct write access to public.customers.
create or replace function public.handle_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (
    phone, name, address, address_number, neighborhood, complement, reference,
    total_spent, orders_count, first_order_at, last_order_at
  )
  values (
    new.customer_phone, new.customer_name, new.address, new.address_number,
    new.neighborhood, new.complement, new.reference,
    new.total, 1, new.created_at, new.created_at
  )
  on conflict (phone) do update set
    name = excluded.name,
    address = excluded.address,
    address_number = excluded.address_number,
    neighborhood = excluded.neighborhood,
    complement = excluded.complement,
    reference = excluded.reference,
    total_spent = public.customers.total_spent + excluded.total_spent,
    orders_count = public.customers.orders_count + 1,
    last_order_at = excluded.last_order_at;

  return new;
end;
$$;

drop trigger if exists on_order_created on public.orders;

create trigger on_order_created
  after insert on public.orders
  for each row execute function public.handle_new_order();
