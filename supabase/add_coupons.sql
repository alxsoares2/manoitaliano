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
