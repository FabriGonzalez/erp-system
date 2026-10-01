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

    login: (response: LoginResponse) => Promise<void>;
    hydrate: () => Promise<void>;
    logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isHydrated: false,

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

        await AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify(session)
        );

        set({
            user,
            token: response.token,
            isHydrated: true,
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

            set({
                token: session.token,
                user: session.user,
                isHydrated: true,
            });
        } catch {
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);

            set({
                user: null,
                token: null,
                isHydrated: true,
            });
        }
    },

    logout: async () => {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await useBranchStore.getState().clearActiveBranch();

        set({
            user: null,
            token: null,
        });
    },
}));