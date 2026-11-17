import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { setUnauthorizedHandler } from '@/services/api-client';
import { getCurrentUser, refreshToken } from '@/services/auth-service';
import { clearServerCache } from '@/services/query-client';
import { useBranchStore } from '@/stores/branch-store';
import { CurrentUserResponse, LoginResponse, User } from '@/types/auth';

const AUTH_STORAGE_KEY = '@erp/auth-session';

// Solo se aplica la respuesta del último refresco pedido: si al volver la app al frente se
// piden dos seguidos, uno viejo que termine tarde no puede pisar al más nuevo.
let latestRefreshId = 0;

// El token dura 7 días y se renueva como mucho una vez por día mientras se use la app:
// solo quien no la abre en 7 días tiene que volver a entrar.
const TOKEN_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
let renewingToken = false;

function userFromSession(data: CurrentUserResponse, branches: User['branches']): User {
    return {
        id: String(data.id),
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        role: data.roleName ?? '',
        company: {
            id: String(data.companyId),
            name: data.companyName,
        },
        branches,
        permissions: data.permissions,
        // Un backend anterior no manda el campo: se asume que sí puede.
        canChangePassword: data.canChangePassword ?? true,
    };
}

type StoredSession = {
    token: string;
    user: User;
    /** Cuándo se recibió el token, con el reloj del dispositivo. Falta en sesiones anteriores. */
    tokenIssuedAt?: number;
};

export type SessionEndReason = 'expired' | 'company_suspended' | 'company_cancelled';

type AuthState = {
    user: User | null;
    token: string | null;
    tokenIssuedAt: number | null;
    isHydrated: boolean;
    sessionExpired: boolean;
    sessionEndReason: SessionEndReason;
    isLoggingOut: boolean;

    login: (response: LoginResponse) => Promise<void>;
    hydrate: () => Promise<void>;
    refreshUser: () => Promise<void>;
    expireSession: (reason?: SessionEndReason) => Promise<void>;
    replaceToken: (previousToken: string, token: string) => Promise<void>;
    logout: () => Promise<void>;
};

function reasonFromErrorCode(code: string | null): SessionEndReason {
    if (code === 'COMPANY_SUSPENDED') return 'company_suspended';
    if (code === 'COMPANY_CANCELLED') return 'company_cancelled';
    return 'expired';
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    tokenIssuedAt: null,
    isHydrated: false,
    sessionExpired: false,
    sessionEndReason: 'expired',
    isLoggingOut: false,

    login: async (response) => {
        const user = userFromSession(response, []);

        const session: StoredSession = {
            token: response.token,
            user,
            tokenIssuedAt: Date.now(),
        };

        // Nada cacheado de una sesión anterior puede verse en esta (otra empresa, otro usuario).
        clearServerCache();

        useBranchStore.getState().setSessionContext({
            userId: user.id,
            companyId: user.company.id,
        });

        await AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify(session)
        );

        set({
            user,
            token: response.token,
            tokenIssuedAt: session.tokenIssuedAt,
            isHydrated: true,
            sessionExpired: false,
            sessionEndReason: 'expired',
            isLoggingOut: false,
        });
    },

    hydrate: async () => {
        try {
            const storedSession = await AsyncStorage.getItem(
                AUTH_STORAGE_KEY
            );

            if (!storedSession) {
                set({ isHydrated: true });
                return;
            }

            const session: StoredSession = JSON.parse(storedSession);

            if (!session.token || !session.user) {
                await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
                set({ isHydrated: true });
                return;
            }

            useBranchStore.getState().setSessionContext({
                userId: session.user.id,
                companyId: session.user.company.id,
            });

            set({
                token: session.token,
                tokenIssuedAt: session.tokenIssuedAt ?? null,
                // Las sesiones guardadas antes de que existiera el campo no lo traen.
                user: { ...session.user, canChangePassword: session.user.canChangePassword ?? true },
                isHydrated: true,
                sessionExpired: false,
                isLoggingOut: false,
            });

            // La app arranca con los permisos guardados y los actualiza sin bloquear.
            void useAuthStore.getState().refreshUser();
        } catch {
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);

            set({
                user: null,
                token: null,
                tokenIssuedAt: null,
                isHydrated: true,
                sessionExpired: false,
                isLoggingOut: false,
            });
        }
    },

    /**
     * Trae el rol y los permisos vigentes (un admin puede haberlos cambiado) y renueva el
     * token si ya tiene un día. Si falla por red o 5xx se siguen usando los guardados; un
     * 401 ya expira la sesión en apiFetch.
     */
    refreshUser: async () => {
        const { token } = useAuthStore.getState();
        if (!token) {
            return;
        }

        const refreshId = ++latestRefreshId;
        let current: CurrentUserResponse;
        try {
            current = await getCurrentUser(token);
        } catch {
            return;
        }

        const { user, token: currentToken } = useAuthStore.getState();
        // Solo si sigue la misma sesión y es el último refresco pedido: si mientras tanto
        // se cerró, expiró, entró otro usuario o cambió el token, la respuesta se descarta.
        if (refreshId !== latestRefreshId || !user || currentToken !== token || user.id !== String(current.id)) {
            return;
        }

        const refreshed = userFromSession(current, user.branches);
        const { tokenIssuedAt } = useAuthStore.getState();
        set({ user: refreshed });
        await AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ token, user: refreshed, tokenIssuedAt: tokenIssuedAt ?? undefined } satisfies StoredSession)
        );

        await renewTokenIfOld(token);
    },

    expireSession: async (reason = 'expired') => {
        const state = useAuthStore.getState();
        if (state.sessionExpired || state.isLoggingOut || !state.token) {
            return;
        }

        set({
            user: null,
            token: null,
            tokenIssuedAt: null,
            sessionExpired: true,
            sessionEndReason: reason,
        });

        clearServerCache();
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await useBranchStore.getState().clearActiveBranch();
    },

    // Cambiar la contraseña revoca los tokens anteriores y el backend devuelve uno nuevo;
    // también se usa al renovar la sesión.
    replaceToken: async (previousToken, token) => {
        const { user, token: currentToken } = useAuthStore.getState();
        // Solo si sigue la misma sesión que hizo el pedido: si mientras tanto expiró,
        // se cerró o entró otro usuario, el token nuevo no debe pisar ese estado.
        if (!user || currentToken !== previousToken) {
            return;
        }

        const tokenIssuedAt = Date.now();
        set({ token, tokenIssuedAt });
        await AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ token, user, tokenIssuedAt } satisfies StoredSession)
        );
    },

    logout: async () => {
        set({ isLoggingOut: true });
        clearServerCache();
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await useBranchStore.getState().clearActiveBranch();

        set({
            user: null,
            token: null,
            tokenIssuedAt: null,
            sessionExpired: false,
            sessionEndReason: 'expired',
            isLoggingOut: false,
        });
    },
}));

/**
 * Sesión deslizante: pide un token nuevo si el actual se recibió hace más de un día (o no se
 * sabe cuándo, en sesiones guardadas antes). Un fallo de red o un backend sin el endpoint
 * deja el token como está; replaceToken descarta la respuesta si mientras tanto cambió la sesión.
 */
async function renewTokenIfOld(token: string) {
    const { tokenIssuedAt } = useAuthStore.getState();
    const age = tokenIssuedAt === null ? Infinity : Date.now() - tokenIssuedAt;
    // Una edad negativa es un reloj atrasado después de recibirlo: se renueva igual.
    if (renewingToken || (age >= 0 && age < TOKEN_RENEW_AFTER_MS)) {
        return;
    }

    renewingToken = true;
    try {
        const response = await refreshToken(token);
        await useAuthStore.getState().replaceToken(token, response.token);
    } catch {
        // Se reintenta en el próximo refreshUser.
    } finally {
        renewingToken = false;
    }
}

// Un 401 de cualquier request autenticada expira la sesión. expireSession ya
// ignora el caso sin token, el logout voluntario y los 401 repetidos.
setUnauthorizedHandler((code) => {
    void useAuthStore.getState().expireSession(reasonFromErrorCode(code));
});