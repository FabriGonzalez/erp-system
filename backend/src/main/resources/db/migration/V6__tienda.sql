-- Etapa 22A: base de la tienda web. Todo es aditivo y con default, así la app vieja sigue
-- funcionando contra la base nueva.

-- El dominio y la habilitación los carga el operador; la empresa solo ajusta el precio web.
-- Sin dominio no hay tienda: varias empresas pueden quedar con NULL (Postgres lo permite en un UNIQUE).
ALTER TABLE public.companies ADD COLUMN store_domain character varying(255);
ALTER TABLE public.companies ADD CONSTRAINT companies_store_domain_key UNIQUE (store_domain);
ALTER TABLE public.companies ADD COLUMN store_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE public.companies ADD COLUMN store_price_adjustment_percent numeric(5,2) DEFAULT 0 NOT NULL;
ALTER TABLE public.companies ADD COLUMN store_rounding_step integer DEFAULT 10 NOT NULL;
ALTER TABLE public.companies ADD CONSTRAINT companies_store_price_adjustment_percent_check
    CHECK (store_price_adjustment_percent BETWEEN -90 AND 500);
ALTER TABLE public.companies ADD CONSTRAINT companies_store_rounding_step_check
    CHECK (store_rounding_step BETWEEN 1 AND 1000);

ALTER TABLE public.products ADD COLUMN published_online boolean DEFAULT false NOT NULL;

-- Una foto es del producto o de una de sus variantes, nunca de los dos.
CREATE TABLE public.product_images (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    product_id bigint,
    product_variant_id bigint,
    storage_key character varying(255) NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT product_images_pkey PRIMARY KEY (id),
    CONSTRAINT product_images_storage_key_key UNIQUE (storage_key),
    CONSTRAINT fk_product_images_company FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT fk_product_images_variant FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id),
    CONSTRAINT product_images_owner_check CHECK ((product_id IS NULL) <> (product_variant_id IS NULL))
);

CREATE SEQUENCE public.product_images_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE INDEX idx_product_images_product ON public.product_images (product_id);
CREATE INDEX idx_product_images_variant ON public.product_images (product_variant_id);

-- Permiso nuevo para configurar la tienda. El CHECK del enum se rehace con el valor agregado.
ALTER TABLE public.role_permissions DROP CONSTRAINT role_permissions_permission_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_permission_check CHECK (((permission)::text = ANY ((ARRAY[
    'CREAR_PEDIDOS'::character varying, 'ADMINISTRAR_CLIENTES'::character varying,
    'ADMINISTRAR_PRODUCTOS'::character varying, 'ADMINISTRAR_CATEGORIAS'::character varying,
    'ADMINISTRAR_PRECIOS'::character varying, 'AJUSTAR_STOCK'::character varying,
    'TRANSFERIR_STOCK'::character varying, 'ADMINISTRAR_USUARIOS'::character varying,
    'VER_REPORTES'::character varying, 'CREAR_ENVIOS'::character varying,
    'ACCEDER_TODAS_SUCURSALES'::character varying, 'VER_PEDIDOS'::character varying,
    'PREPARAR_PEDIDOS'::character varying, 'CONSULTAR_STOCK'::character varying,
    'CONSULTAR_ENVIOS'::character varying, 'ADMINISTRAR_SUCURSALES'::character varying,
    'REGISTRAR_PAGOS'::character varying, 'ADMINISTRAR_TIENDA'::character varying
])::text[])));

-- El rol de sistema (el administrador que crea el alta de la empresa) tiene todos los permisos;
-- las empresas que ya existen lo reciben acá, las nuevas por el alta.
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, 'ADMINISTRAR_TIENDA' FROM public.roles r WHERE r.system_role = true;
