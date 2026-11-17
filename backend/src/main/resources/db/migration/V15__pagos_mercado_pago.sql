-- Etapa 22C (paso 4c): pagos acreditados por el webhook de Mercado Pago. Aditiva: los pagos del ERP
-- quedan sin id de Mercado Pago.

-- El id del pago en Mercado Pago. Único: Mercado Pago repite los avisos y el mismo pago no se
-- registra dos veces aunque lleguen a la vez.
ALTER TABLE public.payments ADD COLUMN mp_payment_id character varying(50);
ALTER TABLE public.payments ADD CONSTRAINT uk_payments_mp_payment_id UNIQUE (mp_payment_id);
