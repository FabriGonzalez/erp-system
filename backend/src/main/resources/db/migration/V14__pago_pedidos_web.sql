-- Etapa 22C (paso 4b): link de pago de Mercado Pago de los pedidos web. Aditiva: los pedidos del
-- ERP quedan sin link.

-- Hasta cuándo vale la reserva: después el link deja de servir y el pedido se cancela (paso 5).
ALTER TABLE public.orders ADD COLUMN payment_expires_at timestamp(6) with time zone;

-- La preferencia de Mercado Pago (el cobro armado de su lado) y la URL de su pantalla de pago,
-- para que el comprador pueda retomar el pago desde "Mis pedidos".
ALTER TABLE public.orders ADD COLUMN mp_preference_id character varying(100);
ALTER TABLE public.orders ADD COLUMN payment_url character varying(500);
