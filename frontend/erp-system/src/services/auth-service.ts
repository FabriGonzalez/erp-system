import { ChangePasswordRequest, LoginResponse, TokenResponse } from '@/types/auth';
import { apiFetch } from '@/services/api-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type ErrorPayload = {
    message?: string;
    code?: string;
};

async function readErrorPayload(response: Response): Promise<ErrorPayload> {
    try {
        return (await response.json()) ?? {};
    } catch {
        // El backend puede no devolver JSON.
        return {};
    }
}

function tooManyAttemptsMessage(response: Response): string {
    const seconds = Number(response.headers.get('Retry-After'));
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.';
    }
    const minutes = Math.ceil(seconds / 60);
    return `Demasiados intentos fallidos. Intentá de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
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
        const { code } = await readErrorPayload(response);

        if (response.status === 401) {
            throw new Error('Usuario o contraseña incorrectos.');
        }
        if (response.status === 429) {
            throw new Error(tooManyAttemptsMessage(response));
        }
        if (code === 'COMPANY_SUSPENDED') {
            throw new Error('El acceso de tu empresa está suspendido. Contactá al soporte.');
        }
        if (code === 'COMPANY_CANCELLED') {
            throw new Error('La cuenta de tu empresa fue dada de baja.');
        }
        if (response.status >= 500) {
            throw new Error('Error del servidor. Intentá de nuevo más tarde.');
        }
        throw new Error('Error de autenticación.');
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
        const { code } = await readErrorPayload(response);

        if (code === 'INVALID_CURRENT_PASSWORD') {
            throw new Error('La contraseña actual es incorrecta.');
        }
        if (code === 'PASSWORD_UNCHANGED') {
            throw new Error('La nueva contraseña debe ser distinta de la actual.');
        }
        if (response.status === 429) {
            throw new Error(tooManyAttemptsMessage(response));
        }
        if (response.status === 400) {
            throw new Error('La nueva contraseña no cumple los requisitos.');
        }
        if (response.status === 401) {
            // apiFetch ya disparó el overlay de sesión expirada.
            throw new Error('Tu sesión expiró.');
        }
        throw new Error('No se pudo cambiar la contraseña. Intentá de nuevo más tarde.');
    }

    return response.json();
}
