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
import { Branch, BranchRequest } from '@/types/branch';

const ACTIVE_BRANCH_STORAGE_KEY = '@erp/active-branch-id';

type BranchState = {
    activeBranch: Branch | null;
    availableBranches: Branch[];
    allBranches: Branch[];
    isLoading: boolean;
    hasFetchedUserBranches: boolean;
    error: string | null;

    setActiveBranch: (branch: Branch) => Promise<void>;
    clearActiveBranch: () => Promise<void>;
    selectAndEnsureAssigned: (branch: Branch, userId: string, token: string) => Promise<void>;
    assignBranchToUser: (userId: string, branch: Branch, token: string, isCurrentAuthUser?: boolean) => Promise<void>;
    removeBranchFromUser: (userId: string, branchId: string, token: string, isCurrentAuthUser?: boolean) => Promise<void>;
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

    setActiveBranch: async (branch) => {
        set({ activeBranch: branch });
        try {
            await AsyncStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, branch.id);
        } catch {
            // AsyncStorage error ignored
        }
    },

    clearActiveBranch: async () => {
        set({
            activeBranch: null,
            availableBranches: [],
            allBranches: [],
            hasFetchedUserBranches: false,
            error: null,
        });
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
            await assignUserToBranch(userId, branch.id, token);

            if (isCurrentAuthUser) {
                const current = get().availableBranches;
                if (!current.some((b) => b.id === branch.id)) {
                    set({ availableBranches: [...current, branch] });
                }
            }
        } catch (err: any) {
            const message = err?.message || 'Error al asignar la sucursal al usuario.';
            set({ error: message });
            throw err;
        }
    },

    removeBranchFromUser: async (userId, branchId, token, isCurrentAuthUser = false) => {
        try {
            await removeUserFromBranch(userId, branchId, token);

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
        } catch (err: any) {
            const message = err?.message || 'Error al remover la sucursal del usuario.';
            set({ error: message });
            throw err;
        }
    },

    hydrateActiveBranch: async (branches) => {
        try {
            const savedBranchId = await AsyncStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
            const activeOnly = branches.filter((b) => b.active !== false);

            if (savedBranchId) {
                const match = activeOnly.find((b) => b.id === savedBranchId);
                if (match) {
                    set({ activeBranch: match });
                    return match;
                }
                // Si la guardada ya no está asignada o quedó inactiva, limpiar
                await AsyncStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
            }

            // Si hay exactamente una sucursal activa asignada, se selecciona por defecto
            if (activeOnly.length === 1) {
                const single = activeOnly[0];
                await AsyncStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, single.id);
                set({ activeBranch: single });
                return single;
            }

            // Si no hay asignadas o hay varias sin selección previa, resetear activeBranch
            set({ activeBranch: null });
        } catch {
            // AsyncStorage error ignored
        }

        return null;
    },

    fetchUserBranches: async (userId, token) => {
        set({ isLoading: true, error: null });
        try {
            const branches = await getUserBranches(userId, token);
            set({
                availableBranches: branches,
                hasFetchedUserBranches: true,
                isLoading: false,
            });
            await get().hydrateActiveBranch(branches);
            return branches;
        } catch (err: any) {
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
        try {
            const newBranch = await createBranch(data, token);
            const currentAll = get().allBranches;
            set({
                allBranches: [...currentAll, newBranch],
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
            const currentAvailable = get().availableBranches.map((b) =>
                b.id === id ? updated : b
            );

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
        } catch (err: any) {
            const message = err?.message || 'Error al cambiar estado de la sucursal.';
            set({ error: message, isLoading: false });
            throw err;
        }
    },
}));
