import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { parseResponse } from '@/services/api-error';
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

const CUSTOMER_ERRORS = {
    byCode: {
        INVALID_CUSTOMER_ADDRESS: 'Una dirección inactiva no puede ser la principal.',
        CUSTOMER_DOCUMENT_ALREADY_EXISTS: 'Ya existe un cliente con ese tipo y número de documento.',
        INVALID_CUSTOMER_DOCUMENT: 'El número de documento no es válido para el tipo elegido.',
    },
    byStatus: {
        400: 'Revisá los datos ingresados.',
        404: 'Cliente o dirección no encontrados.',
        409: 'Ya existe un cliente con ese tipo y número de documento.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...CUSTOMER_ERRORS, fallback });
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
