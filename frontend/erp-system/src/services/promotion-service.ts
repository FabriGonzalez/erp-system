import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { parseResponse } from '@/services/api-error';
import { PageResponse } from '@/types/order';
import {
    Promotion,
    PromotionListParams,
    PromotionRequest,
    PromotionResponse,
} from '@/types/promotion';

const PROMOTION_ERRORS = {
    byCode: {
        INVALID_PROMOTION:
            'La promo no es válida: la fecha de fin no puede ser anterior a la de inicio, no se pueden repetir productos y todos tienen que estar activos.',
        INVALID_PROMOTION_QUERY: 'No se pudo cargar el listado de promos.',
    },
    byStatus: {
        403: 'Tu usuario no tiene el permiso "Administrar precios".',
        404: 'Promo o producto no encontrados.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...PROMOTION_ERRORS, fallback });
}

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

function normalizePromotion(data: PromotionResponse): Promotion {
    return {
        id: String(data.id),
        name: data.name,
        description: data.description ?? undefined,
        price: Number(data.price),
        startDate: data.startDate,
        endDate: data.endDate,
        active: data.active,
        status: data.status,
        regularPriceMin: Number(data.regularPriceMin),
        regularPriceMax: Number(data.regularPriceMax),
        items: (data.items ?? []).map((item) => ({
            id: String(item.id),
            productId: String(item.productId),
            productName: item.productName,
            quantity: Number(item.quantity),
            minPrice: item.minPrice != null ? Number(item.minPrice) : undefined,
            maxPrice: item.maxPrice != null ? Number(item.maxPrice) : undefined,
            available: item.available,
        })),
    };
}

export async function getPromotions(
    params: PromotionListParams & { page: number; size: number },
    token: string
): Promise<PageResponse<Promotion>> {
    const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
    if (params.q?.trim()) query.set('q', params.q.trim());
    if (params.status) query.set('status', params.status);

    const response = await apiFetch(`${API_BASE_URL}/api/v1/promotions?${query.toString()}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const page = await handleResponse<PageResponse<PromotionResponse>>(
        response,
        'No se pudieron cargar las promos.'
    );

    return { ...page, content: page.content.map(normalizePromotion) };
}

export async function getPromotionById(id: string, token: string): Promise<Promotion> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/promotions/${id}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    return normalizePromotion(
        await handleResponse<PromotionResponse>(response, 'No se pudo cargar la promo.')
    );
}

export async function createPromotion(data: PromotionRequest, token: string): Promise<Promotion> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/promotions`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizePromotion(
        await handleResponse<PromotionResponse>(response, 'No se pudo crear la promo.')
    );
}

export async function updatePromotion(id: string, data: PromotionRequest, token: string): Promise<Promotion> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/promotions/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizePromotion(
        await handleResponse<PromotionResponse>(response, 'No se pudo guardar la promo.')
    );
}

export async function setPromotionActive(id: string, active: boolean, token: string): Promise<Promotion> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/promotions/${id}/${active ? 'activate' : 'deactivate'}`,
        { method: 'PATCH', headers: authHeaders(token) }
    );

    return normalizePromotion(
        await handleResponse<PromotionResponse>(
            response,
            active ? 'No se pudo activar la promo.' : 'No se pudo desactivar la promo.'
        )
    );
}
