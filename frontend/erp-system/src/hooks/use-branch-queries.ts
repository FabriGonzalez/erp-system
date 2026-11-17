import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

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
import { queryClient } from '@/services/query-client';
import { getBranchUsers } from '@/services/user-service';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { showToast } from '@/stores/toast-store';
import { Branch, BranchRequest } from '@/types/branch';
import { CompanyUser } from '@/types/user';

import { orderKeys } from './use-order-queries';
import { errorText, requireToken } from './use-paged-list';
import { reportKeys } from './use-report-queries';
import { userKeys } from './user-keys';

/**
 * Claves de caché de sucursales. La sucursal activa no está acá: es estado del cliente
 * (branch-store) y se deriva de mine() por id.
 */
export const branchKeys = {
    all: ['branches'] as const,
    // Las de la empresa (activas e inactivas).
    list: () => [...branchKeys.all, 'list'] as const,
    // Las asignadas y activas del usuario de la sesión: entre ellas se elige la activa.
    mine: (userId: string) => [...branchKeys.all, 'mine', userId] as const,
    users: (branchId: string) => [...branchKeys.all, 'users', branchId] as const,
};

// --- Consultas ---

/**
 * Sucursales en las que el usuario puede operar. Una inactiva cuenta como no asignada (el
 * backend tampoco deja operar en ella). Se vuelven a pedir al volver al frente (TanStack).
 */
export function useMyBranches() {
    const userId = useAuthStore((state) => (state.token ? state.user?.id : undefined));
    const result = useQuery({
        queryKey: branchKeys.mine(userId ?? ''),
        queryFn: async () => {
            const branches = await getUserBranches(userId as string, requireToken());
            return branches.filter((branch) => branch.active !== false);
        },
        enabled: Boolean(userId),
        // Un admin pudo desasignarla o desactivarla mientras tanto: se relee siempre al volver.
        refetchOnWindowFocus: 'always',
    });

    return {
        branches: result.data ?? [],
        // Ya se sabe cuáles son (aunque sean ninguna): recién ahí "sin sucursal" es real.
        isFetched: result.data !== undefined,
        isLoading: result.isPending && Boolean(userId),
        isRefreshing: result.isRefetching,
        error: result.data ? null : errorText(result.error),
        refresh: () => void result.refetch(),
    };
}

/** La sucursal en la que se opera, o null si no hay ninguna elegida o disponible. */
export function useActiveBranch(): Branch | null {
    const activeBranchId = useBranchStore((state) => state.activeBranchId);
    const { branches } = useMyBranches();
    return branches.find((branch) => branch.id === activeBranchId) ?? null;
}

/**
 * Mantiene la selección de acuerdo con las sucursales disponibles: al entrar restaura la
 * guardada (del mismo usuario y empresa) o toma la primera; si la elegida deja de estar
 * disponible, pasa a otra y lo avisa. Se monta una sola vez, en el layout de la app.
 */
export function useActiveBranchSync() {
    const { branches, isFetched } = useMyBranches();
    const activeBranchId = useBranchStore((state) => state.activeBranchId);
    const reconcile = useBranchStore((state) => state.reconcileActiveBranch);

    useEffect(() => {
        if (!isFetched) return;
        void reconcile(branches).then((result) => {
            if (result.kind !== 'replaced') return;
            showToast({
                type: 'info',
                message: result.branch
                    ? `Tu sucursal activa ya no está disponible. Ahora operás en ${result.branch.name}.`
                    : 'Tu sucursal activa ya no está disponible. Elegí otra en Más → Sucursal activa.',
            });
        });
    }, [branches, isFetched, activeBranchId, reconcile]);
}

/** Las de la empresa: Sucursales, destino de transferencias, ficha del usuario. */
export function useBranches() {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const result = useQuery({
        queryKey: branchKeys.list(),
        queryFn: () => getAllBranches(requireToken()),
        enabled: hasSession,
    });

    return {
        branches: result.data ?? [],
        isLoading: result.isPending && hasSession,
        isRefreshing: result.isRefetching,
        error: result.data ? null : errorText(result.error),
        refresh: () => void result.refetch(),
    };
}

/** Usuarios asignados a una sucursal (modal de asignación). */
export function useBranchUsers(branchId: string | undefined) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const enabled = hasSession && Boolean(branchId);
    const result = useQuery({
        queryKey: branchKeys.users(branchId ?? ''),
        queryFn: () => getBranchUsers(branchId as string, requireToken()),
        enabled,
    });

    return {
        users: result.data ?? [],
        isLoading: result.isPending && enabled,
        error: result.data ? null : errorText(result.error),
        refresh: () => void result.refetch(),
    };
}

// --- Mutaciones ---

function upsertBranch(branches: Branch[] | undefined, branch: Branch): Branch[] | undefined {
    if (!branches) return branches;
    return branches.some((item) => item.id === branch.id)
        ? branches.map((item) => (item.id === branch.id ? branch : item))
        : [...branches, branch];
}

function currentUserId(): string | undefined {
    return useAuthStore.getState().user?.id;
}

/**
 * Alta y edición. El backend asigna la sucursal nueva a quien la crea (y a quienes tienen
 * ACCEDER_TODAS_SUCURSALES): cambian las disponibles del usuario.
 */
export type SaveBranchInput = {
    // Sin id es un alta.
    id?: string;
    data: BranchRequest;
};

export function useSaveBranch() {
    return useMutation({
        mutationFn: ({ id, data }: SaveBranchInput) =>
            id ? updateBranch(id, data, requireToken()) : createBranch(data, requireToken()),
        onSuccess: (branch) => {
            queryClient.setQueryData<Branch[]>(branchKeys.list(), (current) => upsertBranch(current, branch));
            void queryClient.invalidateQueries({ queryKey: branchKeys.all });
            void queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}

export type SetBranchActiveInput = {
    id: string;
    active: boolean;
};

/**
 * Inactiva = no asignada para todos: cambian las disponibles de cada usuario, y los pedidos
 * y reportes de esa sucursal dejan de verse (o vuelven a verse).
 */
export function useSetBranchActive() {
    return useMutation({
        mutationFn: ({ id, active }: SetBranchActiveInput) =>
            active ? activateBranch(id, requireToken()) : deactivateBranch(id, requireToken()),
        onSuccess: (branch) => {
            queryClient.setQueryData<Branch[]>(branchKeys.list(), (current) => upsertBranch(current, branch));
            void queryClient.invalidateQueries({ queryKey: branchKeys.all });
            void queryClient.invalidateQueries({ queryKey: userKeys.all });
            void queryClient.invalidateQueries({ queryKey: orderKeys.all });
            void queryClient.invalidateQueries({ queryKey: reportKeys.all });
        },
    });
}

/**
 * Tras asignar o quitar una sucursal a un usuario: su ficha, los usuarios de la sucursal y,
 * si es uno mismo, sus sucursales disponibles (si le quitan la activa, la sincronización
 * pasa a otra).
 */
export function invalidateBranchAssignment(userId: string, branchId: string) {
    void queryClient.invalidateQueries({ queryKey: userKeys.branches(userId) });
    void queryClient.invalidateQueries({ queryKey: branchKeys.users(branchId) });
    if (userId === currentUserId()) {
        void queryClient.invalidateQueries({ queryKey: branchKeys.mine(userId) });
    }
}

export type ToggleBranchUserInput = {
    user: CompanyUser;
    assign: boolean;
};

/**
 * Switch del modal de asignación: se mueve enseguida (actualización optimista) y vuelve
 * atrás solo si el backend falla. Un 201/204 sin body es éxito.
 */
export function useToggleBranchUser(branchId: string) {
    return useMutation({
        mutationFn: ({ user, assign }: ToggleBranchUserInput) =>
            assign
                ? assignUserToBranch(user.id, branchId, requireToken())
                : removeUserFromBranch(user.id, branchId, requireToken()),
        onMutate: async ({ user, assign }) => {
            const key = branchKeys.users(branchId);
            // Una carga en curso no puede pisar el cambio optimista al terminar.
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<CompanyUser[]>(key);
            queryClient.setQueryData<CompanyUser[]>(key, (current = []) =>
                assign
                    ? [...current.filter((item) => item.id !== user.id), user]
                    : current.filter((item) => item.id !== user.id));
            return { previous };
        },
        onError: (_error, _input, context) => {
            queryClient.setQueryData(branchKeys.users(branchId), context?.previous);
        },
        onSettled: (_result, _error, { user }) => invalidateBranchAssignment(user.id, branchId),
    });
}

/**
 * "Usar como activa" desde Sucursales: si no la tiene asignada (un admin), primero se la
 * asigna. La lista de disponibles se actualiza antes de elegirla, así la sincronización no
 * la toma por una sucursal que ya no está.
 */
export function useSelectBranch() {
    return useMutation({
        mutationFn: async (branch: Branch) => {
            const userId = currentUserId();
            if (!userId) throw new Error('No hay sesión activa.');

            const mineKey = branchKeys.mine(userId);
            const mine = queryClient.getQueryData<Branch[]>(mineKey) ?? [];
            if (!mine.some((item) => item.id === branch.id)) {
                await assignUserToBranch(userId, branch.id, requireToken());
                queryClient.setQueryData<Branch[]>(mineKey, (current = []) => upsertBranch(current, branch));
                invalidateBranchAssignment(userId, branch.id);
            }
            await useBranchStore.getState().selectActiveBranch(branch.id);
        },
    });
}
