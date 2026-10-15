import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { PageResponse } from '@/types/order';
import { StockTransfer, StockTransferRequest, StockTransferResponse } from '@/types/transfer';

type ErrorPayload = {
    message?: string;
    code?: string;
};

/** Error con el status HTTP: la caché no reintenta los 4xx (ver query-client). */
export class TransferServiceError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

function errorMessageFor(status: number, payload: ErrorPayload, fallback: string): string {
    // Los mensajes del backend están en inglés: se muestran textos propios.
    if (payload.code === 'INVALID_STOCK_TRANSFER') {
        return 'La transferencia no es válida: revisá que las sucursales sean distintas, que no haya productos repetidos y que no esté anulada.';
    }
    if (payload.code === 'INSUFFICIENT_STOCK') {
        return 'No hay stock suficiente. Al anular, la sucursal de destino tiene que tener todavía las unidades transferidas.';
    }
    if (status === 400) return 'Revisá los datos de la transferencia.';
    if (status === 403) return 'No tenés permisos para transferir stock.';
    if (status === 404) return 'Transferencia, sucursal o producto no encontrados, o el producto no tiene stock en el origen.';
    if (status >= 500) return 'Error del servidor. Intentá de nuevo más tarde.';
    return fallback;
}

async function handleResponse<T>(response: Response, defaultErrorMessage: string): Promise<T> {
    if (!response.ok) {
        let payload: ErrorPayload = {};

        try {
            payload = (await response.json()) ?? {};
        } catch {
            // El backend puede no devolver JSON.
        }

        throw new TransferServiceError(
            errorMessageFor(response.status, payload, defaultErrorMessage),
            response.status,
        );
    }

    return response.json();
}

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

function normalizeTransfer(data: StockTransferResponse): StockTransfer {
    const items = (data.items ?? []).map((item) => ({
        id: String(item.id),
        productId: String(item.productId),
        productName: item.productName,
        variantId: String(item.productVariantId),
        sku: item.productVariantSku,
        quantity: Number(item.quantity),
    }));

    return {
        id: String(data.id),
        originBranchId: String(data.originBranchId),
        originBranchName: data.originBranchName,
        destinationBranchId: String(data.destinationBranchId),
        destinationBranchName: data.destinationBranchName,
        status: data.status,
        createdByUsername: data.createdByUsername,
        createdAt: data.confirmedAt ?? data.createdAt,
        items,
        totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
    };
}

export async function getTransfers(
    params: { page?: number; size?: number },
    token: string
): Promise<PageResponse<StockTransfer>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const response = await apiFetch(`${API_BASE_URL}/api/v1/inventory/transfers?${query.toString()}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const page = await handleResponse<PageResponse<StockTransferResponse>>(
        response,
        'No se pudieron cargar las transferencias.'
    );

    return { ...page, content: page.content.map(normalizeTransfer) };
}

export async function getTransferById(id: string, token: string): Promise<StockTransfer> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/inventory/transfers/${id}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    return normalizeTransfer(
        await handleResponse<StockTransferResponse>(response, 'No se pudo cargar la transferencia.')
    );
}

export async function createTransfer(data: StockTransferRequest, token: string): Promise<StockTransfer> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/inventory/transfers`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeTransfer(
        await handleResponse<StockTransferResponse>(response, 'No se pudo crear la transferencia.')
    );
}

export async function cancelTransfer(id: string, token: string): Promise<StockTransfer> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/inventory/transfers/${id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders(token),
    });

    return normalizeTransfer(
        await handleResponse<StockTransferResponse>(response, 'No se pudo anular la transferencia.')
    );
}
