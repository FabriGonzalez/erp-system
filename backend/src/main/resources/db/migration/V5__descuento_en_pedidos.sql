-- Descuento en pesos sobre el pedido entero (p. ej. una rebaja a un buen cliente). El total ya
-- viene descontado: es lo que se cobra, y lo que suman la caja y los reportes de ventas.
-- Las ventas rápidas no llevan descuento.
ALTER TABLE public.orders ADD COLUMN discount numeric(12,2) DEFAULT 0 NOT NULL;
