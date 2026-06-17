-- Permite pausar sabores/opções individuais de um item (ex: Coca Zero em falta)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS unavailable_options jsonb NOT NULL DEFAULT '[]';
