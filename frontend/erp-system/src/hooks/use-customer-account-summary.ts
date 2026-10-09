import { useEffect, useState } from 'react';

import { getCustomerAccountSummary } from '@/services/customer-account-service';
import { useAuthStore } from '@/stores/auth-store';
import { Customer } from '@/types/customer';
import { CustomerAccountSummary } from '@/types/customer-account';
import { toBackendCustomerId } from '@/utils/order-request';

type SummaryResult = {
    key: string;
    summary: CustomerAccountSummary | null;
};

/**
 * Estado de cuenta (deuda y saldo a favor) del cliente seleccionado.
 * Solo consulta clientes que existen en el backend; para el consumidor final
 * o clientes locales devuelve null.
 */
export function useCustomerAccountSummary(customer: Customer) {
    const token = useAuthStore((state) => state.token);
    const backendId = toBackendCustomerId(customer);
    const key = backendId && token ? `${backendId}:${token}` : null;
    const [result, setResult] = useState<SummaryResult | null>(null);

    useEffect(() => {
        if (!backendId || !token || !key) {
            return;
        }

        let isCurrent = true;

        getCustomerAccountSummary(String(backendId), token)
            .then((summary) => {
                if (isCurrent) setResult({ key, summary });
            })
            .catch(() => {
                // Sin estado de cuenta, la venta sigue pudiendo hacerse sin aplicar crédito.
                if (isCurrent) setResult({ key, summary: null });
            });

        return () => {
            isCurrent = false;
        };
    }, [backendId, token, key]);

    return result && result.key === key ? result.summary : null;
}
