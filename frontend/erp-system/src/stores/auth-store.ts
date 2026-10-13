import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { setUnauthorizedHandler } from '@/services/api-client';
import { useBranchStore } from '@/stores/branch-store';
import { LoginResponse, User } from '@/types/auth';

const AUTH_STORAGE_KEY = '@erp/auth-session';

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
        const user: User = {
            id: String(response.id),
            name: `${response.firstName} ${response.lastName}`,
            email: response.email,
            role: response.roleName as User['role'],
            company: {
                id: String(response.companyId),
                name: response.companyName,
            },
            branches: [],
            permissions: response.permissions as User['permissions'],
        };

        const session: StoredSession = {
            token: response.token,
            user,
        };

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
                user: session.user,
                isHydrated: true,
                sessionExpired: false,
                isLoggingOut: false,
            });
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