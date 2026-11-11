-- Etapa 22C (paso 4a2): renovación automática de los tokens de Mercado Pago. Aditiva.

-- RECONNECT_REQUIRED = Mercado Pago rechazó la renovación o el token venció: la tienda no puede
-- cobrar hasta que el admin vuelva a conectar la cuenta.
ALTER TABLE public.mercado_pago_connections ADD COLUMN status character varying(30) DEFAULT 'CONNECTED' NOT NULL;
ALTER TABLE public.mercado_pago_connections ADD CONSTRAINT mercado_pago_connections_status_check
    CHECK (((status)::text = ANY ((ARRAY['CONNECTED'::character varying, 'RECONNECT_REQUIRED'::character varying])::text[])));

ALTER TABLE public.mercado_pago_connections ADD COLUMN last_refreshed_at timestamp(6) with time zone;
