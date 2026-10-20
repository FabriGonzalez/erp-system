import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/services/query-client';
import { adjustStock, getStockById, getStocks } from '@/services/stock-service';
import { useAuthStore } from '@/stores/auth-store';
import { Stock, StockAdjustRequest } from '@/types/stock';

import { refreshStockAfterChange, stockKeys } from './catalog-keys';
import { useDebouncedValue } from './use-debounced-value';
import { errorText, findInPagedLists, requireToken, usePagedList } from './use-paged-list';

const PAGE_SIZE = 20;
// Tope del backend: el stock de un borrador entra en una página casi siempre.
const VARIANT_PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;

// --- Consultas ---

/** Stock de una sucursal (Inventario), por producto y SKU, con búsqueda en el backend. */
export function useBranchStocks({ branchId, q }: { branchId: string | undefined; q: string }) {
    const query = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS);
    const filters = { branchId, q: query || undefined };

    return usePagedList(
        stockKeys.list(filters),
        (page) => getStocks({ ...filters, page, size: PAGE_SIZE }, requireToken()),
        Boolean(branchId),
        (stock) => stock.id,
    );
}

export function useStock(id: string | undefined) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const enabled = hasSession && Boolean(id);
    const result = useQuery({
        queryKey: stockKeys.detail(id ?? ''),
        queryFn: () => getStockById(id as string, requireToken()),
        enabled,
        // La copia del listado de Inventario, para no mostrar un spinner.
        placeholderData: id ? () => findInPagedLists<Stock>(stockKeys.lists(), id) : undefined,
    });

    return {
        stock: result.data ?? null,
        isLoading: result.isPending && enabled,
        loadError: result.data ? null : errorText(result.error),
        reload: () => void result.refetch(),
    };
}

async function fetchVariantStock(branchId: string, variantIds: string[]): Promise<Record<string, number>> {
    const token = requireToken();
    const quantities: Record<string, number> = {};

    for (let page = 0; ; page += 1) {
        const result = await getStocks({ branchId, variantIds, page, size: VARIANT_PAGE_SIZE }, token);
        for (const stock of result.content) {
            quantities[stock.productVariantId] = stock.quantity;
        }
        if (page + 1 >= result.totalPages) {
            return quantities;
        }
    }
}

/**
 * Stock en una sucursal de las variantes de un borrador (pedido o transferencia), para limitar
 * las cantidades sin depender del catálogo cargado. Mientras llega el de una variante recién
 * agregada se conserva lo anterior: stockOf devuelve undefined para lo que todavía no se sabe.
 */
export function useVariantStock(branchId: string | undefined, variantIds: string[]) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const ids = [...new Set(variantIds)].sort();
    const enabled = hasSession && Boolean(branchId) && ids.length > 0;
    const result = useQuery({
        queryKey: stockKeys.variants(branchId ?? '', ids),
        queryFn: () => fetchVariantStock(branchId as string, ids),
        enabled,
        placeholderData: keepPreviousData,
        // Limita cantidades: se vuelve a pedir cada vez que se abre la pantalla.
        staleTime: 0,
    });
    const quantities = result.data;

    return {
        // Una variante sin fila de stock en la sucursal tiene 0.
        stockOf: (variantId: string): number | undefined =>
            quantities && !result.isPlaceholderData ? (quantities[variantId] ?? 0) : quantities?.[variantId],
        error: errorText(result.error),
    };
}

// --- Mutaciones ---

/** Ajuste a una cantidad final: cambia el stock, el catálogo y el historial de movimientos. */
export function useAdjustStock() {
    return useMutation({
        mutationFn: (data: StockAdjustRequest) => adjustStock(data, requireToken()),
        onSuccess: (stock) => {
            queryClient.setQueryData(stockKeys.detail(stock.id), stock);
            refreshStockAfterChange();
        },
    });
}
