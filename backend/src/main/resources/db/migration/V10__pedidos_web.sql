-- Etapa 22C (paso 1): modelo de los pedidos web. Aditiva: los pedidos existentes quedan como ERP
-- y con el stock descontado, y la app vieja sigue funcionando contra la base nueva.

-- Por dónde entró el pedido.
ALTER TABLE public.orders ADD COLUMN channel character varying(10) DEFAULT 'ERP' NOT NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_channel_check
    CHECK (((channel)::text = ANY ((ARRAY['ERP'::character varying, 'WEB'::character varying])::text[])));

-- Falso cuando ninguna sucursal puede armar el pedido sola: se cobra sin descontar stock y, si
-- la reserva vence, no hay nada para devolver.
ALTER TABLE public.orders ADD COLUMN stock_reserved boolean DEFAULT true NOT NULL;

-- Los pedidos y pagos de la tienda no los carga un empleado.
ALTER TABLE public.orders ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY[
    'CONFIRMED'::character varying, 'TO_PREPARE'::character varying, 'SHIPPED'::character varying,
    'CANCELLED'::character varying, 'PENDING_PAYMENT'::character varying, 'TO_ASSIGN'::character varying
])::text[])));

-- orders.payment_method no se amplía: es solo de ventas sin cliente, y la tienda siempre tiene cliente.
ALTER TABLE public.payments DROP CONSTRAINT payments_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_method_check CHECK (((method)::text = ANY ((ARRAY[
    'CASH'::character varying, 'TRANSFER'::character varying, 'DEBIT_CARD'::character varying,
    'CREDIT_CARD'::character varying, 'MERCADO_PAGO'::character varying
])::text[])));

-- Orden en que la tienda intenta armar un pedido. Vacío = la sucursal no vende por la web: cada
-- dueño elige cuáles participan, y una sucursal nueva nunca sale a la venta sola.
ALTER TABLE public.branches ADD COLUMN store_priority integer;
