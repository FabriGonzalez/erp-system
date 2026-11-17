-- Los clientes registrados desde la tienda nacían sin cuenta corriente, y sin ella no se les
-- puede cargar un pedido del ERP ni acreditar un pago web. Se crea en cero para los que faltan.
-- El id sale de la secuencia: Hibernate reserva bloques con el valor siguiente, así que no choca.
INSERT INTO public.customer_accounts (id, customer_id, company_id, balance, active, created_at, updated_at)
SELECT nextval('public.customer_accounts_seq'), c.id, c.company_id, 0, true, now(), now()
FROM public.customers c
WHERE NOT EXISTS (SELECT 1 FROM public.customer_accounts a WHERE a.customer_id = c.id);
