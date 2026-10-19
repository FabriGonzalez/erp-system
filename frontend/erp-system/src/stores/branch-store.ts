import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
    activateBranch,
    assignUserToBranch,
    createBranch,
    deactivateBranch,
    getAllBranches,
    getUserBranches,
    removeUserFromBranch,
    updateBranch,
} from '@/services/branch-service';
import type { UserResponse } from '@/types/user';
import { Branch, BranchRequest } from '@/types/branch';

const ACTIVE_BRANCH_STORAGE_KEY = '@erp/active-branch';

type BranchSessionContext = {
    userId: string;
    companyId: string;
};

type StoredActiveBranch = {
    branchId: string;
    userId: string;
    companyId: string;
};

type BranchState = {
    activeBranch: Branch | null;
    availableBranches: Branch[];
    allBranches: Branch[];
    isLoading: boolean;
    hasFetchedUserBranches: boolean;
    error: string | null;
    sessionContext: BranchSessionContext | null;
    activeBranchVersion: number;

    setSessionContext: (context: BranchSessionContext) => void;
    setActiveBranch: (branch: Branch) => Promise<void>;
    clearActiveBranch: () => Promise<void>;
    selectAndEnsureAssigned: (branch: Branch, userId: string, token: string) => Promise<void>;
    assignBranchToUser: (userId: string, branch: Branch, token: string, isCurrentAuthUser?: boolean) => Promise<UserResponse | null>;
    removeBranchFromUser: (userId: string, branchId: string, token: string, isCurrentAuthUser?: boolean) => Promise<UserResponse | null>;
    fetchUserBranches: (userId: string, token: string) => Promise<Branch[]>;
    fetchAllBranches: (token: string, active?: boolean) => Promise<Branch[]>;
    createBranch: (data: BranchRequest, token: string) => Promise<Branch>;
    updateBranch: (id: string, data: BranchRequest, token: string) => Promise<Branch>;
    toggleBranchActive: (id: string, currentActive: boolean, token: string) => Promise<void>;
    hydrateActiveBranch: (branches: Branch[]) => Promise<Branch | null>;
};

export const useBranchStore = create<BranchState>((set, get) => ({
    activeBranch: null,
    availableBranches: [],
    allBranches: [],
    isLoading: false,
    hasFetchedUserBranches: false,
    error: null,
    sessionContext: null,
    activeBranchVersion: 0,

    setSessionContext: (context) => {
        set((state) => ({
            sessionContext: context,
            activeBranch: null,
            availableBranches: [],
            allBranches: [],
            hasFetchedUserBranches: false,
            error: null,
            activeBranchVersion: state.activeBranchVersion + 1,
        }));
    },

    setActiveBranch: async (branch) => {
        set((state) => ({
            activeBranch: branch,
            availableBranches: state.availableBranches.map((item) =>
                item.id === branch.id ? branch : item
            ),
            allBranches: state.allBranches.map((item) =>
                item.id === branch.id ? branch : item
            ),
            activeBranchVersion: state.activeBranchVersion + 1,
        }));
        try {
            const context = get().sessionContext;
            if (context) {
                const storedBranch: StoredActiveBranch = {
                    branchId: branch.id,
                    ...context,
                };
                await AsyncStorage.setItem(
                    ACTIVE_BRANCH_STORAGE_KEY,
                    JSON.stringify(storedBranch)
                );
            }
        } catch {
            // AsyncStorage error ignored
        }
    },

    clearActiveBranch: async () => {
        set((state) => ({
            activeBranch: null,
            availableBranches: [],
            allBranches: [],
            hasFetchedUserBranches: false,
            error: null,
            sessionContext: null,
            activeBranchVersion: state.activeBranchVersion + 1,
        }));
        try {
            await AsyncStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
        } catch {
            // AsyncStorage error ignored
        }
    },

    selectAndEnsureAssigned: async (branch, userId, token) => {
        try {
            const isAlreadyAssigned = get().availableBranches.some((b) => b.id === branch.id);

            if (!isAlreadyAssigned) {
                await assignUserToBranch(userId, branch.id, token);
                const updatedAvailable = [...get().availableBranches, branch];
                set({ availableBranches: updatedAvailable });
            }

            await get().setActiveBranch(branch);
        } catch (err: any) {
            const message = err?.message || 'Error al seleccionar y asignar la sucursal.';
            set({ error: message });
            throw err;
        }
    },

    assignBranchToUser: async (userId, branch, token, isCurrentAuthUser = false) => {
        try {
            const assignedUser = await assignUserToBranch(userId, branch.id, token);

            // Una sucursal inactiva no es elegible aunque quede asignada.
            if (isCurrentAuthUser && branch.active !== false) {
                const current = get().availableBranches;
                if (!current.some((b) => b.id === branch.id)) {
                    set({ availableBranches: [...current, branch] });
                }
            }

            return assignedUser;
        } catch (err: any) {
            const message = err?.message || 'Error al asignar la sucursal al usuario.';
            set({ error: message });
            throw err;
        }
    },

    removeBranchFromUser: async (userId, branchId, token, isCurrentAuthUser = false) => {
        try {
            const removedUser = await removeUserFromBranch(userId, branchId, token);

            if (isCurrentAuthUser) {
                const updatedAvailable = get().availableBranches.filter((b) => b.id !== branchId);
                let newActive = get().activeBranch;

                if (newActive?.id === branchId) {
                    newActive = null;
                    try {
                        await AsyncStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
                    } catch {
                        // Ignore
                    }
                }

                set({
                    availableBranches: updatedAvailable,
                    activeBranch: newActive,
                });
            }

            return removedUser;
        } catch (err: any) {
            const message = err?.message || 'Error al remover la sucursal del usuario.';
            set({ error: message });
            throw err;
        }
    },

    hydrateActiveBranch: async (branches) => {
        try {
            const hydrationVersion = get().activeBranchVersion;
            const savedBranchId = await AsyncStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
            if (get().activeBranchVersion !== hydrationVersion) {
                return get().activeBranch;
            }
            const activeOnly = branches.filter(
                (branch) =>
                    branch.active !== false &&
                    (!get().sessionContext ||
                        !branch.companyId ||
                        branch.companyId === get().sessionContext?.companyId)
            );
            const context = get().sessionContext;
            let parsedSavedBranch: StoredActiveBranch | null = null;

            if (savedBranchId) {
                try {
                    parsedSavedBranch = JSON.parse(savedBranchId) as StoredActiveBranch;
                } catch {
                    // Migrate the previous raw branch ID format below.
                }
            }

            const savedBranchMatchesSession =
                parsedSavedBranch &&
                context &&
                parsedSavedBranch.userId === context.userId &&
                parsedSavedBranch.companyId === context.companyId;
            const persistedBranchId = parsedSavedBranch
                ? savedBranchMatchesSession
                    ? parsedSavedBranch.branchId
                    : null
                : savedBranchId;
            const match = persistedBranchId
                ? activeOnly.find((branch) => branch.id === persistedBranchId)
                : undefined;

            if (match) {
                if (get().activeBranchVersion !== hydrationVersion) {
                    return get().activeBranch;
                }
                set({ activeBranch: match });
                return match;
            }

            await AsyncStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);

            if (activeOnly.length > 0) {
                if (get().activeBranchVersion !== hydrationVersion) {
                    return get().activeBranch;
                }
                const firstAvailable = activeOnly[0];
                await get().setActiveBranch(firstAvailable);
                return firstAvailable;
            }

            set({ activeBranch: null });
        } catch {
            // AsyncStorage error ignored
        }

        return null;
    },

    fetchUserBranches: async (userId, token) => {
        const context = get().sessionContext;
        const version = get().activeBranchVersion;
        set({ isLoading: true, error: null });
        try {
            const response = await getUserBranches(userId, token);
            // Se vuelve a pedir al volver al frente: una respuesta de otra sesión no se aplica.
            if (get().sessionContext !== context) {
                return get().availableBranches;
            }
            // Una sucursal inactiva cuenta como no asignada (el backend tampoco deja operar en ella).
            const branches = response.filter((branch) => branch.active !== false);
            set({
                availableBranches: branches,
                hasFetchedUserBranches: true,
                isLoading: false,
            });
            // Si el usuario eligió otra sucursal mientras tanto, su selección manda.
            if (get().activeBranchVersion === version) {
                await get().hydrateActiveBranch(branches);
            }
            return branches;
        } catch (err: any) {
            if (get().sessionContext !== context) {
                throw err;
            }
            const message = err?.message || 'Error al obtener sucursales del usuario.';
            set({ error: message, isLoading: false, hasFetchedUserBranches: true });
            throw err;
        }
    },

    fetchAllBranches: async (token, active) => {
        set({ isLoading: true, error: null });
        try {
            const branches = await getAllBranches(token, active);
            set({ allBranches: branches, isLoading: false });
            return branches;
        } catch (err: any) {
            const message = err?.message || 'Error al obtener sucursales.';
            set({ error: message, isLoading: false });
            throw err;
        }
    },

    createBranch: async (data, token) => {
        set({ isLoading: true, error: null });
        const context = get().sessionContext;
        try {
            const newBranch = await createBranch(data, token);
            const currentAll = get().allBranches;
            // El backend asigna la sucursal nueva a quien la crea: ya es elegible como activa.
            // Si mientras tanto cambió la sesión, la lista es de otro usuario y no se toca.
            const sameSession = get().sessionContext === context;
            const currentAvailable = get().availableBranches;
            set({
                allBranches: [...currentAll, newBranch],
                ...(sameSession && !currentAvailable.some((b) => b.id === newBranch.id)
                    ? { availableBranches: [...currentAvailable, newBranch] }
                    : {}),
                isLoading: false,
            });
            return newBranch;
        } catch (err: any) {
            const message = err?.message || 'Error al crear la sucursal.';
            set({ error: message, isLoading: false });
            throw err;
        }
    },

    updateBranch: async (id, data, token) => {
        set({ isLoading: true, error: null });
        try {
            const updated = await updateBranch(id, data, token);
            const currentAll = get().allBranches.map((b) =>
                b.id === id ? updated : b
            );
            const currentAvailable = get().availableBranches.map((b) =>
                b.id === id ? updated : b
            );

            let newActive = get().activeBranch;
            if (newActive?.id === id) {
                newActive = updated;
            }

            set({
                allBranches: currentAll,
                availableBranches: currentAvailable,
                activeBranch: newActive,
                isLoading: false,
            });

            return updated;
        } catch (err: any) {
            const message = err?.message || 'Error al actualizar la sucursal.';
            set({ error: message, isLoading: false });
            throw err;
        }
    },

    toggleBranchActive: async (id, currentActive, token) => {
        set({ isLoading: true, error: null });
        try {
            const updated = currentActive
                ? await deactivateBranch(id, token)
                : await activateBranch(id, token);

            const currentAll = get().allBranches.map((b) =>
                b.id === id ? updated : b
            );
            // Inactiva = no asignada: deja de ser elegible como sucursal activa.
            const currentAvailable = get().availableBranches
                .map((b) => (b.id === id ? updated : b))
                .filter((b) => b.active !== false);

            let newActive = get().activeBranch;
            if (newActive?.id === id && !updated.active) {
                // Si la sucursal activa fue desactivada para la empresa, deseleccionarla
                newActive = null;
                try {
                    await AsyncStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
                } catch {
                    // Ignore
                }
            }

            set({
                allBranches: currentAll,
                availableBranches: currentAvailable,
                activeBranch: newActive,
                isLoading: false,
            });

            // Al reactivarla vuelve a ser elegible solo si el usuario la tiene asignada:
            // eso lo sabe el backend, así que se releen sus sucursales.
            const context = get().sessionContext;
            if (updated.active && context) {
                get().fetchUserBranches(context.userId, token).catch(() => {});
            }
        } catch (err: any) {
            const message = err?.message || 'Error al cambiar estado de la sucursal.';
            set({ error: message, isLoading: false });
            throw err;
        }
    },
}));
