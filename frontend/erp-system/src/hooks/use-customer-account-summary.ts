import { Customer } from '@/types/customer';
import { CustomerAccountSummary } from '@/types/customer-account';

import { useCustomerAccountSummaryQuery } from './use-customer-account-queries';

/**
 * Estado de cuenta (deuda y saldo a favor) del cliente seleccionado.
 * Para el consumidor final, que no existe en el backend, o si falla, devuelve null:
 * la venta sigue pudiendo hacerse sin aplicar crédito.
 */
export function useCustomerAccountSummary(customer: Customer): CustomerAccountSummary | null {
    return useCustomerAccountSummaryQuery(customer.id).summary;
}
