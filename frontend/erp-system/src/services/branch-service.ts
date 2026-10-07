import { Branch, BranchRequest } from '@/types/branch';
import { apiFetch } from '@/services/api-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type BackendBranchResponse = {
    id: number | string;
    name: string;
    address?: string | null;
    phone?: string | null;
    companyId?: number | string | null;
    active?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

function normalizeBranch(data: BackendBranchResponse): Branch {
    return {
        id: String(data.id),
        name: data.name,
        address: data.address ?? null,
        phone: data.phone ?? null,
        companyId: data.companyId != null ? String(data.companyId) : null,
        active: data.active ?? true,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
    };
}

async function handleResponse<T>(response: Response, defaultErrorMessage: string): Promise<T> {
    if (!response.ok) {
        let errorMessage = '';

        try {
            const errorPayload = await response.json();
            errorMessage = errorPayload?.message ?? '';
        } catch {
            // El backend puede no devolver JSON.
        }

        if (response.status === 404) {
            throw new Error(errorMessage || 'Sucursal no encontrada.');
        }

        if (response.status === 409) {
            throw new Error(errorMessage || 'Ya existe una sucursal con ese nombre.');
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

/**
 * Obtiene las sucursales asignadas a un usuario específico en la empresa activa.
 * Endpoint: GET /api/v1/users/{userId}/branches
 */
export async function getUserBranches(
    userId: string,
    token: string
): Promise<Branch[]> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/users/${userId}/branches`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    const rawList = await handleResponse<BackendBranchResponse[]>(
        response,
        'No se pudieron obtener las sucursales del usuario.'
    );

    return rawList.map(normalizeBranch);
}

/**
 * Obtiene todas las sucursales de la empresa del usuario autenticado.
 * Endpoint: GET /api/v1/branches
 */
export async function getAllBranches(
    token: string,
    active?: boolean
): Promise<Branch[]> {
    const url = new URL(`${API_BASE_URL}/api/v1/branches`);
    if (typeof active === 'boolean') {
        url.searchParams.append('active', String(active));
    }

    const response = await apiFetch(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    const rawList = await handleResponse<BackendBranchResponse[]>(
        response,
        'No se pudieron obtener las sucursales de la empresa.'
    );

    return rawList.map(normalizeBranch);
}

/**
 * Obtiene el detalle de una sucursal por su ID.
 * Endpoint: GET /api/v1/branches/{id}
 */
export async function getBranchById(
    id: string,
    token: string
): Promise<Branch> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/branches/${id}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    const raw = await handleResponse<BackendBranchResponse>(
        response,
        'No se pudo obtener la sucursal.'
    );

    return normalizeBranch(raw);
}

/**
 * Crea una nueva sucursal para la empresa.
 * Endpoint: POST /api/v1/branches
 */
export async function createBranch(
    data: BranchRequest,
    token: string
): Promise<Branch> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/branches`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: data.name.trim(),
            address: data.address?.trim() || null,
            phone: data.phone?.trim() || null,
        }),
    });

    const raw = await handleResponse<BackendBranchResponse>(
        response,
        'No se pudo crear la sucursal.'
    );

    return normalizeBranch(raw);
}

/**
 * Actualiza los datos de una sucursal existente.
 * Endpoint: PATCH /api/v1/branches/{id}
 */
export async function updateBranch(
    id: string,
    data: BranchRequest,
    token: string
): Promise<Branch> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/branches/${id}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: data.name.trim(),
            address: data.address?.trim() || null,
            phone: data.phone?.trim() || null,
        }),
    });

    const raw = await handleResponse<BackendBranchResponse>(
        response,
        'No se pudo actualizar la sucursal.'
    );

    return normalizeBranch(raw);
}

/**
 * Activa una sucursal desactivada.
 * Endpoint: PATCH /api/v1/branches/{id}/activate
 */
export async function activateBranch(
    id: string,
    token: string
): Promise<Branch> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/branches/${id}/activate`,
        {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    const raw = await handleResponse<BackendBranchResponse>(
        response,
        'No se pudo activar la sucursal.'
    );

    return normalizeBranch(raw);
}

/**
 * Desactiva una sucursal activa.
 * Endpoint: PATCH /api/v1/branches/{id}/deactivate
 */
export async function deactivateBranch(
    id: string,
    token: string
): Promise<Branch> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/branches/${id}/deactivate`,
        {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    const raw = await handleResponse<BackendBranchResponse>(
        response,
        'No se pudo desactivar la sucursal.'
    );

    return normalizeBranch(raw);
}

/**
 * Asigna un usuario a una sucursal.
 * Endpoint: POST /api/v1/users/{userId}/branches/{branchId}
 */
export async function assignUserToBranch(
    userId: string,
    branchId: string,
    token: string
): Promise<BackendUserResponse | null> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/users/${userId}/branches/${branchId}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    if (response.status === 201 || response.status === 204) {
        return null;
    }

    const result = await handleResponse<BackendUserResponse | null>(
        response,
        'No se pudo asignar el usuario a la sucursal.'
    );
    return result ?? null;
}

/**
 * Remueve la asignación de un usuario a una sucursal.
 * Endpoint: DELETE /api/v1/users/{userId}/branches/{branchId}
 */
export async function removeUserFromBranch(
    userId: string,
    branchId: string,
    token: string
): Promise<BackendUserResponse | null> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/users/${userId}/branches/${branchId}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    if (response.status === 201 || response.status === 204) {
        return null;
    }

    const result = await handleResponse<BackendUserResponse | null>(
        response,
        'No se pudo remover la asignación del usuario a la sucursal.'
    );
    return result ?? null;
}

export type BackendUserResponse = {
    id: number | string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId?: number | string | null;
    roleName: string;
    companyId?: number | string | null;
    companyName?: string | null;
    active: boolean;
};

/**
 * Obtiene los usuarios asignados a una sucursal.
 * Endpoint: GET /api/v1/branches/{branchId}/users
 */
export async function getBranchUsers(
    branchId: string,
    token: string
): Promise<BackendUserResponse[]> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/branches/${branchId}/users`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    return handleResponse<BackendUserResponse[]>(
        response,
        'No se pudieron obtener los usuarios de la sucursal.'
    );
}

/**
 * Obtiene todos los usuarios de la empresa del usuario autenticado.
 * Endpoint: GET /api/v1/users
 */
export async function getCompanyUsers(
    token: string
): Promise<BackendUserResponse[]> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/users`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    return handleResponse<BackendUserResponse[]>(
        response,
        'No se pudieron obtener los usuarios de la empresa.'
    );
}
