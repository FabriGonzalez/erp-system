import { useMutation, useQuery } from '@tanstack/react-query';

import {
    createPromotion,
    getPromotionById,
    getPromotions,
    setPromotionActive,
    updatePromotion,
} from '@/services/promotion-service';
import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { Promotion, PromotionListParams, PromotionRequest } from '@/types/promotion';

import { promotionKeys } from './catalog-keys';
import { useDebouncedValue } from './use-debounced-value';
import { errorText, findInPagedLists, requireToken, usePagedList } from './use-paged-list';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// --- Consultas ---

type UsePromotionsOptions = {
    enabled?: boolean;
    /** El catálogo de venta las vuelve a pedir cada vez que se abre (vigencia y precio). */
    staleTime?: number;
};

/** Promos de la empresa por nombre, con búsqueda en el backend. */
export function usePromotions(filters: PromotionListParams, options?: UsePromotionsOptions) {
    const q = useDebouncedValue(filters.q?.trim() ?? '', SEARCH_DEBOUNCE_MS);
    const params: PromotionListParams = { ...filters, q: q || undefined };

    return usePagedList(
        promotionKeys.list(params),
        (page) => getPromotions({ ...params, page, size: PAGE_SIZE }, requireToken()),
        options?.enabled ?? true,
        (promotion) => promotion.id,
        { staleTime: options?.staleTime },
    );
}

type UsePromotionOptions = {
    /** Espera a la respuesta del backend: el formulario de edición se inicializa una sola vez. */
    fresh?: boolean;
};

export function usePromotion(id: string | undefined, options?: UsePromotionOptions) {
    const fresh = options?.fresh ?? false;
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const enabled = hasSession && Boolean(id);
    const result = useQuery({
        queryKey: promotionKeys.detail(id ?? ''),
        queryFn: () => getPromotionById(id as string, requireToken()),
        enabled,
        // La copia del listado, para no mostrar un spinner.
        placeholderData: fresh || !id ? undefined : () => findInPagedLists<Promotion>(promotionKeys.lists(), id),
        refetchOnMount: fresh ? 'always' : true,
    });

    // Con fresh, la copia en caché no cuenta hasta que llegue la respuesta pedida al abrir.
    const isReady = !fresh || result.isFetchedAfterMount;
    const promotion = isReady ? result.data ?? null : null;

    return {
        promotion,
        isLoading: enabled && !promotion && (result.isPending || !isReady),
        loadError: promotion ? null : errorText(result.error),
        reload: () => void result.refetch(),
    };
}

// --- Mutaciones ---

/** Se siembra el detalle; los listados se invalidan porque el estado depende de fechas y activa. */
function syncPromotion(promotion: Promotion) {
    queryClient.setQueryData(promotionKeys.detail(promotion.id), promotion);
    void queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
}

export type SavePromotionInput = {
    // Sin id, alta.
    id?: string;
    data: PromotionRequest;
};

export function useSavePromotion() {
    return useMutation({
        mutationFn: ({ id, data }: SavePromotionInput) =>
            id ? updatePromotion(id, data, requireToken()) : createPromotion(data, requireToken()),
        onSuccess: syncPromotion,
    });
}

export function useSetPromotionActive() {
    return useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            setPromotionActive(id, active, requireToken()),
        onSuccess: syncPromotion,
    });
}
