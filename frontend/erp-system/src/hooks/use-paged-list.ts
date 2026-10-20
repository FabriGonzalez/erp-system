import { InfiniteData, QueryKey, useInfiniteQuery } from '@tanstack/react-query';

import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { PageResponse } from '@/types/order';

/** Token de la sesión para las queryFn; las queries ya están deshabilitadas sin él. */
export function requireToken(): string {
    const token = useAuthStore.getState().token;
    if (!token) {
        throw new Error('No hay sesión activa.');
    }
    return token;
}

export function errorText(error: unknown): string | null {
    if (!error) return null;
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

/**
 * La copia de un elemento en algún listado paginado ya cargado (p. ej. para usarla como
 * placeholder del detalle y no mostrar un spinner).
 */
export function findInPagedLists<T extends { id: string }>(listsKey: QueryKey, id: string): T | undefined {
    const lists = queryClient.getQueriesData<InfiniteData<PageResponse<T>>>({ queryKey: listsKey });

    for (const [, data] of lists) {
        for (const page of data?.pages ?? []) {
            const item = page.content.find((candidate) => candidate.id === id);
            if (item) return item;
        }
    }
    return undefined;
}

/** Listado paginado con scroll infinito; mismo contrato que useCustomerList. */
export function usePagedList<T>(
    queryKey: QueryKey,
    fetchPage: (page: number) => Promise<PageResponse<T>>,
    enabled: boolean,
    idOf: (item: T) => string,
    options?: { staleTime?: number },
) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const result = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => fetchPage(pageParam),
        initialPageParam: 0,
        getNextPageParam: (lastPage) =>
            lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: hasSession && enabled,
        staleTime: options?.staleTime,
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
