import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { parseResponse } from '@/services/api-error';
import {
    CompanyUser,
    CreateUserRequest,
    UpdateUserRequest,
    UserResponse,
} from '@/types/user';

const USER_ERRORS = {
    byCode: {
        USERNAME_ALREADY_EXISTS: 'Ese nombre de usuario ya está en uso.',
        EMAIL_ALREADY_EXISTS: 'Ese email ya está en uso.',
    },
    byStatus: {
        400: 'Revisá los datos del usuario.',
        403: 'No se puede hacer esta operación sobre tu propio usuario, o no tenés permisos.',
        404: 'Usuario o rol no encontrado. El rol tiene que estar activo.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...USER_ERRORS, fallback });
}

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

function normalizeUser(data: UserResponse): CompanyUser {
    const fullName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();

    return {
        id: String(data.id),
        username: data.username,
        email: data.email,
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        fullName: fullName || data.username,
        roleId: data.roleId !== null && data.roleId !== undefined ? String(data.roleId) : null,
        roleName: data.roleName ?? 'Sin rol',
        active: data.active,
    };
}

/**
 * Usuarios de la empresa de la sesión, opcionalmente por estado.
 * Endpoint: GET /api/v1/users
 */
export async function getCompanyUsers(token: string, active?: boolean): Promise<CompanyUser[]> {
    const query = active === undefined ? '' : `?active=${active}`;
    const response = await apiFetch(`${API_BASE_URL}/api/v1/users${query}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const users = await handleResponse<UserResponse[]>(response, 'No se pudieron cargar los usuarios.');
    return users.map(normalizeUser);
}

/**
 * Usuarios asignados a una sucursal.
 * Endpoint: GET /api/v1/branches/{branchId}/users
 */
export async function getBranchUsers(branchId: string, token: string): Promise<CompanyUser[]> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/branches/${branchId}/users`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const users = await handleResponse<UserResponse[]>(
        response,
        'No se pudieron obtener los usuarios de la sucursal.'
    );
    return users.map(normalizeUser);
}

export async function getUser(id: string, token: string): Promise<CompanyUser> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/users/${id}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    return normalizeUser(await handleResponse<UserResponse>(response, 'No se pudo cargar el usuario.'));
}

export async function createUser(data: CreateUserRequest, token: string): Promise<CompanyUser> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/users`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeUser(await handleResponse<UserResponse>(response, 'No se pudo crear el usuario.'));
}

export async function updateUser(id: string, data: UpdateUserRequest, token: string): Promise<CompanyUser> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/users/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });

    return normalizeUser(await handleResponse<UserResponse>(response, 'No se pudo guardar el usuario.'));
}

export async function setUserActive(id: string, active: boolean, token: string): Promise<CompanyUser> {
    const action = active ? 'activate' : 'deactivate';
    const response = await apiFetch(`${API_BASE_URL}/api/v1/users/${id}/${action}`, {
        method: 'PATCH',
        headers: authHeaders(token),
    });

    return normalizeUser(await handleResponse<UserResponse>(
        response,
        active ? 'No se pudo activar el usuario.' : 'No se pudo desactivar el usuario.'
    ));
}

/**
 * El administrador elige la contraseña nueva; cierra las sesiones abiertas del usuario.
 * Endpoint: POST /api/v1/users/{id}/password-reset → 204 sin body.
 */
export async function resetUserPassword(id: string, newPassword: string, token: string): Promise<void> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/users/${id}/password-reset`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
        await handleResponse<never>(response, 'No se pudo cambiar la contraseña.');
    }
}
