import { useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/services/query-client';
import {
    cancelTransfer,
    createTransfer,
    getTransferById,
    getTransfers,
} from '@/services/transfer-service';
import { useAuthStore } from '@/stores/auth-store';
import { useProductStore } from '@/stores/product-store';
import { StockTransfer } from '@/types/transfer';

import { errorText, requireToken, usePagedList } from './use-paged-list';

const PAGE_SIZE = 20;

export const transferKeys = {
    all: ['transfers'] as const,
    lists: () => [...transferKeys.all, 'list'] as const,
    list: (pageSize: number) => [...transferKeys.lists(), pageSize] as const,
    detail: (id: string) => [...transferKeys.all, 'detail', id] as const,
};

// --- Consultas ---

/** Transferencias de la empresa, de la más nueva a la más vieja (incluye anuladas). */
export function useTransfers() {
    return usePagedList(
        transferKeys.list(PAGE_SIZE),
        (page) => getTransfers({ page, size: PAGE_SIZE }, requireToken()),
        true,
        (transfer) => transfer.id,
    );
}

export function useTransfer(id: string | undefined) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const enabled = hasSession && Boolean(id);
    const result = useQuery({
        queryKey: transferKeys.detail(id ?? ''),
        queryFn: () => getTransferById(id as string, requireToken()),
        enabled,
    });

    return {
        transfer: result.data ?? null,
        isLoading: result.isPending && enabled,
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

// --- Mutaciones ---

/**
 * Una transferencia mueve stock entre dos sucursales. El stock por variante vive en
 * product-store (Zustand), que usan las pestañas siempre montadas: se relee si ya estaba
 * cargado. Inventario (stock-store) vuelve a pedir el stock cada vez que se abre.
 */
function refreshAfterTransfer(transfer: StockTransfer) {
    queryClient.setQueryData(transferKeys.detail(transfer.id), transfer);
    void queryClient.invalidateQueries({ queryKey: transferKeys.lists() });

    const token = useAuthStore.getState().token;
    if (token && useProductStore.getState().products.length > 0) {
        // Si falla, el catálogo se vuelve a pedir al abrirlo.
        useProductStore.getState().fetchProducts(token).catch(() => undefined);
    }
}

export type CreateTransferInput = {
    originBranchId: string;
    destinationBranchId: string;
    items: { variantId: string; quantity: number }[];
};

export function useCreateTransfer() {
    return useMutation({
        mutationFn: ({ originBranchId, destinationBranchId, items }: CreateTransferInput) =>
            createTransfer(
                {
                    originBranchId: Number(originBranchId),
                    destinationBranchId: Number(destinationBranchId),
                    items: items.map((item) => ({
                        productVariantId: Number(item.variantId),
                        quantity: item.quantity,
                    })),
                },
                requireToken(),
            ),
        onSuccess: refreshAfterTransfer,
    });
}

export function useCancelTransfer() {
    return useMutation({
        mutationFn: (id: string) => cancelTransfer(id, requireToken()),
        onSuccess: refreshAfterTransfer,
    });
}
