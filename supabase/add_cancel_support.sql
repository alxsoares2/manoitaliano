-- Run in Supabase SQL Editor

-- 1. Add "cancelado" to the status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pendente', 'recebido', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado'));

-- 2. Add cancel_reason column
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason text;
