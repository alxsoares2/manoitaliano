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
