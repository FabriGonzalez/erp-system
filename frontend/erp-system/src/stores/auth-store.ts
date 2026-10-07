import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { useBranchStore } from '@/stores/branch-store';
import { LoginResponse, User } from '@/types/auth';

const AUTH_STORAGE_KEY = '@erp/auth-session';

type StoredSession = {
    token: string;
    user: User;
};

type AuthState = {
    user: User | null;
    token: string | null;
    isHydrated: boolean;
    sessionExpired: boolean;
    isLoggingOut: boolean;

    login: (response: LoginResponse) => Promise<void>;
    hydrate: () => Promise<void>;
    expireSession: () => Promise<void>;
    logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isHydrated: false,
    sessionExpired: false,
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

    expireSession: async () => {
        const state = useAuthStore.getState();
        if (state.sessionExpired || state.isLoggingOut || !state.token) {
            return;
        }

        set({
            user: null,
            token: null,
            sessionExpired: true,
        });

        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await useBranchStore.getState().clearActiveBranch();
    },

    logout: async () => {
        set({ isLoggingOut: true });
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await useBranchStore.getState().clearActiveBranch();

        set({
            user: null,
            token: null,
            sessionExpired: false,
            isLoggingOut: false,
        });
    },
}));