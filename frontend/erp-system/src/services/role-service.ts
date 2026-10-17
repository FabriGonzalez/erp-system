import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { Role, RoleRequest, RoleResponse } from '@/types/role';

type ErrorPayload = {
    message?: string;
    code?: string;
};

/** Error con el status HTTP: la caché no reintenta los 4xx (ver query-client). */
export class RoleServiceError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

function errorMessageFor(status: number, payload: ErrorPayload, fallback: string): string {
    // Los mensajes del backend están en inglés: se muestran textos propios.
    if (payload.code === 'ROLE_NAME_ALREADY_EXISTS') return 'Ya existe un rol con ese nombre.';
    if (payload.code === 'ROLE_CODE_ALREADY_EXISTS') return 'Ya existe un rol con ese código.';
    if (status === 400) return 'Revisá los datos del rol.';
    if (status === 403) return 'Los roles del sistema no se pueden modificar, o no tenés permisos.';
    if (status === 404) return 'Rol no encontrado.';
    if (status >= 500) return 'Error del servidor. Intentá de nuevo más tarde.';
    return fallback;
}

async function handleResponse<T>(response: Response, defaultErrorMessage: string): Promise<T> {
    if (!response.ok) {
        let payload: ErrorPayload = {};

        try {
            payload = (await response.json()) ?? {};
        } catch {
            // El backend puede no devolver JSON.
        }

        throw new RoleServiceError(
            errorMessageFor(response.status, payload, defaultErrorMessage),
            response.status,
        );
    }

    return response.json();
}

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

function normalizeRole(data: RoleResponse): Role {
    return {
        id: String(data.id),
        name: data.name,
        code: data.code,
        description: data.description ?? '',
        permissions: data.permissions ?? [],
        system: data.system,
        active: data.active,
    };
}

export async function getRoles(token: string): Promise<Role[]> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/roles`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const roles = await handleResponse<RoleResponse[]>(response, 'No se pudieron cargar los roles.');
    return roles.map(normalizeRole);
}

export async function getRole(id: string, token: string): Promise<Role> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/roles/${id}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    return normalizeRole(await handleResponse<RoleResponse>(response, 'No se pudo cargar el rol.'));
}

/** Permisos que puede tener un rol, en el orden del backend. */
export async function getAssignablePermissions(token: string): Promise<string[]> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/roles/permissions`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    return handleResponse<string[]>(response, 'No se pudieron cargar los permisos.');
}

export async function createRole(data: RoleRequest, token: string): Promise<Role> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/roles`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeRole(await handleResponse<RoleResponse>(response, 'No se pudo crear el rol.'));
}

export async function updateRole(id: string, data: RoleRequest, token: string): Promise<Role> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/roles/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeRole(await handleResponse<RoleResponse>(response, 'No se pudo guardar el rol.'));
}

export async function setRoleActive(id: string, active: boolean, token: string): Promise<Role> {
    const action = active ? 'activate' : 'deactivate';
    const response = await apiFetch(`${API_BASE_URL}/api/v1/roles/${id}/${action}`, {
        method: 'PATCH',
        headers: authHeaders(token),
    });

    return normalizeRole(await handleResponse<RoleResponse>(
        response,
        active ? 'No se pudo activar el rol.' : 'No se pudo desactivar el rol.'
    ));
}
