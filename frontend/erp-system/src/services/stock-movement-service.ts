import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { parseResponse } from '@/services/api-error';
import { PageResponse } from '@/types/order';
import { StockMovement, StockMovementResponse } from '@/types/stock-movement';

const STOCK_MOVEMENT_ERRORS = {
    byStatus: {
        400: 'No se pudo consultar el historial.',
        403: 'No tenés permisos para ver el historial de stock.',
        404: 'No se encontró el registro de stock.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...STOCK_MOVEMENT_ERRORS, fallback });
}

function normalizeMovement(data: StockMovementResponse): StockMovement {
    return {
        id: String(data.id),
        stockId: String(data.stockId),
        type: data.type,
        quantity: Number(data.quantity),
        previousQuantity: Number(data.previousQuantity),
        newQuantity: Number(data.newQuantity),
        reason: data.reason,
        referenceId: data.referenceId == null ? null : String(data.referenceId),
        referenceType: data.referenceType,
        createdByUsername: data.createdByUsername,
        createdAt: data.createdAt,
    };
}

/** Movimientos de un stock, del más nuevo al más viejo. */
export async function getStockMovements(
    params: { stockId: string; page?: number; size?: number },
    token: string
): Promise<PageResponse<StockMovement>> {
    const query = new URLSearchParams({ stockId: params.stockId });
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const response = await apiFetch(`${API_BASE_URL}/api/v1/inventory/movements?${query.toString()}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    const page = await handleResponse<PageResponse<StockMovementResponse>>(
        response,
        'No se pudo cargar el historial.'
    );

    return { ...page, content: page.content.map(normalizeMovement) };
}
