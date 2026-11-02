import { ProductVariant } from '@/types/product';

/** Filtro de atributos: los valores elegidos de cada atributo (attributeId → ids de valor). */
export type AttributeFilter = Record<string, string[]>;

/** Ids de valor para el backend, ordenados: la misma selección comparte la caché. */
export function attributeFilterValueIds(filter: AttributeFilter): string[] {
    return Object.values(filter).flat().sort((a, b) => Number(a) - Number(b));
}

/**
 * Mismo criterio que el backend: de cada atributo filtrado, la variante tiene alguno de los
 * valores elegidos.
 */
export function variantMatchesFilter(variant: ProductVariant, filter: AttributeFilter): boolean {
    return Object.entries(filter).every(([attributeId, valueIds]) =>
        variant.attributes.some((attribute) =>
            attribute.attributeId === attributeId && valueIds.includes(attribute.attributeValueId),
        ),
    );
}

/** Los atributos con un único valor elegido: no hay nada más que elegir en ellos. */
export function singleValueAttributes(filter: AttributeFilter): Record<string, string> {
    return Object.fromEntries(
        Object.entries(filter)
            .filter(([, valueIds]) => valueIds.length === 1)
            .map(([attributeId, valueIds]) => [attributeId, valueIds[0]]),
    );
}
