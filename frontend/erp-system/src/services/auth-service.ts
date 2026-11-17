import { ChangePasswordRequest, CurrentUserResponse, LoginResponse, TokenResponse } from '@/types/auth';
import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { ApiError, ErrorMessages, toApiError } from '@/services/api-error';

function tooManyAttemptsMessage(response: Response): string {
    const seconds = Number(response.headers.get('Retry-After'));
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.';
    }
    const minutes = Math.ceil(seconds / 60);
    return `Demasiados intentos fallidos. Intentá de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
}

/** El 429 depende del header Retry-After; el resto sale de la tabla de mensajes. */
async function authError(response: Response, messages: ErrorMessages): Promise<ApiError> {
    if (response.status === 429) {
        return new ApiError(tooManyAttemptsMessage(response), 429, 'TOO_MANY_LOGIN_ATTEMPTS');
    }
    return toApiError(response, messages);
}

/**
 * Calls the real backend login endpoint.
 * Returns the parsed LoginResponse on success.
 * Throws an Error with a user-facing message on failure.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    }, { ignoreUnauthorized: true });

    if (!response.ok) {
        throw await authError(response, {
            byCode: {
                COMPANY_SUSPENDED: 'El acceso de tu empresa está suspendido. Contactá al soporte.',
                COMPANY_CANCELLED: 'La cuenta de tu empresa fue dada de baja.',
            },
            byStatus: {
                401: 'Usuario o contraseña incorrectos.',
            },
            fallback: 'Error de autenticación.',
        });
    }

    const data: LoginResponse = await response.json();
    return data;
}

/**
 * Cambia la contraseña del usuario logueado. El backend revoca los tokens
 * anteriores y devuelve uno nuevo, que el llamador debe guardar.
 */
export async function changePassword(
    request: ChangePasswordRequest,
    token: string
): Promise<TokenResponse> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw await authError(response, {
            byCode: {
                INVALID_CURRENT_PASSWORD: 'La contraseña actual es incorrecta.',
                PASSWORD_UNCHANGED: 'La nueva contraseña debe ser distinta de la actual.',
                PASSWORD_MANAGED_BY_ADMIN:
                    'La contraseña de tu cuenta la administra la empresa. Pedíselo a un administrador.',
            },
            byStatus: {
                400: 'La nueva contraseña no cumple los requisitos.',
                // apiFetch ya disparó el overlay de sesión expirada.
                401: 'Tu sesión expiró.',
            },
            fallback: 'No se pudo cambiar la contraseña. Intentá de nuevo más tarde.',
        });
    }

    return response.json();
}

/**
 * Rol y permisos vigentes del usuario. Un 401 (usuario desactivado, empresa suspendida,
 * contraseña cambiada en otro dispositivo) ya lo resuelve apiFetch expirando la sesión.
 */
export async function getCurrentUser(token: string): Promise<CurrentUserResponse> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw await toApiError(response, { fallback: 'No se pudieron actualizar los permisos.' });
    }

    return response.json();
}

/**
 * Token nuevo con la duración completa para la sesión actual (sesión deslizante).
 * Un 401 ya lo resuelve apiFetch expirando la sesión.
 */
export async function refreshToken(token: string): Promise<TokenResponse> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw await toApiError(response, { fallback: 'No se pudo renovar la sesión.' });
    }

    return response.json();
}
