import { Product, ProductVariant } from '@/types/product';
import { AttributeFilter, variantMatchesFilter } from '@/utils/attribute-filter';

/** Stock de una variante en la sucursal o, sin sucursal, el total de todas. */
export function variantStock(variant: ProductVariant, branchId: string | undefined): number {
    if (branchId) {
        return variant.stockByBranch[branchId] ?? 0;
    }
    return Object.values(variant.stockByBranch).reduce((sum, quantity) => sum + quantity, 0);
}

/**
 * Suma de las variantes (con filtro de atributos, solo de las que coinciden); es el mismo
 * criterio del filtro de stock del backend.
 */
export function productStock(product: Product, branchId: string | undefined, filter?: AttributeFilter): number {
    return product.variants
        .filter((variant) => !filter || variantMatchesFilter(variant, filter))
        .reduce((sum, variant) => sum + variantStock(variant, branchId), 0);
}
