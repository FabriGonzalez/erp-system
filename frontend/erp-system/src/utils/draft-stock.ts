import { OrderItem, OrderPromo, OrderPromoComponent } from '@/types/order';

/**
 * Stock de un borrador de pedido con promos. El backend mide el stock por variante sumando lo
 * suelto y lo que llevan las promos (unidades del componente × cantidad de promos); acá se
 * limitan las cantidades con el mismo criterio.
 */

/** Unidades de cada variante que llevan las líneas de promo, sin contar la excluida. */
export function promoUnitsByVariant(promos: OrderPromo[], excludeLineId?: string): Record<string, number> {
    const units: Record<string, number> = {};
    for (const promo of promos) {
        if (promo.id === excludeLineId) continue;
        for (const component of promo.components) {
            units[component.variantId] = (units[component.variantId] ?? 0) + component.quantity * promo.quantity;
        }
    }
    return units;
}

/** Unidades por variante de todo el borrador (o de un pedido): sueltas más las de las promos. */
export function draftUnitsByVariant(items: OrderItem[], promos: OrderPromo[]): Record<string, number> {
    const units = promoUnitsByVariant(promos);
    for (const item of items) {
        units[item.variantId] = (units[item.variantId] ?? 0) + item.quantity;
    }
    return units;
}

/** Variantes cuyo stock hace falta para limitar el borrador. */
export function draftVariantIds(items: OrderItem[], promos: OrderPromo[]): string[] {
    return [
        ...items.map((item) => item.variantId),
        ...promos.flatMap((promo) => promo.components.map((component) => component.variantId)),
    ];
}

/**
 * Cuántas veces entra la combinación de una línea de promo: por cada variante elegida, lo que
 * queda (stock de la sucursal + lo que el pedido en edición ya tenía descontado − lo que usa el
 * resto del borrador) dividido por sus unidades por promo. undefined mientras falte el stock de
 * alguna. lineId: la línea que se mide (vacío para una combinación que todavía no está).
 */
export function promoLimit(
    lineId: string,
    components: Pick<OrderPromoComponent, 'variantId' | 'quantity'>[],
    stockOf: (variantId: string) => number | undefined,
    reservedUnits: Record<string, number>,
    items: OrderItem[],
    promos: OrderPromo[],
): number | undefined {
    const otherPromoUnits = promoUnitsByVariant(promos, lineId);
    let limit = Number.POSITIVE_INFINITY;

    for (const component of components) {
        const stock = stockOf(component.variantId);
        if (stock === undefined) return undefined;
        const looseUnits = items
            .filter((item) => item.variantId === component.variantId)
            .reduce((sum, item) => sum + item.quantity, 0);
        const free = stock + (reservedUnits[component.variantId] ?? 0)
            - looseUnits - (otherPromoUnits[component.variantId] ?? 0);
        limit = Math.min(limit, Math.floor(Math.max(0, free) / component.quantity));
    }
    return Number.isFinite(limit) ? limit : 0;
}
