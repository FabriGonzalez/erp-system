import { Category, CategoryRequest } from '@/types/category';
import { apiFetch } from '@/services/api-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type BackendCategoryResponse = {
    id: number | string;
    name: string;
    description?: string | null;
    companyId?: number | string | null;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

function normalizeCategory(data: BackendCategoryResponse): Category {
    return {
        id: String(data.id),
        name: data.name,
        description: data.description ?? null,
        companyId: data.companyId != null ? String(data.companyId) : null,
        active: data.active,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
    };
}

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
            throw new Error(errorMessage || 'Categoría no encontrada.');
        }

        if (response.status === 409) {
            throw new Error(errorMessage || 'Ya existe una categoría con ese nombre.');
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

/**
 * Obtiene todas las categorías de la empresa del usuario autenticado.
 * Endpoint: GET /api/v1/categories
 */
export async function getAllCategories(token: string): Promise<Category[]> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/categories`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const rawList = await handleResponse<BackendCategoryResponse[]>(
        response,
        'No se pudieron obtener las categorías.'
    );

    return rawList.map(normalizeCategory);
}

/**
 * Obtiene el detalle de una categoría por su ID.
 * Endpoint: GET /api/v1/categories/{id}
 */
export async function getCategoryById(
    id: string,
    token: string
): Promise<Category> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/categories/${id}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const raw = await handleResponse<BackendCategoryResponse>(
        response,
        'No se pudo obtener la categoría.'
    );

    return normalizeCategory(raw);
}

/**
 * Crea una nueva categoría para la empresa.
 * Endpoint: POST /api/v1/categories
 */
export async function createCategory(
    data: CategoryRequest,
    token: string
): Promise<Category> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/categories`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
            name: data.name.trim(),
            description: data.description?.trim() || null,
        }),
    });

    const raw = await handleResponse<BackendCategoryResponse>(
        response,
        'No se pudo crear la categoría.'
    );

    return normalizeCategory(raw);
}

/**
 * Actualiza los datos de una categoría existente.
 * Endpoint: PATCH /api/v1/categories/{id}
 */
export async function updateCategory(
    id: string,
    data: CategoryRequest,
    token: string
): Promise<Category> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/categories/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({
            name: data.name.trim(),
            description: data.description?.trim() || null,
        }),
    });

    const raw = await handleResponse<BackendCategoryResponse>(
        response,
        'No se pudo actualizar la categoría.'
    );

    return normalizeCategory(raw);
}

/**
 * Activa una categoría desactivada.
 * Endpoint: PATCH /api/v1/categories/{id}/activate
 */
export async function activateCategory(
    id: string,
    token: string
): Promise<Category> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/categories/${id}/activate`,
        {
            method: 'PATCH',
            headers: authHeaders(token),
        }
    );

    const raw = await handleResponse<BackendCategoryResponse>(
        response,
        'No se pudo activar la categoría.'
    );

    return normalizeCategory(raw);
}

/**
 * Desactiva una categoría activa.
 * Endpoint: PATCH /api/v1/categories/{id}/deactivate
 */
export async function deactivateCategory(
    id: string,
    token: string
): Promise<Category> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/categories/${id}/deactivate`,
        {
            method: 'PATCH',
            headers: authHeaders(token),
        }
    );

    const raw = await handleResponse<BackendCategoryResponse>(
        response,
        'No se pudo desactivar la categoría.'
    );

    return normalizeCategory(raw);
}
