-- Las ventas sin cliente (consumidor final) se cobran completas al crearse y no generan un
-- pago: el medio queda en el pedido. Null en las ventas con cliente (su medio va en payments)
-- y en las ventas sin cliente anteriores a esta migración.
ALTER TABLE public.orders ADD COLUMN payment_method character varying(30);

ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['CASH'::character varying, 'TRANSFER'::character varying, 'DEBIT_CARD'::character varying, 'CREDIT_CARD'::character varying])::text[])));
