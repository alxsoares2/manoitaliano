-- Permite leitura pública da tabela customers (necessário para o painel admin via anon key)
CREATE POLICY "public read customers"
  ON public.customers FOR SELECT
  USING (true);
