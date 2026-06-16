-- 1. Adiciona coluna image_url na tabela de itens
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Cria bucket público para imagens do cardápio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Política: leitura pública
CREATE POLICY "menu-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- 4. Política: upload via service_role (backend)
CREATE POLICY "menu-images service upload"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'menu-images');

-- 5. Política: delete via service_role (backend)
CREATE POLICY "menu-images service delete"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'menu-images');
