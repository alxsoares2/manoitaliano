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
