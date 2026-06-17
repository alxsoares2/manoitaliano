-- Busca de cliente por telefone normalizado (só dígitos), independente de como
-- o telefone foi salvo (formatado pelo trigger de pedido ou em dígitos no
-- cadastro manual).
CREATE OR REPLACE FUNCTION public.lookup_customer(p_digits text)
RETURNS SETOF public.customers
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.customers
  WHERE regexp_replace(phone, '\D', '', 'g') = p_digits
  LIMIT 1;
$$;
