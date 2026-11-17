-- Etapa 22C (paso 2b): checkout de la tienda. Aditiva: los pedidos existentes quedan sin envío
-- cobrado y sin clave.

-- Costo del envío, ya sumado al total. Siempre 0 en los pedidos del ERP.
ALTER TABLE public.orders ADD COLUMN shipping_cost numeric(12,2) DEFAULT 0 NOT NULL;

-- La genera el sitio por cada intento de compra: un doble clic o un reintento con la misma clave
-- devuelve el pedido ya creado en lugar de crear otro.
ALTER TABLE public.orders ADD COLUMN checkout_key character varying(64);
CREATE UNIQUE INDEX uk_order_company_checkout_key ON public.orders (company_id, checkout_key)
    WHERE checkout_key IS NOT NULL;
