import { useMutation, useQuery } from '@tanstack/react-query';

import {
    activateProduct,
    createProduct,
    deactivateProduct,
    getProductById,
    getProducts,
    updateProduct,
} from '@/services/product-service';
import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { Product, ProductListParams, ProductRequest, ProductUpdateRequest } from '@/types/product';

import { invalidateStockViews, productKeys } from './catalog-keys';
import { useDebouncedValue } from './use-debounced-value';
import { errorText, findInPagedLists, requireToken, usePagedList } from './use-paged-list';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// --- Consultas ---

type UseProductsOptions = {
    enabled?: boolean;
    /**
     * Los selectores de pedidos y transferencias limitan cantidades con el stock: con 0 se
     * vuelven a pedir cada vez que se abren.
     */
    staleTime?: number;
};

/**
 * Productos que cumplen los filtros, por nombre. Cada pantalla tiene su propia búsqueda (se
 * espera a que se deje de tipear), así un selector no pisa la del listado de Productos.
 */
export function useProducts(filters: ProductListParams, options?: UseProductsOptions) {
    const q = useDebouncedValue(filters.q?.trim() ?? '', SEARCH_DEBOUNCE_MS);
    const params: ProductListParams = { ...filters, q: q || undefined };

    return usePagedList(
        productKeys.list(params),
        (page) => getProducts({ ...params, page, size: PAGE_SIZE }, requireToken()),
        options?.enabled ?? true,
        (product) => product.id,
        { staleTime: options?.staleTime },
    );
}

type UseProductOptions = {
    /**
     * Espera a la respuesta del backend aunque el producto ya esté en caché: la edición manda
     * cantidades finales de stock y tiene que partir de las actuales.
     */
    fresh?: boolean;
};

export function useProduct(id: string | undefined, options?: UseProductOptions) {
    const fresh = options?.fresh ?? false;
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const enabled = hasSession && Boolean(id);
    const result = useQuery({
        queryKey: productKeys.detail(id ?? ''),
        queryFn: () => getProductById(id as string, requireToken()),
        enabled,
        // La copia de algún listado cargado, para no mostrar un spinner.
        placeholderData: fresh || !id ? undefined : () => findInPagedLists<Product>(productKeys.lists(), id),
        refetchOnMount: fresh ? 'always' : true,
    });

    // Con fresh, la copia en caché no cuenta hasta que llegue la respuesta pedida al abrir.
    const isReady = !fresh || result.isFetchedAfterMount;
    const product = isReady ? result.data : undefined;

    return {
        product,
        isLoading: enabled && !product && (result.isPending || !isReady),
        // Si ya hay datos se siguen mostrando aunque falle una recarga en segundo plano.
        loadError: product ? null : errorText(result.error),
        reload: () => void result.refetch(),
    };
}

// --- Mutaciones ---

/** La respuesta es el producto actualizado: se siembra el detalle y se invalidan los listados. */
function syncProduct(product: Product) {
    queryClient.setQueryData(productKeys.detail(product.id), product);
    void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
}

/** Alta y edición cargan stock por sucursal (y la edición lo registra como ajuste). */
function syncProductAndStock(product: Product) {
    syncProduct(product);
    invalidateStockViews();
}

export function useCreateProduct() {
    return useMutation({
        mutationFn: (data: ProductRequest) => createProduct(data, requireToken()),
        onSuccess: syncProductAndStock,
    });
}

export type UpdateProductInput = {
    id: string;
    data: ProductUpdateRequest;
};

export function useUpdateProduct() {
    return useMutation({
        mutationFn: ({ id, data }: UpdateProductInput) => updateProduct(id, data, requireToken()),
        onSuccess: syncProductAndStock,
    });
}

export type SetProductActiveInput = {
    id: string;
    active: boolean;
};

export function useSetProductActive() {
    return useMutation({
        mutationFn: ({ id, active }: SetProductActiveInput) =>
            active ? activateProduct(id, requireToken()) : deactivateProduct(id, requireToken()),
        onSuccess: syncProduct,
    });
}
