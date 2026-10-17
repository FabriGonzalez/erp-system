import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { setUnauthorizedHandler } from '@/services/api-client';
import { getCurrentUser } from '@/services/auth-service';
import { clearServerCache } from '@/services/query-client';
import { useBranchStore } from '@/stores/branch-store';
import { CurrentUserResponse, LoginResponse, User } from '@/types/auth';

const AUTH_STORAGE_KEY = '@erp/auth-session';

// Solo se aplica la respuesta del último refresco pedido: si al volver la app al frente se
// piden dos seguidos, uno viejo que termine tarde no puede pisar al más nuevo.
let latestRefreshId = 0;

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
};

export type SessionEndReason = 'expired' | 'company_suspended' | 'company_cancelled';

type AuthState = {
    user: User | null;
    token: string | null;
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
    isHydrated: false,
    sessionExpired: false,
    sessionEndReason: 'expired',
    isLoggingOut: false,

    login: async (response) => {
        const user = userFromSession(response, []);

        const session: StoredSession = {
            token: response.token,
            user,
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
                isHydrated: true,
                sessionExpired: false,
                isLoggingOut: false,
            });
        }
    },

    /**
     * Trae el rol y los permisos vigentes (un admin puede haberlos cambiado). Si falla por
     * red o 5xx se siguen usando los guardados; un 401 ya expira la sesión en apiFetch.
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
        set({ user: refreshed });
        await AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ token, user: refreshed } satisfies StoredSession)
        );
    },

    expireSession: async (reason = 'expired') => {
        const state = useAuthStore.getState();
        if (state.sessionExpired || state.isLoggingOut || !state.token) {
            return;
        }

        set({
            user: null,
            token: null,
            sessionExpired: true,
            sessionEndReason: reason,
        });

        clearServerCache();
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await useBranchStore.getState().clearActiveBranch();
    },

    // Cambiar la contraseña revoca los tokens anteriores; el backend devuelve uno nuevo.
    replaceToken: async (previousToken, token) => {
        const { user, token: currentToken } = useAuthStore.getState();
        // Solo si sigue la misma sesión que hizo el pedido: si mientras tanto expiró,
        // se cerró o entró otro usuario, el token nuevo no debe pisar ese estado.
        if (!user || currentToken !== previousToken) {
            return;
        }

        set({ token });
        await AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ token, user } satisfies StoredSession)
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
            sessionExpired: false,
            sessionEndReason: 'expired',
            isLoggingOut: false,
        });
    },
}));

// Un 401 de cualquier request autenticada expira la sesión. expireSession ya
// ignora el caso sin token, el logout voluntario y los 401 repetidos.
setUnauthorizedHandler((code) => {
    void useAuthStore.getState().expireSession(reasonFromErrorCode(code));
});