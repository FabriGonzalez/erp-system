-- Etapa 22B: cuentas de comprador de la tienda web. Aditiva: los clientes existentes quedan
-- con origen ERP y la app vieja sigue funcionando contra la base nueva.

-- De dónde salió la ficha: cargada en el ERP o creada por un registro en la tienda. Un registro
-- nunca reutiliza una ficha del ERP, aunque coincida el email.
ALTER TABLE public.customers ADD COLUMN origin character varying(10) DEFAULT 'ERP' NOT NULL;
ALTER TABLE public.customers ADD CONSTRAINT customers_origin_check
    CHECK (((origin)::text = ANY ((ARRAY['ERP'::character varying, 'WEB'::character varying])::text[])));

-- La cuenta web de una ficha. El email es único dentro de cada empresa, no en toda la
-- plataforma: la misma persona tiene una cuenta por tienda. Se guarda en minúsculas.
-- Sin contraseña = cuenta creada con Google (google_subject es el id fijo de la persona en Google).
CREATE TABLE public.store_accounts (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(100),
    google_subject character varying(255),
    email_verified_at timestamp(6) with time zone,
    password_changed_at timestamp(6) with time zone,
    last_login_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT store_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT store_accounts_customer_key UNIQUE (customer_id),
    CONSTRAINT store_accounts_company_email_key UNIQUE (company_id, email),
    CONSTRAINT store_accounts_company_google_key UNIQUE (company_id, google_subject),
    CONSTRAINT fk_store_accounts_company FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT fk_store_accounts_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT store_accounts_credential_check CHECK (password_hash IS NOT NULL OR google_subject IS NOT NULL)
);

CREATE SEQUENCE public.store_accounts_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Links de un solo uso (verificar el email, recuperar la contraseña). Se guarda solo el hash
-- del token: con la base filtrada, los links no sirven.
CREATE TABLE public.store_account_tokens (
    id bigint NOT NULL,
    store_account_id bigint NOT NULL,
    type character varying(30) NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    used_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT store_account_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT store_account_tokens_token_hash_key UNIQUE (token_hash),
    CONSTRAINT fk_store_account_tokens_account FOREIGN KEY (store_account_id) REFERENCES public.store_accounts(id),
    CONSTRAINT store_account_tokens_type_check
        CHECK (((type)::text = ANY ((ARRAY['EMAIL_VERIFICATION'::character varying, 'PASSWORD_RESET'::character varying])::text[])))
);

CREATE SEQUENCE public.store_account_tokens_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE INDEX idx_store_account_tokens_account ON public.store_account_tokens (store_account_id);
