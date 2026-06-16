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
