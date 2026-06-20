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
