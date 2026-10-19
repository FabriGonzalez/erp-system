/**
 * Errores de la API con mensajes en español. Los `message` del backend están en inglés y
 * son para logs/Swagger: nunca se muestran. El texto sale del `code` del ErrorResponse, del
 * status HTTP o del fallback de cada operación, en ese orden.
 */

export const NETWORK_ERROR = 'NETWORK_ERROR';

const NETWORK_MESSAGE = 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
const SERVER_MESSAGE = 'Error del servidor. Intentá de nuevo más tarde.';

/** Error con el status HTTP (0 = sin conexión): la caché no reintenta los 4xx (ver query-client). */
export class ApiError extends Error {
    readonly status: number;
    readonly code: string | null;

    constructor(message: string, status: number, code: string | null = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

export function networkError(): ApiError {
    return new ApiError(NETWORK_MESSAGE, 0, NETWORK_ERROR);
}

type ErrorPayload = {
    message?: string;
    code?: string;
};

/** Lee el ErrorResponse; consume el body (usar response.clone() si hace falta después). */
export async function readErrorPayload(response: Response): Promise<ErrorPayload> {
    try {
        const payload = await response.json();
        return payload && typeof payload === 'object' ? payload : {};
    } catch {
        // Body vacío o no JSON.
        return {};
    }
}

export type ErrorMessages = {
    /** Por `code` del backend; gana sobre el status. */
    byCode?: Record<string, string>;
    /** Por status HTTP, para los errores sin un `code` conocido. */
    byStatus?: Record<number, string>;
    /** Texto de la operación (p. ej. "No se pudo crear la sucursal."). */
    fallback: string;
};

// Comunes a todos los servicios; cada uno puede pisarlos.
const DEFAULT_BY_CODE: Record<string, string> = {
    VALIDATION_ERROR: 'Revisá los datos ingresados.',
    INVALID_PARAMETER: 'La consulta no es válida.',
};

const DEFAULT_BY_STATUS: Record<number, string> = {
    403: 'No tenés permisos para realizar esta acción.',
    429: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.',
};

/** Lo propio del servicio (code, después status) le gana a los textos comunes. */
export function errorMessageFor(status: number, code: string | null, messages: ErrorMessages): string {
    const serviceByCode = code ? messages.byCode?.[code] : undefined;
    if (serviceByCode) return serviceByCode;
    const serviceByStatus = messages.byStatus?.[status];
    if (serviceByStatus) return serviceByStatus;
    const commonByCode = code ? DEFAULT_BY_CODE[code] : undefined;
    if (commonByCode) return commonByCode;
    if (status >= 500) return SERVER_MESSAGE;
    return DEFAULT_BY_STATUS[status] ?? messages.fallback;
}

export async function toApiError(response: Response, messages: ErrorMessages): Promise<ApiError> {
    const payload = await readErrorPayload(response);
    const code = typeof payload.code === 'string' ? payload.code : null;
    return new ApiError(errorMessageFor(response.status, code, messages), response.status, code);
}

/**
 * Lanza ApiError si la respuesta no es 2xx; si no, devuelve el JSON. Un 2xx sin body
 * (201/204) devuelve undefined en lugar de fallar al parsear.
 */
export async function parseResponse<T>(response: Response, messages: ErrorMessages): Promise<T> {
    if (!response.ok) {
        throw await toApiError(response, messages);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
}
