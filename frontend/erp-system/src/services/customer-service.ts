import { apiFetch } from '@/services/api-client';
import {
    AddressRequest,
    AddressResponse,
    Customer,
    CustomerAddress,
    CustomerCreateRequest,
    CustomerListParams,
    CustomerRequest,
    CustomerResponse,
} from '@/types/customer';
import { PageResponse } from '@/types/order';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type ErrorPayload = {
    message?: string;
    code?: string;
};

/** Error con el status HTTP, para distinguir p. ej. "no existe" (404) de un fallo. */
export class CustomerServiceError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

function errorMessageFor(status: number, payload: ErrorPayload, fallback: string): string {
    // Los mensajes del backend están en inglés: se muestran textos propios.
    if (payload.code === 'INVALID_CUSTOMER_ADDRESS') {
        return 'Una dirección inactiva no puede ser la principal.';
    }
    if (status === 400) return 'Revisá los datos ingresados.';
    if (status === 403) return 'No tenés permisos para realizar esta acción.';
    if (status === 404) return 'Cliente o dirección no encontrados.';
    if (status === 409) return 'Ya existe un cliente con ese tipo y número de documento.';
    if (status >= 500) return 'Error del servidor. Intentá de nuevo más tarde.';
    return fallback;
}

async function handleResponse<T>(
    response: Response,
    defaultErrorMessage: string
): Promise<T> {
    if (!response.ok) {
        let payload: ErrorPayload = {};

        try {
            payload = (await response.json()) ?? {};
        } catch {
            // El backend puede no devolver JSON.
        }

        throw new CustomerServiceError(
            errorMessageFor(response.status, payload, defaultErrorMessage),
            response.status,
        );
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

// null del backend -> undefined en el dominio, y texto vacío también.
function optional(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

export function normalizeAddress(data: AddressResponse): CustomerAddress {
    return {
        id: String(data.id),
        label: optional(data.label),
        street: data.street?.trim() ?? '',
        number: optional(data.number),
        apartment: optional(data.apartment),
        floor: optional(data.floor),
        city: data.city?.trim() ?? '',
        state: optional(data.state),
        postalCode: optional(data.postalCode),
        country: optional(data.country),
        reference: optional(data.reference),
        isMain: data.mainAddress,
        active: data.active,
    };
}

export function normalizeCustomer(data: CustomerResponse): Customer {
    const firstName = optional(data.firstName);
    const lastName = optional(data.lastName);

    return {
        id: String(data.id),
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(' ') || 'Cliente sin nombre',
        email: optional(data.email),
        phone: optional(data.phone),
        documentType: optional(data.documentType),
        documentNumber: optional(data.documentNumber),
        observations: optional(data.observations),
        active: data.active,
        addressCount: data.addressCount ?? 0,
        mainAddress: data.mainAddress ? normalizeAddress(data.mainAddress) : null,
    };
}

export async function listCustomers(
    params: CustomerListParams,
    token: string
): Promise<PageResponse<Customer>> {
    const query = new URLSearchParams();
    if (params.q?.trim()) query.set('q', params.q.trim());
    if (params.active !== undefined) query.set('active', String(params.active));
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.sort) query.set('sort', params.sort);
    const queryString = query.toString();

    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers${queryString ? `?${queryString}` : ''}`,
        { method: 'GET', headers: authHeaders(token) }
    );

    const page = await handleResponse<PageResponse<CustomerResponse>>(
        response,
        'No se pudieron cargar los clientes.'
    );

    return { ...page, content: page.content.map(normalizeCustomer) };
}

export async function getCustomer(id: string, token: string): Promise<Customer> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/customers/${id}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    return normalizeCustomer(
        await handleResponse<CustomerResponse>(response, 'No se pudo cargar el cliente.')
    );
}

export async function createCustomer(
    data: CustomerCreateRequest,
    token: string
): Promise<Customer> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/customers`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeCustomer(
        await handleResponse<CustomerResponse>(response, 'No se pudo crear el cliente.')
    );
}

export async function updateCustomer(
    id: string,
    data: CustomerRequest,
    token: string
): Promise<Customer> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/customers/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeCustomer(
        await handleResponse<CustomerResponse>(response, 'No se pudo actualizar el cliente.')
    );
}

export async function setCustomerActive(
    id: string,
    active: boolean,
    token: string
): Promise<Customer> {
    const action = active ? 'activate' : 'deactivate';
    const response = await apiFetch(`${API_BASE_URL}/api/v1/customers/${id}/${action}`, {
        method: 'PATCH',
        headers: authHeaders(token),
    });

    return normalizeCustomer(
        await handleResponse<CustomerResponse>(
            response,
            active ? 'No se pudo activar el cliente.' : 'No se pudo desactivar el cliente.'
        )
    );
}

/** Todas las direcciones del cliente, incluidas las inactivas; primero la principal. */
export async function listAddresses(
    customerId: string,
    token: string
): Promise<CustomerAddress[]> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers/${customerId}/addresses`,
        { method: 'GET', headers: authHeaders(token) }
    );

    const data = await handleResponse<AddressResponse[]>(
        response,
        'No se pudieron cargar las direcciones.'
    );

    return data.map(normalizeAddress);
}

export async function createAddress(
    customerId: string,
    data: AddressRequest,
    token: string
): Promise<CustomerAddress> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers/${customerId}/addresses`,
        { method: 'POST', headers: authHeaders(token), body: JSON.stringify(data) }
    );

    return normalizeAddress(
        await handleResponse<AddressResponse>(response, 'No se pudo agregar la dirección.')
    );
}

export async function updateAddress(
    customerId: string,
    addressId: string,
    data: AddressRequest,
    token: string
): Promise<CustomerAddress> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers/${customerId}/addresses/${addressId}`,
        { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data) }
    );

    return normalizeAddress(
        await handleResponse<AddressResponse>(response, 'No se pudo actualizar la dirección.')
    );
}

export async function setAddressActive(
    customerId: string,
    addressId: string,
    active: boolean,
    token: string
): Promise<CustomerAddress> {
    const action = active ? 'activate' : 'deactivate';
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/customers/${customerId}/addresses/${addressId}/${action}`,
        { method: 'PATCH', headers: authHeaders(token) }
    );

    return normalizeAddress(
        await handleResponse<AddressResponse>(
            response,
            active ? 'No se pudo activar la dirección.' : 'No se pudo desactivar la dirección.'
        )
    );
}
