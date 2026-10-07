import {
    ProductAttribute,
    ProductAttributeRequest,
    ProductAttributeResponse,
    ProductAttributeValue,
    ProductAttributeValueRequest,
    ProductAttributeValueResponse,
} from '@/types/product-attribute';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

function headers(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

async function responseData<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        let message = '';
        try {
            const payload = await response.json();
            message = payload?.message ?? '';
        } catch {
            // Some backend errors do not include a JSON body.
        }
        if (response.status === 401) throw new Error('Sesión expirada.');
        if (response.status === 404) throw new Error(message || 'Recurso no encontrado.');
        if (response.status === 409) throw new Error(message || 'El recurso ya existe.');
        if (response.status >= 500) {
            throw new Error(message || 'Error del servidor. Intentá de nuevo más tarde.');
        }
        throw new Error(message || fallback);
    }
    return response.json();
}

function normalizeAttribute(data: ProductAttributeResponse): ProductAttribute {
    return {
        id: String(data.id),
        name: data.name,
        active: data.active,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
    };
}

function normalizeValue(data: ProductAttributeValueResponse): ProductAttributeValue {
    return {
        id: String(data.id),
        attributeId: String(data.attributeId),
        attributeName: data.attributeName,
        name: data.value,
        active: data.active,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
    };
}

export async function getAllAttributes(token: string): Promise<ProductAttribute[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/product-attributes`, {
        headers: headers(token),
    });
    const data = await responseData<ProductAttributeResponse[]>(
        response,
        'No se pudieron obtener los atributos.'
    );
    return data.map(normalizeAttribute);
}

export async function getAttributeById(id: string, token: string): Promise<ProductAttribute> {
    const response = await fetch(`${API_BASE_URL}/api/v1/product-attributes/${id}`, {
        headers: headers(token),
    });
    return normalizeAttribute(await responseData<ProductAttributeResponse>(
        response,
        'No se pudo obtener el atributo.'
    ));
}

export async function getAttributeValues(
    attributeId: string,
    token: string
): Promise<ProductAttributeValue[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/v1/product-attributes/${attributeId}/values`,
        { headers: headers(token) }
    );
    const data = await responseData<ProductAttributeValueResponse[]>(
        response,
        'No se pudieron obtener los valores del atributo.'
    );
    return data.map(normalizeValue);
}

async function mutateAttribute(
    path: string,
    method: 'POST' | 'PATCH',
    token: string,
    body?: ProductAttributeRequest
): Promise<ProductAttribute> {
    const response = await fetch(`${API_BASE_URL}/api/v1/product-attributes${path}`, {
        method,
        headers: headers(token),
        body: body ? JSON.stringify({ name: body.name.trim() }) : undefined,
    });
    return normalizeAttribute(await responseData<ProductAttributeResponse>(
        response,
        'No se pudo guardar el atributo.'
    ));
}

export function createAttribute(data: ProductAttributeRequest, token: string) {
    return mutateAttribute('', 'POST', token, data);
}

export function updateAttribute(id: string, data: ProductAttributeRequest, token: string) {
    return mutateAttribute(`/${id}`, 'PATCH', token, data);
}

export function activateAttribute(id: string, token: string) {
    return mutateAttribute(`/${id}/activate`, 'PATCH', token);
}

export function deactivateAttribute(id: string, token: string) {
    return mutateAttribute(`/${id}/deactivate`, 'PATCH', token);
}

async function mutateValue(
    path: string,
    method: 'POST' | 'PATCH',
    token: string,
    data?: ProductAttributeValueRequest
): Promise<ProductAttributeValue> {
    const response = await fetch(`${API_BASE_URL}/api/v1/product-attributes${path}`, {
        method,
        headers: headers(token),
        body: data ? JSON.stringify({ value: data.value.trim() }) : undefined,
    });
    return normalizeValue(await responseData<ProductAttributeValueResponse>(
        response,
        'No se pudo guardar el valor.'
    ));
}

export function createAttributeValue(
    attributeId: string,
    data: ProductAttributeValueRequest,
    token: string
) {
    return mutateValue(`/${attributeId}/values`, 'POST', token, data);
}

export function updateAttributeValue(
    valueId: string,
    data: ProductAttributeValueRequest,
    token: string
) {
    return mutateValue(`/values/${valueId}`, 'PATCH', token, data);
}

export function activateAttributeValue(valueId: string, token: string) {
    return mutateValue(`/values/${valueId}/activate`, 'PATCH', token);
}

export function deactivateAttributeValue(valueId: string, token: string) {
    return mutateValue(`/values/${valueId}/deactivate`, 'PATCH', token);
}
