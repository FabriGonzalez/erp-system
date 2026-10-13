import { useCallback, useEffect, useState } from 'react';

import { listCustomers } from '@/services/customer-service';
import { useAuthStore } from '@/stores/auth-store';
import { useCustomerStore } from '@/stores/customer-store';
import { Customer } from '@/types/customer';

import { useDebouncedValue } from './use-debounced-value';

type Options = {
    query: string;
    // Para elegir un cliente en una orden: los inactivos no se ofrecen.
    activeOnly?: boolean;
    pageSize?: number;
};

type ListState = {
    // Clave de la búsqueda (sesión + filtros); refreshKey identifica la carga concreta.
    searchKey: string;
    refreshKey: string;
    customers: Customer[];
    page: number;
    totalPages: number;
    totalElements: number;
    error: string | null;
};

const SEARCH_DEBOUNCE_MS = 300;

function mergeById(current: Customer[], next: Customer[]): Customer[] {
    // Si alguien dio de alta un cliente entre páginas, el siguiente puede repetirse.
    const seen = new Set(current.map((customer) => customer.id));
    return [...current, ...next.filter((customer) => !seen.has(customer.id))];
}

/**
 * Listado paginado de clientes con búsqueda en el backend. Cada pantalla tiene el
 * suyo: el selector de una orden no pisa la búsqueda del listado de clientes.
 */
export function useCustomerList({ query, activeOnly = false, pageSize = 20 }: Options) {
    const token = useAuthStore((state) => state.token);
    const version = useCustomerStore((state) => state.version);
    const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
    const [refreshCount, setRefreshCount] = useState(0);
    const [state, setState] = useState<ListState | null>(null);
    const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null);

    const searchKey = token ? JSON.stringify([token, debouncedQuery, activeOnly, pageSize]) : null;
    const refreshKey = searchKey ? `${searchKey}#${version}#${refreshCount}` : null;

    const fetchPage = useCallback(
        (page: number) =>
            listCustomers(
                {
                    q: debouncedQuery || undefined,
                    active: activeOnly ? true : undefined,
                    page,
                    size: pageSize,
                    sort: 'name,asc',
                },
                token as string,
            ),
        [debouncedQuery, activeOnly, pageSize, token],
    );

    // Primera página: se pide de nuevo al cambiar la búsqueda, la sesión o cualquier
    // cliente. Solo se aplica la respuesta de la carga vigente.
    useEffect(() => {
        if (!searchKey || !refreshKey) {
            return;
        }

        let isCurrent = true;

        fetchPage(0)
            .then((page) => {
                if (!isCurrent) return;
                setState({
                    searchKey,
                    refreshKey,
                    customers: page.content,
                    page: page.page,
                    totalPages: page.totalPages,
                    totalElements: page.totalElements,
                    error: null,
                });
            })
            .catch((error: unknown) => {
                if (!isCurrent) return;
                setState((previous) => ({
                    searchKey,
                    refreshKey,
                    // Si falla un refresco, se conserva lo que ya se mostraba de esta búsqueda.
                    customers: previous?.searchKey === searchKey ? previous.customers : [],
                    page: previous?.searchKey === searchKey ? previous.page : 0,
                    totalPages: previous?.searchKey === searchKey ? previous.totalPages : 0,
                    totalElements: previous?.searchKey === searchKey ? previous.totalElements : 0,
                    error: error instanceof Error ? error.message : 'No se pudieron cargar los clientes.',
                }));
            });

        return () => {
            isCurrent = false;
        };
    }, [searchKey, refreshKey, fetchPage]);

    const isCurrentSearch = state !== null && state.searchKey === searchKey;
    const isLoadingMore = loadingMoreKey !== null && loadingMoreKey === refreshKey;
    const hasMore = isCurrentSearch && state.page + 1 < state.totalPages;

    const loadMore = useCallback(() => {
        if (!state || !refreshKey || state.refreshKey !== refreshKey || isLoadingMore || !hasMore) {
            return;
        }

        const requestKey = refreshKey;
        setLoadingMoreKey(requestKey);

        fetchPage(state.page + 1)
            .then((page) => {
                // Si mientras tanto se recargó o cambió la búsqueda, esta página ya no aplica.
                setState((previous) =>
                    previous && previous.refreshKey === requestKey
                        ? {
                            ...previous,
                            customers: mergeById(previous.customers, page.content),
                            page: page.page,
                            totalPages: page.totalPages,
                            totalElements: page.totalElements,
                        }
                        : previous,
                );
            })
            .catch((error: unknown) => {
                setState((previous) =>
                    previous && previous.refreshKey === requestKey
                        ? {
                            ...previous,
                            error: error instanceof Error ? error.message : 'No se pudieron cargar más clientes.',
                        }
                        : previous,
                );
            })
            .finally(() => {
                setLoadingMoreKey((current) => (current === requestKey ? null : current));
            });
    }, [state, refreshKey, isLoadingMore, hasMore, fetchPage]);

    const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);

    return {
        // Mientras llega una búsqueda nueva no se muestran resultados de la anterior.
        customers: isCurrentSearch ? state.customers : [],
        totalElements: isCurrentSearch ? state.totalElements : 0,
        // true mientras no llegó la respuesta de la carga vigente (incluye refrescos).
        isLoading: refreshKey !== null && state?.refreshKey !== refreshKey,
        // Solo la primera carga de una búsqueda, sin resultados que mostrar todavía.
        isInitialLoading: refreshKey !== null && !isCurrentSearch,
        isLoadingMore,
        error: isCurrentSearch ? state.error : null,
        hasMore,
        loadMore,
        refresh,
        // La búsqueda que ya se aplicó, para mensajes como "sin resultados para X".
        appliedQuery: debouncedQuery,
    };
}
