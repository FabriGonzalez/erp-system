import { Stock, StockAdjustRequest, StockResponse } from '@/types/stock';
import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { BRANCH_ACCESS_ERRORS, parseResponse } from '@/services/api-error';

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

const STOCK_ERRORS = {
    byCode: {
        ...BRANCH_ACCESS_ERRORS,
        STOCK_NOT_FOUND: 'Stock no encontrado.',
        STOCK_ALREADY_EXISTS: 'Ese producto ya tiene stock registrado en la sucursal.',
        INSUFFICIENT_STOCK: 'No hay stock suficiente.',
    },
    byStatus: {
        403: 'No tenés permiso para ajustar el stock.',
        404: 'Stock, producto o sucursal no encontrados.',
        409: 'No se pudo ajustar el stock.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...STOCK_ERRORS, fallback });
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
