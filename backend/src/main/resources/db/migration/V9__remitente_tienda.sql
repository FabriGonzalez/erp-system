-- Etapa 22B (paso 3c): dirección desde la que salen los mails de la tienda. La carga el
-- administrador de la plataforma recién cuando el dominio tiene SPF/DKIM del proveedor de mail;
-- vacía = salen de MAIL_FROM, la dirección general de la plataforma.
ALTER TABLE public.companies ADD COLUMN store_mail_from character varying(254);
