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
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id         text PRIMARY KEY,
  title      text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read menu_categories"
  ON public.menu_categories FOR SELECT USING (true);

CREATE POLICY "service_role write menu_categories"
  ON public.menu_categories FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.menu_categories (id, title, sort_order) VALUES
  ('favoritas-da-casa', 'Favoritas da Casa', 1),
  ('classicas', 'Clássicas', 2),
  ('especiais-da-casa', 'Especiais da Casa', 3),
  ('especial', 'Especial', 4),
  ('doces', 'Doces', 5),
  ('entradas', 'Entradas', 6),
  ('bebidas', 'Bebidas', 7),
  ('bordas', 'Bordas Recheadas', 8)
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

-- Bordas e Especial não aparecem no menu principal
UPDATE public.menu_categories SET visible = false WHERE id IN ('bordas', 'especial');
-- Run in Supabase SQL Editor

-- 1. Add "pendente" to the status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pendente', 'recebido', 'em_preparo', 'saiu_para_entrega', 'entregue'));

-- 2. Add payment_id column to link orders with Mercado Pago payments
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_id text;

-- 3. Allow anon to update orders with status "pendente" (used by webhook route)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'Webhook can confirm pending orders'
  ) THEN
    CREATE POLICY "Webhook can confirm pending orders"
      ON public.orders FOR UPDATE
      TO anon
      USING (status = 'pendente')
      WITH CHECK (true);
  END IF;
END $$;
-- Run in Supabase SQL Editor

-- 1. Add "cancelado" to the status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pendente', 'recebido', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado'));

-- 2. Add cancel_reason column
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason text;
-- Adiciona número sequencial de pedido começando em 1000
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1000;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number int;

-- Preenche pedidos existentes que não têm número
UPDATE public.orders
SET order_number = nextval('order_number_seq')
WHERE order_number IS NULL;

-- Define default para novos pedidos
ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT nextval('order_number_seq');
-- Observações do cliente no pedido (aparece na comanda impressa)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;
-- 1. Forma de pagamento no pedido (para exibir na página de acompanhamento)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;

-- 2. Leitura pública de pedidos individuais para a página /pedido/[id].
--    O id é um UUID não adivinhável; o cliente acompanha o próprio pedido pelo link.
--    Necessário também para o Supabase Realtime entregar updates ao cliente anônimo.
DROP POLICY IF EXISTS "Public can view orders for tracking" ON public.orders;
CREATE POLICY "Public can view orders for tracking"
  ON public.orders FOR SELECT
  TO anon
  USING (true);
-- Tabela de zonas de entrega dinâmica
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood   text        NOT NULL UNIQUE,
  delivery_fee   numeric(10,2) NOT NULL,
  estimated_time text        NOT NULL DEFAULT '40-55 min',
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Leitura pública (checkout do site precisa consultar)
CREATE POLICY "public read delivery_zones"
  ON public.delivery_zones FOR SELECT
  USING (true);

-- Escrita apenas via service_role (admin routes)
CREATE POLICY "service_role write delivery_zones"
  ON public.delivery_zones FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Popula com todos os bairros do código (valores originais + R$0,99, arredondados para ,99)
INSERT INTO public.delivery_zones (neighborhood, delivery_fee, estimated_time) VALUES
  ('Aeroclube',                    10.99, '40-55 min'),
  ('Água Fria',                    16.99, '40-55 min'),
  ('Altiplano Cabo Branco',        11.99, '40-55 min'),
  ('Anatólia',                     13.99, '40-55 min'),
  ('Alto do Mateus',               21.99, '40-55 min'),
  ('Bairro dos Estados',           11.99, '40-55 min'),
  ('Bairro dos Ipês',              11.99, '40-55 min'),
  ('Bairro das Indústrias',        23.99, '40-55 min'),
  ('Bairro dos Novais',            19.99, '40-55 min'),
  ('Bancários',                    14.99, '40-55 min'),
  ('Bela Vista',                   14.99, '40-55 min'),
  ('Bessa',                        11.99, '40-55 min'),
  ('Brisamar',                      9.99, '40-55 min'),
  ('Bayeux',                       23.99, '40-55 min'),
  ('Cabo Branco',                  10.99, '40-55 min'),
  ('Camboinha',                    17.99, '40-55 min'),
  ('Castelo Branco',               13.99, '40-55 min'),
  ('Centro João Pessoa',           14.99, '40-55 min'),
  ('Centro',                       14.99, '40-55 min'),
  ('Centro Cabedelo',              21.99, '40-55 min'),
  ('Centro Santa Rita',            28.99, '40-55 min'),
  ('Costa e Silva',                21.99, '40-55 min'),
  ('Cristo Redentor',              16.99, '40-55 min'),
  ('Cruz das Armas',               18.99, '40-55 min'),
  ('Cuiá',                         18.99, '40-55 min'),
  ('Costa do Sol',                 19.99, '40-55 min'),
  ('Colibris',                     16.99, '40-55 min'),
  ('Jaguaribe',                    13.99, '40-55 min'),
  ('Ernani Sátiro',                19.99, '40-55 min'),
  ('Ernesto Geisel',               18.99, '40-55 min'),
  ('Expedicionários',              11.99, '40-55 min'),
  ('Funcionários',                 19.99, '40-55 min'),
  ('Gramame',                      29.99, '40-55 min'),
  ('Grotão',                       21.99, '40-55 min'),
  ('Ilha do Bispo',                19.99, '40-55 min'),
  ('Intermares',                   14.99, '40-55 min'),
  ('Jardim Cidade Universitária',  14.99, '40-55 min'),
  ('Jardim São Paulo',             14.99, '40-55 min'),
  ('Jardim Oceania',               11.99, '40-55 min'),
  ('Jardim Planalto',              19.99, '40-55 min'),
  ('João Agripino',                10.99, '40-55 min'),
  ('Jardim C. Universitária',      13.99, '40-55 min'),
  ('João Paulo II',                19.99, '40-55 min'),
  ('José Américo',                 16.99, '40-55 min'),
  ('Manaíra',                       8.99, '40-55 min'),
  ('Mandacaru',                    11.99, '40-55 min'),
  ('Mangabeira',                   17.99, '40-55 min'),
  ('Miramar',                      10.99, '40-55 min'),
  ('Mucumagro',                    23.99, '40-55 min'),
  ('Oitizeiro',                    21.99, '40-55 min'),
  ('Varjão',                       16.99, '40-55 min'),
  ('Padre Zé',                     11.99, '40-55 min'),
  ('Paratibe',                     23.99, '40-55 min'),
  ('Pedro Gondim',                 11.99, '40-55 min'),
  ('Penha',                        16.99, '40-55 min'),
  ('Poço',                         16.99, '40-55 min'),
  ('Ponta de Campina',             15.99, '40-55 min'),
  ('Ponta dos Seixas',             16.99, '40-55 min'),
  ('Portal do Sol',                13.99, '40-55 min'),
  ('Renascer',                     13.99, '40-55 min'),
  ('Roger',                        12.99, '40-55 min'),
  ('Santa Rita',                   29.99, '40-55 min'),
  ('São José',                      9.99, '40-55 min'),
  ('Tambaú',                        9.99, '40-55 min'),
  ('Tambauzinho',                  11.99, '40-55 min'),
  ('Tambiá',                       13.99, '40-55 min'),
  ('Torre',                        11.99, '40-55 min'),
  ('Treze de Maio',                12.99, '40-55 min'),
  ('Trincheiras',                  14.99, '40-55 min'),
  ('Varadouro',                    13.99, '40-55 min'),
  ('Valentina',                    21.99, '40-55 min')
ON CONFLICT (neighborhood) DO NOTHING;
-- Tabela de horários de funcionamento
CREATE TABLE IF NOT EXISTS public.business_hours (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week  int     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    time    NOT NULL,
  close_time   time    NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  UNIQUE (day_of_week)
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read business_hours"
  ON public.business_hours FOR SELECT USING (true);

CREATE POLICY "service_role write business_hours"
  ON public.business_hours FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Segunda (1) a Quinta (4): 17:00–22:00
-- Sexta (5), Sábado (6), Domingo (0): 17:00–23:00
INSERT INTO public.business_hours (day_of_week, open_time, close_time, active) VALUES
  (0, '17:00', '23:00', true),
  (1, '17:00', '22:00', true),
  (2, '17:00', '22:00', true),
  (3, '17:00', '22:00', true),
  (4, '17:00', '22:00', true),
  (5, '17:00', '23:00', true),
  (6, '17:00', '23:00', true)
ON CONFLICT (day_of_week) DO NOTHING;

-- Tabela de configurações gerais (chave-valor)
CREATE TABLE IF NOT EXISTS public.store_settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read store_settings"
  ON public.store_settings FOR SELECT USING (true);

CREATE POLICY "service_role write store_settings"
  ON public.store_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Toggle de fechamento manual (false = funcionamento normal)
INSERT INTO public.store_settings (key, value) VALUES ('manually_closed', 'false')
ON CONFLICT (key) DO NOTHING;
-- Habilita pgcrypto para bcrypt (já vem ativo no Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,
  password_hash text      NOT NULL,
  name        text        NOT NULL,
  role        text        NOT NULL CHECK (role IN ('admin', 'gerente', 'operador')),
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Somente service_role acessa (todas as rotas admin usam supabaseAdmin)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Usuário admin inicial — senha: Basilico@2025
INSERT INTO public.admin_users (email, password_hash, name, role, active)
VALUES (
  'admin@basilicopizzas.com.br',
  crypt('Basilico@2025', gen_salt('bf', 10)),
  'Administrador',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;
-- Tabela de clientes recorrentes
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  cep text,
  address text,
  number text,
  neighborhood text,
  complement text,
  reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: apenas service_role pode ler/escrever (acesso via server-side)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Política para service_role (usada pelo backend)
CREATE POLICY "service_role full access" ON public.customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Índice no telefone para lookup rápido
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers (phone);
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  phone      text        PRIMARY KEY,
  state      jsonb       NOT NULL DEFAULT '{}',
  messages   jsonb       NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full whatsapp_sessions"
  ON public.whatsapp_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
-- Permite pausar sabores/opções individuais de um item (ex: Coca Zero em falta)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS unavailable_options jsonb NOT NULL DEFAULT '[]';
-- 1. Adiciona coluna image_url na tabela de itens
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Cria bucket público para imagens do cardápio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Política: leitura pública
CREATE POLICY "menu-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- 4. Política: upload via service_role (backend)
CREATE POLICY "menu-images service upload"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'menu-images');

-- 5. Política: delete via service_role (backend)
CREATE POLICY "menu-images service delete"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'menu-images');
-- 1. Tabela de cupons
CREATE TABLE IF NOT EXISTS public.coupons (
  code text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('fixed', 'percent')),
  value numeric NOT NULL,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  max_uses_per_customer int,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Colunas de cupom/desconto na tabela de pedidos
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric;

-- 3. RLS: leitura pública (validação no checkout), escrita só via service_role
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons public read" ON public.coupons
  FOR SELECT USING (true);

CREATE POLICY "coupons service write" ON public.coupons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Incremento atômico do contador de usos
CREATE OR REPLACE FUNCTION public.increment_coupon_use(p_code text)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE code = p_code;
$$;
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
-- Busca de cliente por telefone normalizado (só dígitos), independente de como
-- o telefone foi salvo (formatado pelo trigger de pedido ou em dígitos no
-- cadastro manual).
CREATE OR REPLACE FUNCTION public.lookup_customer(p_digits text)
RETURNS SETOF public.customers
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.customers
  WHERE regexp_replace(phone, '\D', '', 'g') = p_digits
  LIMIT 1;
$$;
-- 1. Adiciona coluna cep em orders e customers (não existiam)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cep text;

-- 2. Atualiza o trigger que cria/atualiza o cliente a cada pedido para incluir cep
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (
    phone, name, cep, address, address_number, neighborhood, complement, reference,
    total_spent, orders_count, first_order_at, last_order_at
  )
  VALUES (
    new.customer_phone, new.customer_name, new.cep, new.address, new.address_number,
    new.neighborhood, new.complement, new.reference,
    new.total, 1, new.created_at, new.created_at
  )
  ON CONFLICT (phone) DO UPDATE SET
    name = excluded.name,
    cep = excluded.cep,
    address = excluded.address,
    address_number = excluded.address_number,
    neighborhood = excluded.neighborhood,
    complement = excluded.complement,
    reference = excluded.reference,
    total_spent = public.customers.total_spent + excluded.total_spent,
    orders_count = public.customers.orders_count + 1,
    last_order_at = excluded.last_order_at;

  RETURN new;
END;
$$;
