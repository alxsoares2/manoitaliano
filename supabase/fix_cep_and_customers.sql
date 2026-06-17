-- 1. Adiciona coluna cep em orders e customers (não existiam)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cep text;

-- 2. Atualiza o trigger que cria/atualiza o cliente a cada pedido para incluir cep
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (
    phone, name, cep, address, address_number, neighborhood, complement, reference,
    total_spent, orders_count, first_order_at, last_order_at
  )
  VALUES (
    new.customer_phone, new.customer_name, new.cep, new.address, new.address_number,
    new.neighborhood, new.complement, new.reference,
    new.total, 1, new.created_at, new.created_at
  )
  ON CONFLICT (phone) DO UPDATE SET
    name = excluded.name,
    cep = excluded.cep,
    address = excluded.address,
    address_number = excluded.address_number,
    neighborhood = excluded.neighborhood,
    complement = excluded.complement,
    reference = excluded.reference,
    total_spent = public.customers.total_spent + excluded.total_spent,
    orders_count = public.customers.orders_count + 1,
    last_order_at = excluded.last_order_at;

  RETURN new;
END;
$$;
