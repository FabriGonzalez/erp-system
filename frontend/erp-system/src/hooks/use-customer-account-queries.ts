import { useMutation, useQuery } from '@tanstack/react-query';

import {
    getCustomerAccountSummary,
    getCustomerAccountTransactions,
    getCustomerPendingOrders,
    getDebtors,
} from '@/services/customer-account-service';
import { cancelPayment, createPayment, getCustomerPayments } from '@/services/payment-service';
import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import { PaymentMethod } from '@/types/order';
import { Payment } from '@/types/payment';

import { customerAccountKeys, invalidateCustomerAccount } from './customer-account-keys';
import { orderKeys } from './use-order-queries';
import { errorText, requireToken, usePagedList } from './use-paged-list';

const PAGE_SIZE = 20;

function isRegisteredCustomer(id: string | undefined): id is string {
    return Boolean(id) && id !== CUSTOMER_ANONYMOUS.id;
}

// --- Consultas ---

/** Deuda, saldo a favor y pedidos pendientes calculados por el backend. */
export function useCustomerAccountSummaryQuery(customerId: string | undefined, allowed = true) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const enabled = allowed && hasSession && isRegisteredCustomer(customerId);
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
 * Un pago mueve la cuenta del cliente y lo pagado de las órdenes a las que se aplicó:
 * cambian su detalle y su estado de pago en los listados.
 */
function refreshAfterPayment(customerId: string, affectedOrderIds: string[]) {
    invalidateCustomerAccount(customerId);

    for (const orderId of new Set(affectedOrderIds)) {
        void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    }
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
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
