import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { CustomerServiceError } from '@/services/customer-service';
import {
    AccountTransaction,
    AccountTransactionResponse,
    CustomerAccountSummary,
    CustomerAccountSummaryResponse,
    CustomerDebtor,
    CustomerDebtorResponse,
    CustomerPendingOrder,
    CustomerPendingOrderResponse,
} from '@/types/customer-account';
import { PageResponse } from '@/types/order';

async function handleResponse<T>(
    response: Response,
    defaultErrorMessage: string
): Promise<T> {
    if (!response.ok) {
        // Con el status, la caché no reintenta un 403/404 (ver query-client).
        const message =
            response.status === 403 ? 'No tenés permisos para ver esta información.'
                : response.status === 404 ? 'Cliente no encontrado.'
                    : response.status >= 500 ? 'Error del servidor. Intentá de nuevo más tarde.'
                        : defaultErrorMessage;
        throw new CustomerServiceError(message, response.status);
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

function normalizePendingOrder(data: CustomerPendingOrderResponse): CustomerPendingOrder {
    return {
        orderId: String(data.orderId),
        orderNumber: data.orderNumber,
        branchId: String(data.branchId),
        branchName: data.branchName,
        status: data.status,
        salesType: data.salesType,
        deliveryType: data.deliveryType,
        total: Number(data.total),
        amountPaid: Number(data.amountPaid),
        balance: Number(data.balance),
        createdAt: data.createdAt,
    };
}

function normalizeTransaction(data: AccountTransactionResponse): AccountTransaction {
    return {
        id: String(data.id),
        type: data.type,
        amount: Number(data.amount),
        description: data.description ?? null,
        branchName: data.branchName ?? null,
        createdAt: data.createdAt,
    };
}

function pageQuery(params: { page?: number; size?: number }): string {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
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

export async function getCustomerPendingOrders(
    customerId: string,
    params: { page?: number; size?: number },
    token: string
): Promise<PageResponse<CustomerPendingOrder>> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers/${customerId}/account/pending-orders${pageQuery(params)}`,
        { method: 'GET', headers: authHeaders(token) }
    );

    const page = await handleResponse<PageResponse<CustomerPendingOrderResponse>>(
        response,
        'No se pudieron cargar los pedidos pendientes.'
    );

    return { ...page, content: page.content.map(normalizePendingOrder) };
}

export async function getCustomerAccountTransactions(
    customerId: string,
    params: { page?: number; size?: number },
    token: string
): Promise<PageResponse<AccountTransaction>> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers/${customerId}/account/transactions${pageQuery(params)}`,
        { method: 'GET', headers: authHeaders(token) }
    );

    const page = await handleResponse<PageResponse<AccountTransactionResponse>>(
        response,
        'No se pudieron cargar los movimientos de la cuenta.'
    );

    return { ...page, content: page.content.map(normalizeTransaction) };
}
