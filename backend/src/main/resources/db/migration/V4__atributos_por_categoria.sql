-- Cada categoría elige qué atributos usan sus productos (Remeras: Talle y Color; Perfumes:
-- Volumen). Un atributo puede estar en varias categorías.
CREATE TABLE public.category_attributes (
    category_id bigint NOT NULL,
    attribute_id bigint NOT NULL,
    CONSTRAINT category_attributes_pkey PRIMARY KEY (category_id, attribute_id),
    CONSTRAINT fk_category_attributes_category FOREIGN KEY (category_id) REFERENCES public.categories(id),
    CONSTRAINT fk_category_attributes_attribute FOREIGN KEY (attribute_id) REFERENCES public.product_attributes(id)
);

CREATE INDEX idx_category_attributes_attribute ON public.category_attributes (attribute_id);

-- Arranca con los atributos que ya usan los productos de cada categoría.
INSERT INTO public.category_attributes (category_id, attribute_id)
SELECT DISTINCT p.category_id, pav.attribute_id
FROM public.products p
JOIN public.product_variants pv ON pv.product_id = p.id
JOIN public.product_variant_attributes pva ON pva.variant_id = pv.id
JOIN public.product_attribute_values pav ON pav.id = pva.attribute_value_id;
