import { apiFetch } from '@/services/api-client';
import {
    CustomerAccountSummary,
    CustomerAccountSummaryResponse,
    CustomerDebtor,
    CustomerDebtorResponse,
} from '@/types/customer-account';
import { PageResponse } from '@/types/order';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function handleResponse<T>(
    response: Response,
    defaultErrorMessage: string
): Promise<T> {
    if (!response.ok) {
        let errorMessage = '';

        try {
            const errorPayload = await response.json();
            errorMessage = errorPayload?.message ?? '';
        } catch {
            // El backend puede no devolver JSON.
        }

        if (response.status === 404) {
            throw new Error(errorMessage || 'Cliente no encontrado.');
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

function normalizeSummary(data: CustomerAccountSummaryResponse): CustomerAccountSummary {
    return {
        customerId: String(data.customerId),
        balance: Number(data.balance),
        debt: Number(data.debt),
        credit: Number(data.credit),
        pendingOrders: data.pendingOrders,
    };
}

function normalizeDebtor(data: CustomerDebtorResponse): CustomerDebtor {
    return {
        customerId: String(data.customerId),
        customerName: data.customerName,
        debt: Number(data.debt),
        credit: Number(data.credit),
        pendingOrders: data.pendingOrders,
        oldestPendingOrderAt: data.oldestPendingOrderAt ?? null,
    };
}

export async function getCustomerAccountSummary(
    customerId: string,
    token: string
): Promise<CustomerAccountSummary> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers/${customerId}/account`,
        { method: 'GET', headers: authHeaders(token) }
    );

    return normalizeSummary(
        await handleResponse<CustomerAccountSummaryResponse>(
            response,
            'No se pudo obtener el estado de cuenta del cliente.'
        )
    );
}

export async function getDebtors(
    params: { q?: string; page?: number; size?: number },
    token: string
): Promise<PageResponse<CustomerDebtor>> {
    const query = new URLSearchParams();
    if (params.q?.trim()) query.set('q', params.q.trim());
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    const queryString = query.toString();

    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers/debtors${queryString ? `?${queryString}` : ''}`,
        { method: 'GET', headers: authHeaders(token) }
    );

    const page = await handleResponse<PageResponse<CustomerDebtorResponse>>(
        response,
        'No se pudieron cargar los deudores.'
    );

    return { ...page, content: page.content.map(normalizeDebtor) };
}
