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
