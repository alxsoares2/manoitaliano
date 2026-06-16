-- Run this in the Supabase SQL Editor AFTER menu_items.sql
-- Seeds the menu_items table with the current menu data.

insert into public.menu_items
  (category_id, kind, name, description, price, price_media, price_grande, options, is_active, sort_order)
values
('entradas', 'simple', 'Crostini', 'Massa artesanal fina com parmesão e alecrim, acompanha molho pesto', 39, null, null, null, true, 0),
('entradas', 'simple', 'Mini Burrata Gratinada', 'Servida com tomates-cereja confitados, molho pesto fresco e rúcula, acompanha massa artesanal crocante', 69, null, null, null, true, 1),
('favoritas-da-casa', 'pizza', 'Basílico Royale', 'Molho de tomate artesanal, mozzarella, peito de peru, cream cheese, geleia de amora Queensberry, manjericão', null, 60, 70, null, true, 0),
('favoritas-da-casa', 'pizza', 'Salaminho Italiano', 'Molho de tomate artesanal, mozzarella, salame italiano, gorgonzola', null, 63, 73, null, true, 1),
('favoritas-da-casa', 'pizza', 'Pepperoni com Sweet Chilli', 'Molho de tomate artesanal, mozzarella, pepperoni coberto por Sweet Chilli', null, 63, 73, null, true, 2),
('classicas', 'pizza', 'Calabresa', 'Molho de tomate artesanal, mozzarella, calabresa fatiada, cebola, azeitona preta e orégano', null, 58, 68, null, true, 0),
('classicas', 'pizza', 'Mozzarella', 'Molho de tomate artesanal, mozzarella, azeitona preta e orégano', null, 52, 62, null, true, 1),
('classicas', 'pizza', 'Frango com Requeijão', 'Molho de tomate artesanal, mozzarella, frango desfiado, requeijão cremoso, azeitona preta e orégano', null, 58, 68, null, true, 2),
('classicas', 'pizza', 'Portuguesa', 'Molho de tomate artesanal, mozzarella, presunto de peru, ovos cozidos, pimentão verde, cebola e orégano', null, 59, 69, null, true, 3),
('classicas', 'pizza', 'Marguerita', 'Molho de tomate artesanal, mozzarella, tomate, manjericão fresco e orégano', null, 55, 65, null, true, 4),
('classicas', 'pizza', 'Quatro Queijos', 'Molho branco, mozzarella, parmesão, gorgonzola e requeijão', null, 59, 69, null, true, 5),
('classicas', 'pizza', 'Pepperoni', 'Molho de tomate artesanal, mozzarella, requeijão, coberto com pepperoni e orégano', null, 60, 70, null, true, 6),
('classicas', 'pizza', 'Lombo com Requeijão', 'Molho de tomate artesanal, mozzarella, lombo canadense, requeijão, azeitona preta e orégano', null, 59, 69, null, true, 7),
('classicas', 'pizza', 'Corn & Bacon', 'Molho de tomate artesanal, mozzarella argentina, milho, bacon e orégano', null, 59, 69, null, true, 8),
('classicas', 'pizza', 'Camarão', 'Molho de tomate artesanal, mozzarella argentina, requeijão, camarão e orégano', null, 69, 79, null, true, 9),
('classicas', 'pizza', 'Rúcula com Tomate Seco', 'Molho de tomate artesanal, mozzarella, rúcula fresca e tomate seco', null, 59, 69, null, true, 10),
('classicas', 'pizza', 'Peito de Peru com Cream Cheese', 'Molho de tomate artesanal, mozzarella e cream cheese enrolado no peito de peru', null, 59, 69, null, true, 11),
('especiais-da-casa', 'pizza', 'Imperiale', 'Molho de tomate artesanal, mozzarella, peito de peru, cebola, champignon, provolone, azeitona preta e orégano', null, 60, 70, null, true, 0),
('especiais-da-casa', 'pizza', 'Basílico Suprema', 'Molho de tomate artesanal, peito de peru, cream cheese, pepperoni, manjericão e orégano', null, 60, 70, null, true, 1),
('especiais-da-casa', 'pizza', 'Tribeca', 'Molho de tomate artesanal, mozzarella, pepperoni, cheddar, bacon, parmesão e orégano', null, 59, 69, null, true, 2),
('especiais-da-casa', 'pizza', 'Pestoroni', 'Molho de tomate artesanal, mozzarella, molho pesto da casa, pepperoni e orégano', null, 62, 72, null, true, 3),
('especiais-da-casa', 'pizza', 'Calabresa Especial', 'Molho de tomate artesanal, mozzarella, calabresa, cebola caramelizada, cream cheese e orégano', null, 60, 70, null, true, 4),
('especiais-da-casa', 'pizza', 'Trilogia di Salse', 'Mozzarella, molho de tomate artesanal, molho de vodka e molho pesto da casa', null, 60, 70, null, true, 5),
('doces', 'pizza', 'Kit Kat e Marshmallow', 'Mozzarella, pasta de chocolate Kit Kat e marshmallow maçaricados', null, 62, 72, null, true, 0),
('doces', 'pizza', 'Caramelito', 'Mozzarella, chocolate ao leite, doce de leite, castanha de caju e leite condensado', null, 62, 72, null, true, 1),
('doces', 'pizza', 'Dois Amores', 'Mozzarella, chocolate ao leite e chocolate branco', null, 58, 68, null, true, 2),
('doces', 'pizza', 'Banana Nevada', 'Mozzarella, creme de leite, banana, creme de avelã e canela', null, 58, 68, null, true, 3),
('doces', 'pizza', 'Chocolate', 'Mozzarella e chocolate ao leite', null, 58, 68, null, true, 4),
('doces', 'pizza', 'Morango e Avelã', 'Mozzarella, creme de avelã e morangos selecionados fatiados', null, 62, 72, null, true, 5),
('bebidas', 'simple', 'Água Mineral', '500ml', 6, null, null, '["Com gás","Sem gás"]'::jsonb, true, 0),
('bebidas', 'simple', 'Refrigerante', null, 8, null, null, '["Coca-Cola","Coca Zero","Guaraná Kuat","Fanta Laranja","Sprite"]'::jsonb, true, 1),
('bebidas', 'simple', 'Heineken', 'Long Neck 330ml', 12, null, null, '["Tradicional","0.0"]'::jsonb, true, 2);
