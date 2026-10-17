import { QueryKey, useInfiniteQuery } from '@tanstack/react-query';

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
