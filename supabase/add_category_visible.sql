ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

-- Bordas e Especial não aparecem no menu principal
UPDATE public.menu_categories SET visible = false WHERE id IN ('bordas', 'especial');
