import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { BRANCH_ACCESS_ERRORS, parseResponse } from '@/services/api-error';
import { PageResponse } from '@/types/order';
import { StockTransfer, StockTransferRequest, StockTransferResponse } from '@/types/transfer';

const TRANSFER_ERRORS = {
    byCode: {
        ...BRANCH_ACCESS_ERRORS,
        INVALID_STOCK_TRANSFER:
            'La transferencia no es válida: revisá que las sucursales sean distintas, que no haya productos repetidos y que no esté anulada.',
        INSUFFICIENT_STOCK:
            'No hay stock suficiente. Al anular, la sucursal de destino tiene que tener todavía las unidades transferidas.',
        STOCK_NOT_FOUND: 'Uno de los productos no tiene stock en la sucursal de origen.',
        BRANCH_INACTIVE: 'La sucursal de destino está inactiva.',
    },
    byStatus: {
        400: 'Revisá los datos de la transferencia.',
        403: 'No tenés permisos para transferir stock.',
        404: 'Transferencia, sucursal o producto no encontrados, o el producto no tiene stock en el origen.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...TRANSFER_ERRORS, fallback });
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
