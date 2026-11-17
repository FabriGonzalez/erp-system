import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { Branch } from '@/types/branch';

const ACTIVE_BRANCH_STORAGE_KEY = '@erp/active-branch';
// Formato anterior (solo el id, sin usuario ni empresa): se borra al restaurar.
const LEGACY_ACTIVE_BRANCH_STORAGE_KEY = '@erp/active-branch-id';

type BranchSessionContext = {
    userId: string;
    companyId: string;
};

type StoredActiveBranch = {
    branchId: string;
    userId: string;
    companyId: string;
};

export type ReconcileResult =
    | { kind: 'unchanged' }
    | { kind: 'restored'; branch: Branch }
    // La elegida dejó de estar disponible (desactivada o desasignada) y se pasó a otra.
    | { kind: 'replaced'; previousId: string; branch: Branch | null };

type BranchState = {
    /**
     * Sucursal en la que se opera. Es estado del cliente: la lista de sucursales viene del
     * servidor (useMyBranches) y la sucursal se deriva de ella por id (useActiveBranch), así
     * un renombre o una desactivación se ven sin copiar nada a mano.
     */
    activeBranchId: string | null;
    sessionContext: BranchSessionContext | null;
    // Sube con cada selección o cambio de sesión: una restauración que termina tarde no pisa
    // una selección más nueva ni escribe en la persistencia de otra sesión.
    selectionVersion: number;

    setSessionContext: (context: BranchSessionContext) => void;
    selectActiveBranch: (branchId: string) => Promise<void>;
    clearActiveBranch: () => Promise<void>;
    /** Ajusta la selección a las sucursales disponibles del usuario (asignadas y activas). */
    reconcileActiveBranch: (branches: Branch[]) => Promise<ReconcileResult>;
};

async function persist(branchId: string, context: BranchSessionContext | null) {
    if (!context) return;
    try {
        const stored: StoredActiveBranch = { branchId, ...context };
        await AsyncStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, JSON.stringify(stored));
    } catch {
        // Sin persistencia la selección vale igual para esta sesión.
    }
}

async function readStoredBranchId(context: BranchSessionContext | null): Promise<string | null> {
    try {
        const raw = await AsyncStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
        if (!raw || !context) return null;
        const stored = JSON.parse(raw) as Partial<StoredActiveBranch>;
        // Nunca se restaura la sucursal de otro usuario u otra empresa.
        return stored.userId === context.userId && stored.companyId === context.companyId
            ? stored.branchId ?? null
            : null;
    } catch {
        return null;
    }
}

export const useBranchStore = create<BranchState>((set, get) => ({
    activeBranchId: null,
    sessionContext: null,
    selectionVersion: 0,

    setSessionContext: (context) => {
        set((state) => ({
            sessionContext: context,
            activeBranchId: null,
            selectionVersion: state.selectionVersion + 1,
        }));
    },

    selectActiveBranch: async (branchId) => {
        set((state) => ({
            activeBranchId: branchId,
            selectionVersion: state.selectionVersion + 1,
        }));
        await persist(branchId, get().sessionContext);
    },

    clearActiveBranch: async () => {
        set((state) => ({
            activeBranchId: null,
            sessionContext: null,
            selectionVersion: state.selectionVersion + 1,
        }));
        try {
            await AsyncStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
        } catch {
            // Al volver a entrar se valida contra la sesión igual.
        }
    },

    reconcileActiveBranch: async (branches) => {
        const { activeBranchId: currentId, selectionVersion: version, sessionContext: context } = get();
        if (currentId && branches.some((branch) => branch.id === currentId)) {
            return { kind: 'unchanged' };
        }

        const storedId = currentId ? null : await readStoredBranchId(context);
        // Mientras se leía la persistencia el usuario eligió otra o cambió la sesión: manda eso.
        if (get().selectionVersion !== version || get().sessionContext !== context) {
            return { kind: 'unchanged' };
        }

        const next = branches.find((branch) => branch.id === storedId) ?? branches[0] ?? null;
        set((state) => ({
            activeBranchId: next?.id ?? null,
            selectionVersion: state.selectionVersion + 1,
        }));

        try {
            await AsyncStorage.removeItem(LEGACY_ACTIVE_BRANCH_STORAGE_KEY);
            if (next) {
                await persist(next.id, context);
            } else {
                await AsyncStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
            }
        } catch {
            // La selección en memoria ya quedó; la persistencia se reintenta en la próxima.
        }

        if (currentId) {
            return { kind: 'replaced', previousId: currentId, branch: next };
        }
        return next ? { kind: 'restored', branch: next } : { kind: 'unchanged' };
    },
}));
