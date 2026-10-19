import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { BRANCH_ACCESS_ERRORS, parseResponse } from '@/services/api-error';
import { PageResponse } from '@/types/order';
import {
    Payment,
    PaymentAllocationResponse,
    PaymentRequest,
    PaymentResponse,
} from '@/types/payment';

const PAYMENT_ERRORS = {
    byCode: {
        ...BRANCH_ACCESS_ERRORS,
        INVALID_PAYMENT: 'El pago no es válido o ya fue anulado.',
    },
    byStatus: {
        400: 'Revisá los datos del pago.',
        403: 'No tenés permisos para esta operación o no estás asignado a la sucursal del pago.',
        404: 'Pago, cliente o sucursal no encontrados.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...PAYMENT_ERRORS, fallback });
}

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

function normalizePayment(data: PaymentResponse): Payment {
    const amount = Number(data.amount);
    const allocations = (data.allocations ?? [])
        .filter((allocation): allocation is PaymentAllocationResponse & { orderId: number | string } =>
            allocation.orderId !== null && allocation.orderId !== undefined)
        .map((allocation) => ({
            orderId: String(allocation.orderId),
            orderNumber: allocation.orderNumber ?? '',
            amount: Number(allocation.amount),
        }));
    const allocated = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);

    return {
        id: String(data.id),
        customerId: String(data.customerId ?? ''),
        branchId: data.branchId !== null && data.branchId !== undefined ? String(data.branchId) : null,
        branchName: data.branchName ?? null,
        amount,
        method: data.method,
        status: data.status,
        createdByUsername: data.createdByUsername ?? null,
        createdAt: data.createdAt,
        cancelledAt: data.cancelledAt ?? null,
        cancelledByUsername: data.cancelledByUsername ?? null,
        allocations,
        // Un pago anulado ya no tiene asignaciones ni deja saldo a favor.
        unallocatedAmount: data.status === 'ACTIVE' ? Math.max(0, amount - allocated) : 0,
    };
}

export async function createPayment(data: PaymentRequest, token: string): Promise<Payment> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/payments`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizePayment(await handleResponse<PaymentResponse>(response, 'No se pudo registrar el pago.'));
}

export async function getCustomerPayments(
    customerId: string,
    params: { page?: number; size?: number },
    token: string
): Promise<PageResponse<Payment>> {
    const query = new URLSearchParams({ customerId });
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const response = await apiFetch(`${API_BASE_URL}/api/v1/payments?${query.toString()}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const page = await handleResponse<PageResponse<PaymentResponse>>(
        response,
        'No se pudieron cargar los pagos.'
    );

    return { ...page, content: page.content.map(normalizePayment) };
}

export async function cancelPayment(id: string, token: string): Promise<Payment> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/payments/${id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders(token),
    });

    return normalizePayment(await handleResponse<PaymentResponse>(response, 'No se pudo anular el pago.'));
}
