-- Etapa 22C (paso 4a1): cuenta de Mercado Pago conectada por cada empresa (OAuth). Aditiva.

-- Los tokens van cifrados (AES-GCM con APP_ENCRYPTION_KEY): con la base filtrada no sirven para
-- cobrar ni para ver los pagos de la empresa. Una cuenta de Mercado Pago pertenece a una sola
-- empresa, así el webhook sabe sin dudas de quién es cada pago.
CREATE TABLE public.mercado_pago_connections (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    mp_user_id bigint NOT NULL,
    access_token_encrypted text NOT NULL,
    refresh_token_encrypted text NOT NULL,
    live_mode boolean NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    connected_at timestamp(6) with time zone NOT NULL,
    connected_by_user_id bigint,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT mercado_pago_connections_pkey PRIMARY KEY (id),
    CONSTRAINT mercado_pago_connections_company_key UNIQUE (company_id),
    CONSTRAINT mercado_pago_connections_mp_user_key UNIQUE (mp_user_id),
    CONSTRAINT fk_mercado_pago_connections_company FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT fk_mercado_pago_connections_user FOREIGN KEY (connected_by_user_id) REFERENCES public.users(id)
);

CREATE SEQUENCE public.mercado_pago_connections_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
