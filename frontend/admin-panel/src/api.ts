import type {
    Company,
    CompanyStatus,
    LoginResponse,
    ProvisionCompanyRequest,
    ProvisionCompanyResponse,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
    readonly status: number;
    readonly code: string | null;

    constructor(message: string, status: number, code: string | null) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

type ErrorPayload = { message?: string; code?: string };

async function request<T>(path: string, init: RequestInit, token?: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, { ...init, headers });

    if (!response.ok) {
        let payload: ErrorPayload = {};
        try {
            payload = await response.json();
        } catch {
            // Respuesta sin JSON.
        }
        throw new ApiError(errorMessage(response, payload), response.status, payload.code ?? null);
    }

    if (response.status === 204) {
        return undefined as T;
    }
    return response.json() as Promise<T>;
}

function errorMessage(response: Response, payload: ErrorPayload): string {
    switch (payload.code) {
        case 'INVALID_CREDENTIALS':
            return 'Usuario o contraseña incorrectos.';
        case 'TOO_MANY_LOGIN_ATTEMPTS': {
            const minutes = Math.ceil(Number(response.headers.get('Retry-After') ?? 900) / 60);
            return `Demasiados intentos fallidos. Probá de nuevo en ${minutes} min.`;
        }
        case 'INVALID_COMPANY_STATUS_TRANSITION':
            return 'Ese cambio de estado no está permitido.';
    }
    if (response.status === 401) return 'La sesión expiró. Volvé a ingresar.';
    if (response.status === 403) return 'Esta cuenta no tiene permisos de administrador de plataforma.';
    if (response.status >= 500) return 'Error del servidor.';
    // 400/409: el backend explica el problema (campo inválido, nombre o email duplicado).
    return payload.message || `Error ${response.status}`;
}

export function login(username: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export function listCompanies(token: string): Promise<Company[]> {
    return request<Company[]>('/api/v1/provisioning/companies', { method: 'GET' }, token);
}

export function provisionCompany(
    body: ProvisionCompanyRequest,
    token: string
): Promise<ProvisionCompanyResponse> {
    return request<ProvisionCompanyResponse>(
        '/api/v1/provisioning/companies',
        { method: 'POST', body: JSON.stringify(body) },
        token
    );
}

export function changeCompanyStatus(
    companyId: number,
    status: CompanyStatus,
    reason: string | null,
    token: string
): Promise<Company> {
    return request<Company>(
        `/api/v1/provisioning/companies/${companyId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status, reason }) },
        token
    );
}
