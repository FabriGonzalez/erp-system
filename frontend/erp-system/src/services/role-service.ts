import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { parseResponse } from '@/services/api-error';
import { Role, RoleRequest, RoleResponse } from '@/types/role';

const ROLE_ERRORS = {
    byCode: {
        ROLE_NAME_ALREADY_EXISTS: 'Ya existe un rol con ese nombre.',
        ROLE_CODE_ALREADY_EXISTS: 'Ya existe un rol con ese código.',
    },
    byStatus: {
        400: 'Revisá los datos del rol.',
        403: 'Los roles del sistema no se pueden modificar, o no tenés permisos.',
        404: 'Rol no encontrado.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...ROLE_ERRORS, fallback });
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
