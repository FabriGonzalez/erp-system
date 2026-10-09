import { apiFetch } from '@/services/api-client';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import {
    Order,
    OrderItem,
    OrderItemResponse,
    OrderListParams,
    OrderRequest,
    OrderResponse,
    OrderUpdateRequest,
    PageResponse,
    RefundAction,
} from '@/types/order';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const ERROR_MESSAGES_BY_CODE: Record<string, string> = {
    INSUFFICIENT_STOCK: 'No hay stock suficiente para completar la operación.',
    INVALID_STATUS_TRANSITION: 'La orden no está en un estado que permita esta operación.',
    QUICK_SALE_INVALID: 'La venta rápida requiere un cliente registrado y un importe válido.',
};

async function handleResponse<T>(
    response: Response,
    defaultErrorMessage: string
): Promise<T> {
    if (!response.ok) {
        let errorMessage = '';
        let errorCode = '';

        try {
            const errorPayload = await response.json();
            errorMessage = errorPayload?.message ?? '';
            errorCode = errorPayload?.code ?? '';
        } catch {
            // El backend puede no devolver JSON.
        }

        const knownMessage = ERROR_MESSAGES_BY_CODE[errorCode];
        if (knownMessage) {
            throw new Error(knownMessage);
        }

        if (response.status === 404) {
            throw new Error(errorMessage || 'Orden no encontrada.');
        }

        if (response.status >= 500) {
            throw new Error(
                errorMessage || 'Error del servidor. Intentá de nuevo más tarde.'
            );
        }

        throw new Error(errorMessage || defaultErrorMessage);
    }

    if (response.status === 204) {
        return undefined as unknown as T;
    }

    return response.json();
}

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

function normalizeOrderItem(item: OrderItemResponse): OrderItem {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    return {
        id: String(item.id),
        productId: String(item.productId),
        variantId: String(item.productVariantId),
        productName: item.productName,
        productSku: item.productVariantSku,
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice,
    };
}

function normalizeOrder(data: OrderResponse): Order {
    return {
        id: String(data.id),
        orderNumber: data.orderNumber,
        customerId:
            data.customerId !== null && data.customerId !== undefined
                ? String(data.customerId)
                : CUSTOMER_ANONYMOUS.id,
        customerName: data.customerName ?? CUSTOMER_ANONYMOUS.name,
        salesType: data.salesType,
        quickSaleAmount:
            data.quickSaleAmount !== null && data.quickSaleAmount !== undefined
                ? Number(data.quickSaleAmount)
                : undefined,
        deliveryType: data.deliveryType,
        branchId: String(data.branchId),
        branchName: data.branchName,
        items: (data.items ?? []).map(normalizeOrderItem),
        total: Number(data.total),
        amountPaid: Number(data.amountPaid ?? 0),
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

function buildListQuery(params: OrderListParams): string {
    const query = new URLSearchParams();

    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.sort) query.set('sort', params.sort);
    if (params.q?.trim()) query.set('q', params.q.trim());
    if (params.status) query.set('status', params.status);
    if (params.branchId) query.set('branchId', params.branchId);
    if (params.salesType) query.set('salesType', params.salesType);
    if (params.deliveryType) query.set('deliveryType', params.deliveryType);
    if (params.customerId) query.set('customerId', params.customerId);
    if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);

    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
}

export async function getOrders(
    params: OrderListParams,
    token: string
): Promise<PageResponse<Order>> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/orders${buildListQuery(params)}`,
        { method: 'GET', headers: authHeaders(token) }
    );

    const page = await handleResponse<PageResponse<OrderResponse>>(
        response,
        'No se pudieron cargar las órdenes.'
    );

    return { ...page, content: page.content.map(normalizeOrder) };
}

export async function getOrderById(id: string, token: string): Promise<Order> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/orders/${id}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    return normalizeOrder(
        await handleResponse<OrderResponse>(response, 'No se pudo cargar la orden.')
    );
}

export async function createOrder(
    data: OrderRequest,
    token: string
): Promise<Order> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeOrder(
        await handleResponse<OrderResponse>(response, 'No se pudo crear la orden.')
    );
}

export async function updateOrder(
    id: string,
    data: OrderUpdateRequest,
    token: string
): Promise<Order> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/orders/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeOrder(
        await handleResponse<OrderResponse>(response, 'No se pudo editar la orden.')
    );
}

export async function cancelOrder(
    id: string,
    token: string,
    refundAction?: RefundAction
): Promise<Order> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/orders/${id}/cancel`, {
        method: 'POST',
        headers: authHeaders(token),
        body: refundAction ? JSON.stringify({ refundAction }) : undefined,
    });

    return normalizeOrder(
        await handleResponse<OrderResponse>(response, 'No se pudo cancelar la orden.')
    );
}

export async function dispatchOrder(id: string, token: string): Promise<Order> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/orders/${id}/dispatch`, {
        method: 'POST',
        headers: authHeaders(token),
    });

    return normalizeOrder(
        await handleResponse<OrderResponse>(response, 'No se pudo despachar la orden.')
    );
}
