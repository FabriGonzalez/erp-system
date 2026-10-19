import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { BRANCH_ACCESS_ERRORS, parseResponse } from '@/services/api-error';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import {
    Order,
    OrderItem,
    OrderItemResponse,
    OrderListParams,
    OrderRequest,
    OrderResponse,
    OrderShippingAddress,
    OrderUpdateRequest,
    PageResponse,
    RefundAction,
    ShipmentResponse,
} from '@/types/order';

const ORDER_ERRORS = {
    byCode: {
        ...BRANCH_ACCESS_ERRORS,
        INSUFFICIENT_STOCK: 'No hay stock suficiente para completar la operación.',
        INVALID_STATUS_TRANSITION: 'La orden no está en un estado que permita esta operación.',
        QUICK_SALE_INVALID:
            'La venta rápida es solo con retiro en el local y requiere un cliente registrado y un importe válido.',
        CUSTOMER_INACTIVE: 'El cliente está inactivo y no puede recibir pedidos nuevos.',
        // En el alta: el pago inicial no puede superar el saldo del pedido.
        INVALID_PAYMENT: 'El pago inicial no es válido: no puede superar el total del pedido.',
        INVALID_SHIPPING_ADDRESS:
            'La dirección de envío no es válida: tiene que ser una dirección activa del cliente, con calle y ciudad.',
        INVALID_SHIPMENT: 'El envío no se puede actualizar en el estado actual.',
        ORDER_ALREADY_HAS_SHIPMENT: 'La orden ya tiene un envío registrado.',
        STOCK_NOT_FOUND: 'Uno de los productos no tiene stock en la sucursal.',
    },
    byStatus: {
        404: 'Orden no encontrada.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...ORDER_ERRORS, fallback });
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

function normalizeShippingAddress(shipment: ShipmentResponse): OrderShippingAddress {
    const optional = (value?: string | null) => value ?? undefined;

    return {
        street: shipment.street,
        number: optional(shipment.number),
        apartment: optional(shipment.apartment),
        floor: optional(shipment.floor),
        city: shipment.city,
        state: optional(shipment.state),
        postalCode: optional(shipment.postalCode),
        country: shipment.country,
        reference: optional(shipment.reference),
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
        shippingAddress: data.shipment ? normalizeShippingAddress(data.shipment) : undefined,
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
