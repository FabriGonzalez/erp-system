import { useMutation, useQuery } from '@tanstack/react-query';

import {
    activateAttribute,
    activateAttributeValue,
    createAttribute,
    createAttributeValue,
    deactivateAttribute,
    deactivateAttributeValue,
    getAllAttributes,
    getAllAttributeValues,
    updateAttribute,
    updateAttributeValue,
} from '@/services/product-attribute-service';
import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import {
    ProductAttribute,
    ProductAttributeRequest,
    ProductAttributeValue,
    ProductAttributeValueRequest,
} from '@/types/product-attribute';

import { productKeys } from './catalog-keys';
import { errorText, requireToken } from './use-paged-list';

/**
 * Catálogo chico: atributos y valores (activos e inactivos) se piden enteros, en dos requests
 * en paralelo, y los comparten Atributos, su detalle y el formulario de producto.
 */
export const attributeKeys = {
    all: ['product-attributes'] as const,
    list: () => [...attributeKeys.all, 'list'] as const,
    values: () => [...attributeKeys.all, 'values'] as const,
};

// --- Consultas ---

export function useAttributes() {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const attributesQuery = useQuery({
        queryKey: attributeKeys.list(),
        queryFn: () => getAllAttributes(requireToken()),
        enabled: hasSession,
    });
    const valuesQuery = useQuery({
        queryKey: attributeKeys.values(),
        queryFn: () => getAllAttributeValues(requireToken()),
        enabled: hasSession,
    });
    const hasData = Boolean(attributesQuery.data && valuesQuery.data);

    return {
        attributes: attributesQuery.data ?? [],
        attributeValues: valuesQuery.data ?? [],
        isLoading: (attributesQuery.isPending || valuesQuery.isPending) && hasSession,
        isRefreshing: attributesQuery.isRefetching || valuesQuery.isRefetching,
        // Si ya hay datos se siguen mostrando aunque falle una recarga en segundo plano.
        error: hasData ? null : errorText(attributesQuery.error ?? valuesQuery.error),
        refresh: () => {
            void attributesQuery.refetch();
            void valuesQuery.refetch();
        },
    };
}

// --- Mutaciones ---

function upsert<T extends { id: string }>(items: T[] | undefined, item: T): T[] | undefined {
    if (!items) return items;
    return items.some((current) => current.id === item.id)
        ? items.map((current) => (current.id === item.id ? item : current))
        : [...items, item];
}

/**
 * Las respuestas traen el atributo o el valor actualizado: se reemplaza en su lista. Los
 * productos traen los nombres de atributo y valor: se vuelven a pedir.
 */
function syncAttribute(attribute: ProductAttribute) {
    queryClient.setQueryData<ProductAttribute[]>(attributeKeys.list(), (current) => upsert(current, attribute));
    // Renombrar un atributo cambia el attributeName de sus valores.
    void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
}

function syncValue(value: ProductAttributeValue) {
    queryClient.setQueryData<ProductAttributeValue[]>(attributeKeys.values(), (current) => upsert(current, value));
    void queryClient.invalidateQueries({ queryKey: attributeKeys.values() });
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
}

export type SaveAttributeInput = {
    // Sin id es un alta.
    id?: string;
    data: ProductAttributeRequest;
};

export function useSaveAttribute() {
    return useMutation({
        mutationFn: ({ id, data }: SaveAttributeInput) =>
            id ? updateAttribute(id, data, requireToken()) : createAttribute(data, requireToken()),
        onSuccess: syncAttribute,
    });
}

export type SetActiveInput = {
    id: string;
    active: boolean;
};

export function useSetAttributeActive() {
    return useMutation({
        mutationFn: ({ id, active }: SetActiveInput) =>
            active ? activateAttribute(id, requireToken()) : deactivateAttribute(id, requireToken()),
        onSuccess: syncAttribute,
    });
}

export type SaveAttributeValueInput = {
    attributeId: string;
    // Sin id es un alta.
    id?: string;
    data: ProductAttributeValueRequest;
};

export function useSaveAttributeValue() {
    return useMutation({
        mutationFn: ({ attributeId, id, data }: SaveAttributeValueInput) =>
            id
                ? updateAttributeValue(id, data, requireToken())
                : createAttributeValue(attributeId, data, requireToken()),
        onSuccess: syncValue,
    });
}

export function useSetAttributeValueActive() {
    return useMutation({
        mutationFn: ({ id, active }: SetActiveInput) =>
            active ? activateAttributeValue(id, requireToken()) : deactivateAttributeValue(id, requireToken()),
        onSuccess: syncValue,
    });
}
