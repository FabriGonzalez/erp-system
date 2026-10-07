import { Stock, StockAdjustRequest, StockResponse } from '@/types/stock';
import { apiFetch } from '@/services/api-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

async function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        let message = '';
        try {
            const payload = await response.json();
            message = payload?.message ?? '';
        } catch {
            // Some backend errors do not include a JSON body.
        }
        if (response.status === 403) {
            throw new Error(message || 'No tenés permiso para ajustar el stock.');
        }
        if (response.status === 404) throw new Error(message || 'Stock no encontrado.');
        if (response.status === 409) throw new Error(message || 'No se pudo ajustar el stock.');
        if (response.status >= 500) {
            throw new Error(message || 'Error del servidor. Intentá de nuevo más tarde.');
        }
        throw new Error(message || fallback);
    }
    return response.json();
}

function normalizeStock(data: StockResponse): Stock {
    return {
        id: String(data.id),
        productId: String(data.productId),
        productName: data.productName,
        productVariantId: String(data.productVariantId),
        productVariantSku: data.productVariantSku,
        branchId: String(data.branchId),
        branchName: data.branchName,
        quantity: data.quantity,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
    };
}

async function getStocks(path: string, token: string): Promise<Stock[]> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/inventory/stocks${path}`, {
        headers: authHeaders(token),
    });
    const data = await handleResponse<StockResponse[]>(
        response,
        'No se pudieron obtener los stocks.'
    );
    return data.map(normalizeStock);
}

export function getAllStocks(token: string) {
    return getStocks('', token);
}

export async function getStockById(id: string, token: string): Promise<Stock> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/inventory/stocks/${id}`, {
        headers: authHeaders(token),
    });
    return normalizeStock(await handleResponse<StockResponse>(
        response,
        'No se pudo obtener el stock.'
    ));
}

export function getStocksByBranch(branchId: string, token: string) {
    return getStocks(`/branch/${branchId}`, token);
}

export function getStocksByVariant(productVariantId: string, token: string) {
    return getStocks(`/variant/${productVariantId}`, token);
}

export async function adjustStock(
    data: StockAdjustRequest,
    token: string
): Promise<Stock> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/inventory/stocks/adjust`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });
    return normalizeStock(await handleResponse<StockResponse>(
        response,
        'No se pudo ajustar el stock.'
    ));
}
