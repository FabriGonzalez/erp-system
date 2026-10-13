import { getCustomer, listAddresses } from '@/services/customer-service';
import { useAuthStore } from '@/stores/auth-store';
import { useCustomerStore } from '@/stores/customer-store';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';

import { useKeyedQuery } from './use-keyed-query';

function isRegisteredCustomer(id: string | undefined): id is string {
    return Boolean(id) && id !== CUSTOMER_ANONYMOUS.id;
}

/** Cliente por id. Se recarga cuando algo cambia clientes (useCustomerStore.version). */
export function useCustomer(id: string | undefined) {
    const token = useAuthStore((state) => state.token);
    const version = useCustomerStore((state) => state.version);
    const key = token && isRegisteredCustomer(id) ? `${token}|${id}` : null;

    const { data, error, notFound, isLoading, reload } = useKeyedQuery(
        key,
        () => getCustomer(id as string, token as string),
        'No se pudo cargar el cliente.',
        version,
    );

    return { customer: data, error, notFound, isLoading, reload };
}

/**
 * Direcciones del cliente, primero la principal. activeOnly deja solo las que se
 * pueden usar (p. ej. para elegir la dirección de un envío).
 */
export function useCustomerAddresses(id: string | undefined, options?: { activeOnly?: boolean }) {
    const token = useAuthStore((state) => state.token);
    const version = useCustomerStore((state) => state.version);
    const key = token && isRegisteredCustomer(id) ? `${token}|${id}` : null;

    const { data, error, isLoading, reload } = useKeyedQuery(
        key,
        () => listAddresses(id as string, token as string),
        'No se pudieron cargar las direcciones.',
        version,
    );

    const addresses = data ?? [];

    return {
        addresses: options?.activeOnly ? addresses.filter((address) => address.active) : addresses,
        error,
        isLoading,
        reload,
    };
}
