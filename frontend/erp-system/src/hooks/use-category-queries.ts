import { useMutation, useQuery } from '@tanstack/react-query';

import {
    activateCategory,
    createCategory,
    deactivateCategory,
    getAllCategories,
    updateCategory,
} from '@/services/category-service';
import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { Category, CategoryRequest } from '@/types/category';

import { productKeys } from './catalog-keys';
import { errorText, requireToken } from './use-paged-list';

/** Catálogo chico: se pide entero y lo comparten la pantalla y los selectores. */
export const categoryKeys = {
    all: ['categories'] as const,
    list: () => [...categoryKeys.all, 'list'] as const,
};

// --- Consultas ---

/** Todas las categorías (activas e inactivas); cada pantalla filtra lo que necesita. */
export function useCategories() {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const result = useQuery({
        queryKey: categoryKeys.list(),
        queryFn: () => getAllCategories(requireToken()),
        enabled: hasSession,
    });

    return {
        categories: result.data ?? [],
        isLoading: result.isPending && hasSession,
        isRefreshing: result.isRefetching,
        // Si ya hay datos se siguen mostrando aunque falle una recarga en segundo plano.
        error: result.data ? null : errorText(result.error),
        refresh: () => void result.refetch(),
    };
}

// --- Mutaciones ---

/**
 * La respuesta es la categoría actualizada: se reemplaza en la lista (o se agrega). Los
 * productos traen el nombre de su categoría y se filtran por ella: se vuelven a pedir.
 */
function syncCategory(category: Category) {
    queryClient.setQueryData<Category[]>(categoryKeys.list(), (current) => {
        if (!current) return current;
        return current.some((item) => item.id === category.id)
            ? current.map((item) => (item.id === category.id ? category : item))
            : [...current, category];
    });
    void queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
}

export type SaveCategoryInput = {
    // Sin id es un alta.
    id?: string;
    data: CategoryRequest;
};

export function useSaveCategory() {
    return useMutation({
        mutationFn: ({ id, data }: SaveCategoryInput) =>
            id ? updateCategory(id, data, requireToken()) : createCategory(data, requireToken()),
        onSuccess: syncCategory,
    });
}

export type SetCategoryActiveInput = {
    id: string;
    active: boolean;
};

export function useSetCategoryActive() {
    return useMutation({
        mutationFn: ({ id, active }: SetCategoryActiveInput) =>
            active ? activateCategory(id, requireToken()) : deactivateCategory(id, requireToken()),
        onSuccess: syncCategory,
    });
}
