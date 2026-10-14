import {
    QueryKey,
    useInfiniteQuery,
    useMutation,
    useQuery,
} from '@tanstack/react-query';

import {
    getCustomerAccountSummary,
    getCustomerAccountTransactions,
    getCustomerPendingOrders,
    getDebtors,
} from '@/services/customer-account-service';
import { cancelPayment, createPayment, getCustomerPayments } from '@/services/payment-service';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderStore } from '@/stores/order-store';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import { PageResponse, PaymentMethod } from '@/types/order';
import { Payment } from '@/types/payment';

import { customerAccountKeys, invalidateCustomerAccount } from './customer-account-keys';

const PAGE_SIZE = 20;

function requireToken(): string {
    const token = useAuthStore.getState().token;
    if (!token) {
        throw new Error('No hay sesión activa.');
    }
    return token;
}

function errorText(error: unknown): string | null {
    if (!error) return null;
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

function isRegisteredCustomer(id: string | undefined): id is string {
    return Boolean(id) && id !== CUSTOMER_ANONYMOUS.id;
}

/** Listado paginado con scroll infinito; mismo contrato que useCustomerList. */
function usePagedList<T>(
    queryKey: QueryKey,
    fetchPage: (page: number) => Promise<PageResponse<T>>,
    enabled: boolean,
    idOf: (item: T) => string,
) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const result = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => fetchPage(pageParam),
        initialPageParam: 0,
        getNextPageParam: (lastPage) =>
            lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: hasSession && enabled,
    });

    // Si entre páginas entró un elemento nuevo, el siguiente puede repetirse.
    const items: T[] = [];
    const seen = new Set<string>();
    for (const item of (result.data?.pages ?? []).flatMap((page) => page.content)) {
        const id = idOf(item);
        if (!seen.has(id)) {
            seen.add(id);
            items.push(item);
        }
    }

    return {
        items,
        totalElements: result.data?.pages[0]?.totalElements ?? 0,
        isInitialLoading: result.isPending && hasSession && enabled,
        isRefreshing: result.isRefetching && !result.isFetchingNextPage,
        isLoadingMore: result.isFetchingNextPage,
        error: errorText(result.error),
        hasMore: result.hasNextPage,
        loadMore: () => {
            if (result.hasNextPage && !result.isFetchingNextPage) {
                void result.fetchNextPage();
            }
        },
        refresh: () => void result.refetch(),
    };
}

// --- Consultas ---

/** Deuda, saldo a favor y pedidos pendientes calculados por el backend. */
export function useCustomerAccountSummaryQuery(customerId: string | undefined) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const enabled = hasSession && isRegisteredCustomer(customerId);
    const result = useQuery({
        queryKey: customerAccountKeys.summary(customerId ?? ''),
        queryFn: () => getCustomerAccountSummary(customerId as string, requireToken()),
        enabled,
    });

    return {
        summary: result.data ?? null,
        isLoading: result.isPending && enabled,
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

export function useCustomerPendingOrders(customerId: string | undefined) {
    const id = customerId ?? '';
    return usePagedList(
        customerAccountKeys.pendingOrders(id, PAGE_SIZE),
        (page) => getCustomerPendingOrders(id, { page, size: PAGE_SIZE }, requireToken()),
        isRegisteredCustomer(customerId),
        (order) => order.orderId,
    );
}

export function useCustomerPayments(customerId: string | undefined, enabled = true) {
    const id = customerId ?? '';
    return usePagedList(
        customerAccountKeys.payments(id, PAGE_SIZE),
        (page) => getCustomerPayments(id, { page, size: PAGE_SIZE }, requireToken()),
        enabled && isRegisteredCustomer(customerId),
        (payment) => payment.id,
    );
}

export function useCustomerAccountTransactions(customerId: string | undefined) {
    const id = customerId ?? '';
    return usePagedList(
        customerAccountKeys.transactions(id, PAGE_SIZE),
        (page) => getCustomerAccountTransactions(id, { page, size: PAGE_SIZE }, requireToken()),
        isRegisteredCustomer(customerId),
        (transaction) => transaction.id,
    );
}

/** Clientes con deuda, de mayor a menor. */
export function useDebtors() {
    return usePagedList(
        customerAccountKeys.debtorsList('', PAGE_SIZE),
        (page) => getDebtors({ page, size: PAGE_SIZE }, requireToken()),
        true,
        (debtor) => debtor.customerId,
    );
}

// --- Mutaciones ---

/**
 * Un pago mueve la cuenta del cliente y lo pagado de las órdenes a las que se aplicó.
 * Las órdenes viven en order-store (Zustand): se releen las que ya estén cargadas.
 */
function refreshAfterPayment(customerId: string, affectedOrderIds: string[]) {
    invalidateCustomerAccount(customerId);

    const token = useAuthStore.getState().token;
    if (!token) return;

    const { orders, fetchOrderById } = useOrderStore.getState();
    for (const orderId of new Set(affectedOrderIds)) {
        if (orders.some((order) => order.id === orderId)) {
            // Si falla, el detalle se vuelve a pedir al abrirlo.
            fetchOrderById(orderId, token).catch(() => undefined);
        }
    }
}

export type RegisterPaymentInput = {
    amount: number;
    method: PaymentMethod;
    branchId: string;
};

export function useRegisterPayment(customerId: string) {
    return useMutation({
        mutationFn: ({ amount, method, branchId }: RegisterPaymentInput) =>
            createPayment(
                { customerId: Number(customerId), branchId: Number(branchId), amount, method },
                requireToken(),
            ),
        onSuccess: (payment) =>
            refreshAfterPayment(customerId, payment.allocations.map((allocation) => allocation.orderId)),
    });
}

/**
 * Recibe el pago tal como está en el historial: la respuesta de la anulación ya no trae
 * asignaciones, y hacen falta para saber qué órdenes volvieron a quedar con saldo.
 */
export function useCancelPayment(customerId: string) {
    return useMutation({
        mutationFn: (payment: Payment) => cancelPayment(payment.id, requireToken()),
        onSuccess: (_cancelled, payment) =>
            refreshAfterPayment(customerId, payment.allocations.map((allocation) => allocation.orderId)),
    });
}
