-- Muestra de color opcional en cada valor de atributo: lista ordenada de colores hex
-- (el primero es el primario). El esquema no pone tope de cantidad: el máximo lo fija la
-- validación del request. Cómo se dibuja la muestra lo decide cada frontend.
ALTER TABLE public.product_attribute_values ADD COLUMN swatch_colors varchar(7)[];

-- Si hay muestra: una sola dimensión, al menos un color, sin nulos y cada uno #RRGGBB en
-- mayúsculas. array_to_string saltea los nulos, por eso se controlan aparte con array_position.
ALTER TABLE public.product_attribute_values ADD CONSTRAINT ck_product_attribute_values_swatch_colors CHECK (
    swatch_colors IS NULL OR (
        array_ndims(swatch_colors) = 1
        AND cardinality(swatch_colors) >= 1
        AND array_position(swatch_colors, NULL) IS NULL
        AND array_to_string(swatch_colors, ',') ~ '^#[0-9A-F]{6}(,#[0-9A-F]{6})*$'
    )
);
