import { LoginResponse } from '@/types/auth';
import { apiFetch } from '@/services/api-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

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
        let errorMessage: string;

        try {
            const errorPayload = await response.json();
            errorMessage = errorPayload?.message ?? '';
        } catch {
            errorMessage = '';
        }

        if (response.status === 401) {
            throw new Error(errorMessage || 'Credenciales inválidas.');
        } else if (response.status >= 500) {
            throw new Error(errorMessage || 'Error del servidor. Intentá de nuevo más tarde.');
        } else {
            throw new Error(errorMessage || 'Error de autenticación.');
        }
    }

    const data: LoginResponse = await response.json();
    return data;
}
