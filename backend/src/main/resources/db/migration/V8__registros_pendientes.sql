-- Etapa 22B: un registro en la tienda queda pendiente hasta que se toca el link del mail. Recién
-- ahí se crean la cuenta y la ficha WEB, con los datos de ese registro: un registro ajeno con el
-- mismo email nunca termina siendo la cuenta, y el ERP solo ve clientes con el email verificado.
-- Puede haber varios pendientes por email (se registró dos veces); verificar uno borra los demás.
CREATE TABLE public.store_pending_registrations (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    email character varying(100) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(30),
    password_hash character varying(100) NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT store_pending_registrations_pkey PRIMARY KEY (id),
    CONSTRAINT store_pending_registrations_token_hash_key UNIQUE (token_hash),
    CONSTRAINT fk_store_pending_registrations_company FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

CREATE SEQUENCE public.store_pending_registrations_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE INDEX idx_store_pending_registrations_company_email
    ON public.store_pending_registrations (company_id, email);
