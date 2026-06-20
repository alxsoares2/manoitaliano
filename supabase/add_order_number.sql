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
