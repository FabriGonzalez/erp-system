import { useMutation, useQuery } from '@tanstack/react-query';

import {
    activateCategory,
    createCategory,
    deactivateCategory,
    getAllCategories,
    setCategoryAttribute,
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

export type SetCategoryAttributeInput = {
    categoryId: string;
    attributeId: string;
    assigned: boolean;
};

function withAttribute(categories: Category[] | undefined, input: SetCategoryAttributeInput) {
    return categories?.map((category) => {
        if (category.id !== input.categoryId) return category;
        const others = category.attributeIds.filter((id) => id !== input.attributeId);
        return { ...category, attributeIds: input.assigned ? [...others, input.attributeId] : others };
    });
}

/**
 * Asigna o quita un atributo de una categoría desde la pantalla del atributo. Se marca en la
 * caché antes de la respuesta y se deshace solo si falla; cancelar las cargas pendientes evita
 * que una lista vieja pise el cambio.
 */
export function useSetCategoryAttribute() {
    return useMutation({
        mutationFn: ({ categoryId, attributeId, assigned }: SetCategoryAttributeInput) =>
            setCategoryAttribute(categoryId, attributeId, assigned, requireToken()),
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: categoryKeys.list() });
            queryClient.setQueryData<Category[]>(categoryKeys.list(), (current) => withAttribute(current, input));
        },
        onError: (_error, input) => {
            queryClient.setQueryData<Category[]>(
                categoryKeys.list(),
                (current) => withAttribute(current, { ...input, assigned: !input.assigned }),
            );
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: categoryKeys.list() }),
    });
}
