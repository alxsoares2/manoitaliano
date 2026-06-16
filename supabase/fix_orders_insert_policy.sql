-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- Definitive fix: rebuild RLS on "orders" from scratch.

-- 1. Drop ALL existing policies on orders (in case of leftover/conflicting ones)
do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where tablename = 'orders' and schemaname = 'public'
  loop
    execute format('drop policy %I on public.orders', pol.policyname);
  end loop;
end $$;

-- 2. Make sure RLS is enabled and not forced (forced would block anon too)
alter table public.orders enable row level security;
alter table public.orders no force row level security;

-- 3. Recreate the policies
create policy "Anyone can insert orders"
  on public.orders for insert
  to anon, authenticated
  with check (true);

create policy "Authenticated users can view orders"
  on public.orders for select
  to authenticated
  using (true);

create policy "Authenticated users can update orders"
  on public.orders for update
  to authenticated
  using (true);

-- 4. Make sure the anon role has table-level privileges (separate from RLS)
grant usage on schema public to anon, authenticated;
grant insert, select on public.orders to anon;
grant select, insert, update on public.orders to authenticated;
