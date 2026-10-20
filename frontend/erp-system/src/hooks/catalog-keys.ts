import { queryClient } from '@/services/query-client';
import { ProductListParams } from '@/types/product';
import { StockListParams } from '@/types/stock';

import { invalidateStockMovements } from './use-stock-movement-queries';

/**
 * Claves de caché de productos y stock. Van aparte de los hooks para que pedidos,
 * transferencias y ajustes puedan invalidarlas sin importar los hooks de cada módulo.
 */
export const productKeys = {
    all: ['products'] as const,
    lists: () => [...productKeys.all, 'list'] as const,
    list: (filters: ProductListParams) => [...productKeys.lists(), filters] as const,
    detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export const stockKeys = {
    all: ['stocks'] as const,
    lists: () => [...stockKeys.all, 'list'] as const,
    list: (filters: Omit<StockListParams, 'variantIds'>) => [...stockKeys.lists(), filters] as const,
    detail: (id: string) => [...stockKeys.all, 'detail', id] as const,
    // Ids ordenados y sin repetir: el mismo borrador comparte la caché aunque cambie el orden.
    variants: (branchId: string, variantIds: string[]) =>
        [...stockKeys.all, 'variants', branchId, variantIds] as const,
};

/** El stock cambió (ajuste o edición de producto): listados de stock, borradores e historial. */
export function invalidateStockViews() {
    void queryClient.invalidateQueries({ queryKey: stockKeys.all });
    invalidateStockMovements();
}

/**
 * Para pedidos, transferencias y ajustes, que mueven stock: el producto lo trae por sucursal,
 * así que también cambian sus listados y detalles.
 */
export function refreshStockAfterChange() {
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
    invalidateStockViews();
}
