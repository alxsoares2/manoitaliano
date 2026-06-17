-- Observações do cliente no pedido (aparece na comanda impressa)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;
