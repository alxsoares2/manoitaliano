-- 1. Frete no pedido
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

-- 2. Item de cross-sell exclusivo do carrinho: Pizza Nutella Individual.
--    Categoria 'especial' NÃO está em MENU_CATEGORIES, então não aparece no
--    cardápio principal — só é exibido na seção de cross-sell do carrinho.
INSERT INTO public.menu_items (category_id, kind, name, description, price, is_active, sort_order)
SELECT 'especial', 'simple', 'Pizza Nutella Individual',
       'Massa artesanal individual com Nutella cremosa. O encerramento perfeito! 🍫',
       25.99, true, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE name = 'Pizza Nutella Individual'
);
