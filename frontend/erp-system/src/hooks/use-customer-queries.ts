import {
    InfiniteData,
    QueryClient,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import {
    createAddress,
    createCustomer,
    getCustomer,
    listAddresses,
    listCustomers,
    setAddressActive,
    setCustomerActive,
    updateAddress,
    updateCustomer,
} from '@/services/customer-service';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import {
    AddressRequest,
    Customer,
    CustomerAddress,
    CUSTOMER_ANONYMOUS,
    CustomerCreateRequest,
    CustomerRequest,
} from '@/types/customer';
import { PageResponse } from '@/types/order';

import { useDebouncedValue } from './use-debounced-value';

export type CustomerStatusFilter = 'active' | 'inactive' | 'all';

/**
 * Claves de caché de clientes. La sesión no forma parte de la clave: la caché entera se
 * vacía al iniciar o terminar sesión (clearServerCache), así nunca se mezclan empresas.
 */
export const customerKeys = {
    all: ['customers'] as const,
    lists: () => [...customerKeys.all, 'list'] as const,
    list: (query: string, status: CustomerStatusFilter, pageSize: number) =>
        [...customerKeys.lists(), { query, status, pageSize }] as const,
    detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
    addresses: (id: string) => [...customerKeys.all, 'addresses', id] as const,
};

const SEARCH_DEBOUNCE_MS = 300;

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

// --- Consultas ---

/**
 * Listado paginado con búsqueda en el backend. Cada pantalla tiene su propia búsqueda,
 * así el selector de una orden no pisa la del listado de clientes.
 */
export function useCustomerList({
    query,
    status = 'active',
    pageSize = 20,
}: {
    query: string;
    status?: CustomerStatusFilter;
    pageSize?: number;
}) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

    const result = useInfiniteQuery({
        queryKey: customerKeys.list(debouncedQuery, status, pageSize),
        queryFn: ({ pageParam }) =>
            listCustomers(
                {
                    q: debouncedQuery || undefined,
                    active: status === 'all' ? undefined : status === 'active',
                    page: pageParam,
                    size: pageSize,
                    sort: 'name,asc',
                },
                requireToken(),
            ),
        initialPageParam: 0,
        getNextPageParam: (lastPage) =>
            lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: hasSession,
    });

    // Si entre páginas se dio de alta un cliente, el siguiente puede repetirse.
    const customers: Customer[] = [];
    const seen = new Set<string>();
    for (const customer of (result.data?.pages ?? []).flatMap((page) => page.content)) {
        if (!seen.has(customer.id)) {
            seen.add(customer.id);
            customers.push(customer);
        }
    }

    return {
        customers,
        totalElements: result.data?.pages[0]?.totalElements ?? 0,
        isInitialLoading: result.isPending && hasSession,
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

export function useCustomer(id: string | undefined) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const result = useQuery({
        queryKey: customerKeys.detail(id ?? ''),
        queryFn: () => getCustomer(id as string, requireToken()),
        enabled: hasSession && isRegisteredCustomer(id),
    });

    const status = (result.error as { status?: number } | null)?.status;

    return {
        customer: result.data ?? null,
        isLoading: result.isPending && hasSession && isRegisteredCustomer(id),
        error: errorText(result.error),
        notFound: status === 404,
        reload: () => void result.refetch(),
    };
}

/** Direcciones del cliente, primero la principal. activeOnly deja solo las utilizables. */
export function useCustomerAddresses(id: string | undefined, options?: { activeOnly?: boolean }) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const result = useQuery({
        queryKey: customerKeys.addresses(id ?? ''),
        queryFn: () => listAddresses(id as string, requireToken()),
        enabled: hasSession && isRegisteredCustomer(id),
    });

    const addresses = result.data ?? [];

    return {
        addresses: options?.activeOnly ? addresses.filter((address) => address.active) : addresses,
        isLoading: result.isPending && hasSession && isRegisteredCustomer(id),
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

// --- Sincronización tras un cambio ---

/**
 * Deja coherentes todas las copias de un cliente: el detalle cacheado, los listados
 * cargados (reemplazo en el lugar y recarga en segundo plano) y el cliente del
 * borrador de orden, que es una copia fuera de la caché.
 */
function applyCustomerChange(queryClient: QueryClient, customer: Customer) {
    queryClient.setQueryData(customerKeys.detail(customer.id), customer);
    queryClient.setQueriesData<InfiniteData<PageResponse<Customer>>>(
        { queryKey: customerKeys.lists() },
        (data) =>
            data && {
                ...data,
                pages: data.pages.map((page) => ({
                    ...page,
                    content: page.content.map((item) => (item.id === customer.id ? customer : item)),
                })),
            },
    );
    // Puede haber entrado o salido de un filtro (activo/inactivo) o cambiado de orden.
    void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });

    const draft = useOrderDraftStore.getState();
    if (draft.customer.id === customer.id) {
        draft.updateCustomer(customer);
    }
}

/** Tras tocar una dirección cambian el resumen del cliente y su lista de direcciones. */
async function refreshAfterAddressChange(queryClient: QueryClient, customerId: string, address: CustomerAddress) {
    // La dirección devuelta entra ya en la caché: quien la eligió (p. ej. el borrador de
    // orden) la encuentra aunque la recarga de la lista todavía no haya terminado.
    queryClient.setQueryData<CustomerAddress[]>(customerKeys.addresses(customerId), (current) =>
        current && (current.some((item) => item.id === address.id)
            ? current.map((item) => (item.id === address.id ? address : item))
            : [...current, address]));
    // Puede haber cambiado la principal de las demás: se recarga la lista completa.
    void queryClient.invalidateQueries({ queryKey: customerKeys.addresses(customerId) });
    try {
        const customer = await queryClient.fetchQuery({
            queryKey: customerKeys.detail(customerId),
            queryFn: () => getCustomer(customerId, requireToken()),
            staleTime: 0,
        });
        applyCustomerChange(queryClient, customer);
    } catch {
        // Si no se pudo releer el cliente, al menos se recargan los listados.
        void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    }
}

// --- Mutaciones ---

export function useCreateCustomer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CustomerCreateRequest) => createCustomer(data, requireToken()),
        onSuccess: (customer) => applyCustomerChange(queryClient, customer),
    });
}

export function useUpdateCustomer(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CustomerRequest) => updateCustomer(id, data, requireToken()),
        onSuccess: (customer) => applyCustomerChange(queryClient, customer),
    });
}

export function useSetCustomerActive(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (active: boolean) => setCustomerActive(id, active, requireToken()),
        onSuccess: (customer) => applyCustomerChange(queryClient, customer),
    });
}

export function useCreateAddress(customerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: AddressRequest) => createAddress(customerId, data, requireToken()),
        onSuccess: (address) => refreshAfterAddressChange(queryClient, customerId, address),
    });
}

export function useUpdateAddress(customerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ addressId, data }: { addressId: string; data: AddressRequest }) =>
            updateAddress(customerId, addressId, data, requireToken()),
        onSuccess: (address) => {
            syncDraftAddress(address);
            return refreshAfterAddressChange(queryClient, customerId, address);
        },
    });
}

export function useSetAddressActive(customerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ addressId, active }: { addressId: string; active: boolean }) =>
            setAddressActive(customerId, addressId, active, requireToken()),
        onSuccess: (address) => {
            syncDraftAddress(address);
            return refreshAfterAddressChange(queryClient, customerId, address);
        },
    });
}

/** Si la dirección editada es la elegida en el borrador de orden, se actualiza esa copia. */
function syncDraftAddress(address: CustomerAddress) {
    const draft = useOrderDraftStore.getState();
    if (draft.address?.id === address.id) {
        draft.setAddress(address);
    }
}
