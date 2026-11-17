import { queryClient } from '@/services/query-client';

/**
 * Claves de caché de la cuenta corriente. Van aparte de los hooks para que los de pedidos
 * puedan invalidarlas sin importar los de la cuenta, que a su vez usan las claves de pedidos.
 */
export const customerAccountKeys = {
    all: ['customer-account'] as const,
    customer: (customerId: string) => [...customerAccountKeys.all, 'customer', customerId] as const,
    summary: (customerId: string) => [...customerAccountKeys.customer(customerId), 'summary'] as const,
    pendingOrders: (customerId: string, pageSize: number) =>
        [...customerAccountKeys.customer(customerId), 'pending-orders', pageSize] as const,
    payments: (customerId: string, pageSize: number) =>
        [...customerAccountKeys.customer(customerId), 'payments', pageSize] as const,
    transactions: (customerId: string, pageSize: number) =>
        [...customerAccountKeys.customer(customerId), 'transactions', pageSize] as const,
    debtors: () => [...customerAccountKeys.all, 'debtors'] as const,
    debtorsList: (query: string, pageSize: number) =>
        [...customerAccountKeys.debtors(), { query, pageSize }] as const,
};

/**
 * Tras cualquier operación que mueva la cuenta de un cliente (pago, anulación, alta,
 * edición o cancelación de un pedido) cambian su resumen, pendientes, pagos y
 * movimientos, y el listado de deudores.
 */
export function invalidateCustomerAccount(customerId: string) {
    void queryClient.invalidateQueries({ queryKey: customerAccountKeys.customer(customerId) });
    void queryClient.invalidateQueries({ queryKey: customerAccountKeys.debtors() });
}
