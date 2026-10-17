import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { PageResponse } from '@/types/order';
import { StockMovement, StockMovementResponse } from '@/types/stock-movement';

/** Error con el status HTTP: la caché no reintenta los 4xx (ver query-client). */
export class StockMovementServiceError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

function errorMessageFor(status: number, fallback: string): string {
    // Los mensajes del backend están en inglés: se muestran textos propios.
    if (status === 400) return 'No se pudo consultar el historial.';
    if (status === 403) return 'No tenés permisos para ver el historial de stock.';
    if (status === 404) return 'No se encontró el registro de stock.';
    if (status >= 500) return 'Error del servidor. Intentá de nuevo más tarde.';
    return fallback;
}

async function handleResponse<T>(response: Response, defaultErrorMessage: string): Promise<T> {
    if (!response.ok) {
        throw new StockMovementServiceError(
            errorMessageFor(response.status, defaultErrorMessage),
            response.status,
        );
    }

    return response.json();
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
