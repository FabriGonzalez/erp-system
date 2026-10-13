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
    const response = await fetch(input, init);

    if (response.status === 401 && !options?.ignoreUnauthorized) {
        unauthorizedHandler?.(await readErrorCode(response));
    }

    return response;
}

/** Lee el campo code del ErrorResponse sin consumir el body que usa el llamador. */
export async function readErrorCode(response: Response): Promise<string | null> {
    try {
        const payload = await response.clone().json();
        return typeof payload?.code === 'string' ? payload.code : null;
    } catch {
        // Body vacío o no JSON.
        return null;
    }
}
