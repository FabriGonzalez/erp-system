type ApiFetchOptions = {
    ignoreUnauthorized?: boolean;
};

type UnauthorizedHandler = () => void;

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
        unauthorizedHandler?.();
    }

    return response;
}
