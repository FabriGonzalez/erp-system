import { queryClient } from '@/services/query-client';
import { getStockMovements } from '@/services/stock-movement-service';
import { useAuthStore } from '@/stores/auth-store';
import { useProductStore } from '@/stores/product-store';
import { STOCK_MOVEMENT_READ_PERMISSIONS, hasAnyPermission } from '@/utils/permissions';

import { requireToken, usePagedList } from './use-paged-list';

const PAGE_SIZE = 20;

export const stockMovementKeys = {
    all: ['stock-movements'] as const,
    byStock: (stockId: string, pageSize: number) =>
        [...stockMovementKeys.all, 'stock', stockId, pageSize] as const,
};

/**
 * Historial de un stock, del más nuevo al más viejo. Los movimientos los generan pedidos,
 * transferencias, ajustes y productos, que viven en otros módulos: con staleTime 0 el
 * historial se vuelve a pedir cada vez que se abre en lugar de invalidarlo desde cada uno.
 */
export function useStockMovements(stockId: string | undefined) {
    const canRead = useAuthStore((state) => hasAnyPermission(state.user, STOCK_MOVEMENT_READ_PERMISSIONS));
    return usePagedList(
        stockMovementKeys.byStock(stockId ?? '', PAGE_SIZE),
        (page) => getStockMovements({ stockId: stockId as string, page, size: PAGE_SIZE }, requireToken()),
        canRead && Boolean(stockId),
        (movement) => movement.id,
        { staleTime: 0 },
    );
}

/** Para las mutaciones que mueven stock con la pantalla de historial ya montada. */
export function invalidateStockMovements() {
    void queryClient.invalidateQueries({ queryKey: stockMovementKeys.all });
}

/**
 * Para pedidos y transferencias, que mueven stock desde otro módulo. El stock por variante
 * vive en product-store (Zustand), que usan las pestañas siempre montadas: se relee si ya
 * estaba cargado. Inventario (stock-store) vuelve a pedir el stock cada vez que se abre.
 */
export function refreshStockAfterChange() {
    invalidateStockMovements();

    const token = useAuthStore.getState().token;
    if (token && useProductStore.getState().products.length > 0) {
        // Si falla, el catálogo se vuelve a pedir al abrirlo.
        useProductStore.getState().fetchProducts(token).catch(() => undefined);
    }
}
