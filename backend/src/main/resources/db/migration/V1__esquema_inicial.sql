-- Esquema inicial: lo que generaba Hibernate (ddl-auto) a partir de las entidades al pasar a
-- Flyway (pg_dump --schema-only de una base vacía). Desde acá, cada cambio de una entidad
-- va en una migración nueva (V2__..., V3__...); nunca se edita una migración ya aplicada.

CREATE TABLE public.account_transactions (
    amount numeric(12,2) NOT NULL,
    account_id bigint NOT NULL,
    branch_id bigint,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    type character varying(30) NOT NULL,
    description character varying(255),
    CONSTRAINT account_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['ORDER_CHARGE'::character varying, 'PAYMENT'::character varying, 'REFUND'::character varying])::text[])))
);

CREATE SEQUENCE public.account_transactions_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.addresses (
    active boolean NOT NULL,
    main_address boolean NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    customer_id bigint NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    apartment character varying(20),
    floor character varying(20),
    number character varying(20),
    postal_code character varying(20),
    label character varying(50),
    city character varying(100),
    country character varying(100),
    state character varying(100),
    street character varying(150),
    reference character varying(200)
);

CREATE SEQUENCE public.addresses_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.branches (
    active boolean NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    phone character varying(20),
    name character varying(100) NOT NULL,
    address character varying(200)
);

CREATE SEQUENCE public.branches_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.categories (
    active boolean NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(500)
);

CREATE SEQUENCE public.categories_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.companies (
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    status_changed_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    tax_id character varying(20),
    name character varying(100) NOT NULL,
    legal_name character varying(150),
    status_reason character varying(500),
    CONSTRAINT companies_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'SUSPENDED'::character varying, 'CANCELLED'::character varying])::text[])))
);

CREATE SEQUENCE public.companies_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.customer_accounts (
    active boolean NOT NULL,
    balance numeric(12,2) NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    customer_id bigint NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE SEQUENCE public.customer_accounts_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.customers (
    active boolean NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    document_type character varying(20),
    phone character varying(30),
    document_number character varying(50),
    email character varying(100),
    first_name character varying(100),
    last_name character varying(100),
    observations text
);

CREATE SEQUENCE public.customers_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.order_items (
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_variant_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity >= 1))
);

CREATE SEQUENCE public.order_items_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.order_number_counters (
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    last_number bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE SEQUENCE public.order_number_counters_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.order_promo_components (
    quantity integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    order_promo_id bigint NOT NULL,
    product_variant_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT order_promo_components_quantity_check CHECK ((quantity >= 1))
);

CREATE SEQUENCE public.order_promo_components_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.order_promos (
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    promotion_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    name character varying(100) NOT NULL,
    CONSTRAINT order_promos_quantity_check CHECK ((quantity >= 1))
);

CREATE SEQUENCE public.order_promos_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.orders (
    amount_paid numeric(12,2),
    quick_sale_amount numeric(12,2),
    total numeric(12,2) NOT NULL,
    branch_id bigint NOT NULL,
    cancelled_at timestamp(6) with time zone,
    company_id bigint NOT NULL,
    confirmed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    created_by bigint NOT NULL,
    customer_id bigint,
    id bigint NOT NULL,
    prepared_at timestamp(6) with time zone,
    shipped_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone NOT NULL,
    delivery_type character varying(20) NOT NULL,
    order_number character varying(20) NOT NULL,
    sales_type character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    CONSTRAINT orders_delivery_type_check CHECK (((delivery_type)::text = ANY ((ARRAY['LOCAL_PICKUP'::character varying, 'SHIPPING'::character varying])::text[]))),
    CONSTRAINT orders_sales_type_check CHECK (((sales_type)::text = ANY ((ARRAY['WITH_PRODUCTS'::character varying, 'QUICK_SALE'::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['CONFIRMED'::character varying, 'TO_PREPARE'::character varying, 'SHIPPED'::character varying, 'CANCELLED'::character varying])::text[])))
);

CREATE SEQUENCE public.orders_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.payment_allocations (
    amount numeric(12,2) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    payment_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE SEQUENCE public.payment_allocations_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.payments (
    amount numeric(12,2) NOT NULL,
    branch_id bigint NOT NULL,
    cancelled_at timestamp(6) with time zone,
    cancelled_by bigint,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    created_by bigint NOT NULL,
    customer_id bigint NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    status character varying(20) NOT NULL,
    method character varying(30) NOT NULL,
    CONSTRAINT payments_method_check CHECK (((method)::text = ANY ((ARRAY['CASH'::character varying, 'TRANSFER'::character varying, 'DEBIT_CARD'::character varying, 'CREDIT_CARD'::character varying])::text[]))),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'CANCELLED'::character varying])::text[])))
);

CREATE SEQUENCE public.payments_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.product_attribute_values (
    active boolean NOT NULL,
    attribute_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    value character varying(100) NOT NULL
);

CREATE SEQUENCE public.product_attribute_values_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.product_attributes (
    active boolean NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    name character varying(100) NOT NULL
);

CREATE SEQUENCE public.product_attributes_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.product_variant_attributes (
    attribute_value_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    variant_id bigint NOT NULL
);

CREATE SEQUENCE public.product_variant_attributes_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.product_variants (
    active boolean NOT NULL,
    price numeric(12,2) NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    sku character varying(50) NOT NULL,
    barcode character varying(64)
);

CREATE SEQUENCE public.product_variants_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.products (
    active boolean NOT NULL,
    category_id bigint NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(500)
);

CREATE SEQUENCE public.products_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.promotion_items (
    quantity integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    promotion_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT promotion_items_quantity_check CHECK ((quantity >= 1))
);

CREATE SEQUENCE public.promotion_items_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.promotions (
    active boolean NOT NULL,
    end_date date NOT NULL,
    price numeric(12,2) NOT NULL,
    start_date date NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(500)
);

CREATE SEQUENCE public.promotions_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.role_permissions (
    role_id bigint NOT NULL,
    permission character varying(255),
    CONSTRAINT role_permissions_permission_check CHECK (((permission)::text = ANY ((ARRAY['CREAR_PEDIDOS'::character varying, 'ADMINISTRAR_CLIENTES'::character varying, 'ADMINISTRAR_PRODUCTOS'::character varying, 'ADMINISTRAR_CATEGORIAS'::character varying, 'ADMINISTRAR_PRECIOS'::character varying, 'AJUSTAR_STOCK'::character varying, 'TRANSFERIR_STOCK'::character varying, 'ADMINISTRAR_USUARIOS'::character varying, 'VER_REPORTES'::character varying, 'CREAR_ENVIOS'::character varying, 'ACCEDER_TODAS_SUCURSALES'::character varying, 'VER_PEDIDOS'::character varying, 'PREPARAR_PEDIDOS'::character varying, 'CONSULTAR_STOCK'::character varying, 'CONSULTAR_ENVIOS'::character varying, 'ADMINISTRAR_SUCURSALES'::character varying, 'REGISTRAR_PAGOS'::character varying])::text[])))
);

CREATE TABLE public.roles (
    active boolean NOT NULL,
    system_role boolean NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(50) NOT NULL,
    description character varying(200)
);

CREATE SEQUENCE public.roles_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.shipments (
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    apartment character varying(20),
    floor character varying(20),
    number character varying(20),
    postal_code character varying(20),
    state character varying(100),
    city character varying(150) NOT NULL,
    country character varying(150) NOT NULL,
    street character varying(150) NOT NULL,
    reference character varying(200)
);

CREATE SEQUENCE public.shipments_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.stock_movements (
    new_quantity integer NOT NULL,
    previous_quantity integer NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    created_by_id bigint,
    id bigint NOT NULL,
    reference_id bigint,
    stock_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    reason character varying(500),
    reference_type character varying(255),
    type character varying(255) NOT NULL,
    CONSTRAINT stock_movements_type_check CHECK (((type)::text = ANY ((ARRAY['SALE'::character varying, 'ADJUSTMENT'::character varying, 'TRANSFER_IN'::character varying, 'TRANSFER_OUT'::character varying, 'RETURN'::character varying])::text[])))
);

CREATE SEQUENCE public.stock_movements_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.stock_transfer_items (
    quantity integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    product_variant_id bigint NOT NULL,
    transfer_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT stock_transfer_items_quantity_check CHECK ((quantity >= 1))
);

CREATE SEQUENCE public.stock_transfer_items_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.stock_transfers (
    company_id bigint NOT NULL,
    confirmed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    created_by bigint NOT NULL,
    destination_branch_id bigint NOT NULL,
    id bigint NOT NULL,
    origin_branch_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    status character varying(20) NOT NULL,
    CONSTRAINT stock_transfers_status_check CHECK (((status)::text = ANY ((ARRAY['CONFIRMED'::character varying, 'CANCELLED'::character varying])::text[])))
);

CREATE SEQUENCE public.stock_transfers_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.stocks (
    quantity integer NOT NULL,
    branch_id bigint NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    product_variant_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE SEQUENCE public.stocks_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.user_branches (
    branch_id bigint NOT NULL,
    id bigint NOT NULL,
    user_id bigint NOT NULL
);

CREATE SEQUENCE public.user_branches_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.users (
    active boolean NOT NULL,
    password_managed_by_admin boolean DEFAULT false NOT NULL,
    platform_admin boolean NOT NULL,
    company_id bigint,
    created_at timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    password_changed_at timestamp(6) with time zone,
    role_id bigint,
    updated_at timestamp(6) with time zone NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    password character varying(255) NOT NULL
);

CREATE SEQUENCE public.users_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.account_transactions
    ADD CONSTRAINT account_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_key UNIQUE (name);

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_tax_id_key UNIQUE (tax_id);

ALTER TABLE ONLY public.customer_accounts
    ADD CONSTRAINT customer_accounts_customer_id_key UNIQUE (customer_id);

ALTER TABLE ONLY public.customer_accounts
    ADD CONSTRAINT customer_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_number_counters
    ADD CONSTRAINT order_number_counters_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_promo_components
    ADD CONSTRAINT order_promo_components_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_promos
    ADD CONSTRAINT order_promos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_attribute_values
    ADD CONSTRAINT product_attribute_values_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT product_attributes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_variant_attributes
    ADD CONSTRAINT product_variant_attributes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.promotion_items
    ADD CONSTRAINT promotion_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_key UNIQUE (role_id, permission);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_key UNIQUE (order_id);

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT uk_branch_company_name UNIQUE (company_id, name);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT uk_category_company_name UNIQUE (company_id, name);

ALTER TABLE ONLY public.customer_accounts
    ADD CONSTRAINT uk_customer_account_company_customer UNIQUE (company_id, customer_id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT uk_customer_company_document UNIQUE (company_id, document_type, document_number);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT uk_order_company_number UNIQUE (company_id, order_number);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT uk_order_item_variant UNIQUE (order_id, product_variant_id);

ALTER TABLE ONLY public.order_number_counters
    ADD CONSTRAINT uk_order_number_counter_company UNIQUE (company_id);

ALTER TABLE ONLY public.order_promo_components
    ADD CONSTRAINT uk_order_promo_component_variant UNIQUE (order_promo_id, product_variant_id);

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT uk_product_attribute_company_name UNIQUE (company_id, name);

ALTER TABLE ONLY public.product_attribute_values
    ADD CONSTRAINT uk_product_attribute_value UNIQUE (attribute_id, value);

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT uk_product_variant_company_barcode UNIQUE (company_id, barcode);

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT uk_product_variant_company_sku UNIQUE (company_id, sku);

ALTER TABLE ONLY public.promotion_items
    ADD CONSTRAINT uk_promotion_item_product UNIQUE (promotion_id, product_id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT uk_role_company_code UNIQUE (company_id, code);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT uk_role_company_name UNIQUE (company_id, name);

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT uk_stock_variant_branch UNIQUE (product_variant_id, branch_id);

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT uk_transfer_item_variant UNIQUE (transfer_id, product_variant_id);

ALTER TABLE ONLY public.product_variant_attributes
    ADD CONSTRAINT uk_variant_attribute_value UNIQUE (variant_id, attribute_value_id);

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);

CREATE INDEX idx_stock_movements_stock_created ON public.stock_movements USING btree (stock_id, created_at);

CREATE INDEX idx_stock_movements_type ON public.stock_movements USING btree (type);

CREATE INDEX idx_stocks_company ON public.stocks USING btree (company_id);

CREATE INDEX idx_stocks_company_branch ON public.stocks USING btree (company_id, branch_id);

CREATE INDEX idx_stocks_company_variant ON public.stocks USING btree (company_id, product_variant_id);

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT fk1dfr1vnlvap7xbwhe888p6fd1 FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.product_attribute_values
    ADD CONSTRAINT fk1oveqdcusmrm22vlr6m0u2hnn FOREIGN KEY (attribute_id) REFERENCES public.product_attributes(id);

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT fk1sfpl1hrqmfuea4c22ceqh8h3 FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk1vldikbqexeu85qvsedncxvs3 FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.customer_accounts
    ADD CONSTRAINT fk260iegb70hy2yhyh1xshkrbw7 FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.order_promos
    ADD CONSTRAINT fk3wgvrelgu8rh3snta7hkyh5vf FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk44957q7sogi6mtk6hs19kgycu FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk45dp0030s8e3myd8n6ky4e79g FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT fk51q9kxvqtnva6lxg7js31ex2b FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.promotion_items
    ADD CONSTRAINT fk5oexus1mhu016dyg9xiyepi23 FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT fk7igwfpfm5e0fxop2thk7jtbou FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.order_number_counters
    ADD CONSTRAINT fk99034i4ul233q1186cfr6bmlu FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.order_promos
    ADD CONSTRAINT fka9mttfk6o5quf3lniwiaq8ucu FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fkaf8ek38lpjpb74pmtl1ygr5jd FOREIGN KEY (cancelled_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.order_promo_components
    ADD CONSTRAINT fkbbb4eldtkri2fpio1iipnf6k FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT fkbhwxghle54xa2kencanhoba8p FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fkbioxgbv59vetrxe0ejfubep1w FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.customer_accounts
    ADD CONSTRAINT fkbncewxo4cfubk01gp68k8jsdh FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fkbnclwwetqhl0wwr5ubgne2xt1 FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT fkcws3108ier5wt4b0df1l5ytcm FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fkd7gx3doh12b2qx2b9j2e1dsxe FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT fkdp7yf5up5coo4njjvq1dwdxif FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT fkertcckucd49nmw8ley2j5pxmh FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id);

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT fkf6kmlajje9ey0ae5kr2u71xdu FOREIGN KEY (payment_id) REFERENCES public.payments(id);

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT fkfhk0y5524hlyl8kend6ei4id8 FOREIGN KEY (stock_id) REFERENCES public.stocks(id);

ALTER TABLE ONLY public.account_transactions
    ADD CONSTRAINT fkfxh7qto9e2ovy8hgloc4ko8vk FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT fkg2946lycn8eakmt5i6l0xaq53 FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE ONLY public.promotion_items
    ADD CONSTRAINT fkgjsr563pgeef2e89mt5qxp2xn FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT fkhrpf5e8dwasvdc5cticysrt2k FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT fkimja8gio8nl33quglj548pvid FOREIGN KEY (created_by_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fkin8gn4o1hpiwe6qe4ey7ykwq7 FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT fkj57r30wsr5pfk5el33kr29y8v FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fkjcfql8n80mxan8of04c8sd8k2 FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE ONLY public.product_variant_attributes
    ADD CONSTRAINT fkjcp7i8t08la8masfe513eisnv FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT fkjl8l1yyav2ta0gb4p7x744wpj FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT fkjuiihymin83oadf71ou3oelya FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.order_promo_components
    ADD CONSTRAINT fkjuy8fi7cjk4tasucy4olqm7lc FOREIGN KEY (order_promo_id) REFERENCES public.order_promos(id);

ALTER TABLE ONLY public.product_variant_attributes
    ADD CONSTRAINT fkkjq7foy6jiwp455fb1j9gl4od FOREIGN KEY (attribute_value_id) REFERENCES public.product_attribute_values(id);

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT fkknv7ud3srtg907mbtn4xbaixg FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT fkl9seru5curo311xhtpbxe3074 FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT fklsigu62kq8e15gldo7jp83qsd FOREIGN KEY (origin_branch_id) REFERENCES public.branches(id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fkltmtlue0wixrg1cf0xo7x0l4d FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT fkm4t9a2g3d7dpdu6fiejxypxhv FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fkn5fotdgk8d1xvo8nav9uv3muc FOREIGN KEY (role_id) REFERENCES public.roles(id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fkog2rp4qthbtt2lfyhfo32lsw9 FOREIGN KEY (category_id) REFERENCES public.categories(id);

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT fkosqitn4s405cynmhb87lkvuau FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fkp56c1712k691lhsyewcssf40f FOREIGN KEY (role_id) REFERENCES public.roles(id);

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT fkplkde580pd7nggy87lf81jo40 FOREIGN KEY (destination_branch_id) REFERENCES public.branches(id);

ALTER TABLE ONLY public.account_transactions
    ADD CONSTRAINT fkpsngk6jo7oaekjkcnf1wmm7f9 FOREIGN KEY (account_id) REFERENCES public.customer_accounts(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fkpxtb8awmi0dk6smoh2vp1litg FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fkr67nkbovcmogr3o5xkmfepgl1 FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT fkrnt4wht95lxxplspltrg9681s FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT fksprgx6t7q5f1q3wsf99ywsjn2 FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT fktdeftymo1mk999qigob1ji2p0 FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fktjwuphstqm46uffgc7l1r27a9 FOREIGN KEY (created_by) REFERENCES public.users(id);
