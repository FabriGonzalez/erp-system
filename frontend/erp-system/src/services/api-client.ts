import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { networkError, readErrorPayload } from '@/services/api-error';

const DEFAULT_API_PORT = '8080';

/**
 * URL del backend. EXPO_PUBLIC_API_URL la fija explícitamente (builds o un backend remoto).
 * Sin ella, en desarrollo se usa el mismo host que sirve la app: la página en web y el
 * servidor de Metro en el dispositivo. Así no hay que editar la IP cada vez que cambia la red.
 */
function resolveApiBaseUrl(): string {
    const configured = process.env.EXPO_PUBLIC_API_URL;
    if (configured) return configured.replace(/\/+$/, '');

    const port = process.env.EXPO_PUBLIC_API_PORT ?? DEFAULT_API_PORT;
    // En web, Expo también renderiza en el servidor (Node), donde no hay window: ahí no se
    // hacen requests, y en el navegador el módulo se vuelve a evaluar con window.
    const host = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.location.hostname : undefined)
        // hostUri es "IP:puerto" del servidor de Metro, p. ej. "192.168.80.31:8081".
        : Constants.expoConfig?.hostUri?.split(':')[0];

    return `http://${host || 'localhost'}:${port}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

type ApiFetchOptions = {
    ignoreUnauthorized?: boolean;
};

// code: código de error del backend (p. ej. COMPANY_SUSPENDED), o null si no vino.
type UnauthorizedHandler = (code: string | null) => void;

// auth-store registra aquí cómo expirar la sesión. Se inyecta en lugar de
// importar el store para no crear el ciclo auth-store -> ... -> api-client.
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
    unauthorizedHandler = handler;
}

export async function apiFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    options?: ApiFetchOptions
): Promise<Response> {
    let response: Response;
    try {
        response = await fetch(input, init);
    } catch (error) {
        // fetch rechaza con TypeError ("Network request failed" / "Failed to fetch") cuando
        // no llega al servidor: se convierte en un error con mensaje en español.
        if (error instanceof TypeError) throw networkError();
        throw error;
    }

    if (response.status === 401 && !options?.ignoreUnauthorized) {
        unauthorizedHandler?.(await readErrorCode(response));
    }

    return response;
}

/** Lee el campo code del ErrorResponse sin consumir el body que usa el llamador. */
export async function readErrorCode(response: Response): Promise<string | null> {
    const payload = await readErrorPayload(response.clone());
    return typeof payload.code === 'string' ? payload.code : null;
}
