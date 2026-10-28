import { useMutation, useQuery } from '@tanstack/react-query';

import {
    cancelOrder,
    createOrder,
    dispatchOrder,
    getOrderById,
    getOrders,
    updateOrder,
} from '@/services/order-service';
import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import {
    Order,
    OrderListParams,
    OrderRequest,
    OrderUpdateRequest,
    RefundAction,
} from '@/types/order';

import { refreshStockAfterChange } from './catalog-keys';
import { invalidateCustomerAccount } from './customer-account-keys';
import { errorText, findInPagedLists, requireToken, usePagedList } from './use-paged-list';

const PAGE_SIZE = 20;

/** Filtros de un listado; cada combinación tiene su propia caché. */
export type OrderListFilters = Pick<OrderListParams, 'branchId' | 'status' | 'deliveryType'>;

export const orderKeys = {
    all: ['orders'] as const,
    lists: () => [...orderKeys.all, 'list'] as const,
    list: (filters: OrderListFilters) => [...orderKeys.lists(), filters] as const,
    detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

// --- Consultas ---

/** Pedidos de la empresa que cumplen los filtros, del más nuevo al más viejo. */
export function useOrders(filters: OrderListFilters, options?: { enabled?: boolean }) {
    return usePagedList(
        orderKeys.list(filters),
        (page) =>
            getOrders(
                { ...filters, page, size: PAGE_SIZE, sort: 'createdAt,desc' },
                requireToken(),
            ),
        options?.enabled ?? true,
        (order) => order.id,
    );
}

type UseOrderOptions = {
    /**
     * Espera a la respuesta del backend aunque la orden ya esté en caché: el borrador de
     * la edición se inicializa una sola vez y tiene que partir de datos frescos.
     */
    fresh?: boolean;
};

export function useOrder(id: string | undefined, options?: UseOrderOptions) {
    const fresh = options?.fresh ?? false;
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const enabled = hasSession && Boolean(id);
    const result = useQuery({
        queryKey: orderKeys.detail(id ?? ''),
        queryFn: () => getOrderById(id as string, requireToken()),
        enabled,
        // La copia de algún listado cargado, para no mostrar un spinner.
        placeholderData: fresh || !id ? undefined : () => findInPagedLists<Order>(orderKeys.lists(), id),
        refetchOnMount: fresh ? 'always' : true,
    });

    // Con fresh, la copia en caché no cuenta hasta que llegue la respuesta pedida al abrir.
    const isReady = !fresh || result.isFetchedAfterMount;
    const order = isReady ? result.data : undefined;

    return {
        order,
        isLoading: enabled && !order && (result.isPending || !isReady),
        // Si ya hay datos se siguen mostrando aunque falle una recarga en segundo plano.
        loadError: order ? null : errorText(result.error),
    };
}

// --- Mutaciones ---

/**
 * La respuesta de cada mutación es la orden actualizada: se siembra el detalle y se
 * invalidan los listados (pueden cambiar de filtro, como un envío despachado que deja de
 * estar por preparar). Alta, edición y cancelación mueven la cuenta del cliente y el stock.
 */
function syncOrder(order: Order) {
    queryClient.setQueryData(orderKeys.detail(order.id), order);
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
}

function syncAccountAndStock(order: Order) {
    if (order.customerId !== CUSTOMER_ANONYMOUS.id) {
        invalidateCustomerAccount(order.customerId);
    }
    if (order.salesType === 'WITH_PRODUCTS') {
        refreshStockAfterChange();
    }
}

export function useCreateOrder() {
    return useMutation({
        mutationFn: (data: OrderRequest) => createOrder(data, requireToken()),
        onSuccess: (order) => {
            syncOrder(order);
            syncAccountAndStock(order);
        },
    });
}

export type UpdateOrderInput = {
    id: string;
    data: OrderUpdateRequest;
};

export function useUpdateOrder() {
    return useMutation({
        mutationFn: ({ id, data }: UpdateOrderInput) => updateOrder(id, data, requireToken()),
        onSuccess: (order) => {
            syncOrder(order);
            syncAccountAndStock(order);
        },
    });
}

export type CancelOrderInput = {
    id: string;
    refundAction?: RefundAction;
};

export function useCancelOrder() {
    return useMutation({
        mutationFn: ({ id, refundAction }: CancelOrderInput) =>
            cancelOrder(id, requireToken(), refundAction),
        onSuccess: (order) => {
            syncOrder(order);
            syncAccountAndStock(order);
        },
    });
}

/** Despachar solo cambia el estado: no mueve stock ni la cuenta del cliente. */
export function useDispatchOrder() {
    return useMutation({
        mutationFn: (id: string) => dispatchOrder(id, requireToken()),
        onSuccess: syncOrder,
    });
}
