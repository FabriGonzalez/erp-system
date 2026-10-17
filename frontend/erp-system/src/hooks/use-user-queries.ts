import { useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/services/query-client';
import { getUserBranches } from '@/services/branch-service';
import {
    createUser,
    getCompanyUsers,
    getUser,
    resetUserPassword,
    setUserActive,
    updateUser,
} from '@/services/user-service';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { Branch } from '@/types/branch';
import { CompanyUser } from '@/types/user';

import { errorText, requireToken } from './use-paged-list';
import { invalidateUserBranches, userKeys } from './user-keys';

function useHasSession() {
    return useAuthStore((state) => Boolean(state.token));
}

// --- Consultas ---

/** Todos los usuarios de la empresa (el backend no pagina); el filtro por estado es local. */
export function useCompanyUsers() {
    const hasSession = useHasSession();
    const result = useQuery({
        queryKey: userKeys.lists(),
        queryFn: () => getCompanyUsers(requireToken()),
        enabled: hasSession,
    });

    return {
        users: result.data ?? [],
        isLoading: result.isPending && hasSession,
        isRefreshing: result.isRefetching,
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

export function useCompanyUser(id: string | undefined) {
    const hasSession = useHasSession();
    const enabled = hasSession && Boolean(id);
    const result = useQuery({
        queryKey: userKeys.detail(id ?? ''),
        queryFn: () => getUser(id as string, requireToken()),
        enabled,
    });

    return {
        user: result.data ?? null,
        isLoading: result.isPending && enabled,
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

export function useUserBranches(userId: string | undefined) {
    const hasSession = useHasSession();
    const enabled = hasSession && Boolean(userId);
    const result = useQuery({
        queryKey: userKeys.branches(userId ?? ''),
        queryFn: () => getUserBranches(userId as string, requireToken()),
        enabled,
    });

    return {
        branches: result.data ?? [],
        isLoading: result.isPending && enabled,
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

// --- Mutaciones ---

/** Deja el detalle al día, relee el listado y, si es la propia cuenta, la sesión. */
function refreshAfterUserChange(user: CompanyUser) {
    queryClient.setQueryData(userKeys.detail(user.id), user);
    void queryClient.invalidateQueries({ queryKey: userKeys.lists() });

    if (useAuthStore.getState().user?.id === user.id) {
        void useAuthStore.getState().refreshUser();
    }
}

export type UserFormValues = {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
};

export function useCreateUser() {
    return useMutation({
        mutationFn: (values: UserFormValues & { password: string }) =>
            createUser({ ...values, roleId: Number(values.roleId) }, requireToken()),
        onSuccess: refreshAfterUserChange,
    });
}

export function useUpdateUser(id: string) {
    return useMutation({
        mutationFn: (values: UserFormValues) =>
            updateUser(id, { ...values, roleId: Number(values.roleId) }, requireToken()),
        onSuccess: refreshAfterUserChange,
    });
}

export function useSetUserActive(id: string) {
    return useMutation({
        mutationFn: (active: boolean) => setUserActive(id, active, requireToken()),
        onSuccess: refreshAfterUserChange,
    });
}

/** El backend responde 204: no hay datos del usuario que actualizar. */
export function useResetUserPassword(id: string) {
    return useMutation({
        mutationFn: (newPassword: string) => resetUserPassword(id, newPassword, requireToken()),
    });
}

/**
 * Asigna o quita una sucursal. Pasa por branch-store, que además ajusta las sucursales
 * de la sesión cuando el usuario es uno mismo.
 */
export function useToggleUserBranch(userId: string) {
    return useMutation({
        mutationFn: ({ branch, assign }: { branch: Branch; assign: boolean }) => {
            const token = requireToken();
            const isCurrentAuthUser = useAuthStore.getState().user?.id === userId;
            const store = useBranchStore.getState();
            return assign
                ? store.assignBranchToUser(userId, branch, token, isCurrentAuthUser)
                : store.removeBranchFromUser(userId, branch.id, token, isCurrentAuthUser);
        },
        // Se refleja en la caché enseguida, así el switch no vuelve atrás mientras se relee.
        onSuccess: (_result, { branch, assign }) => {
            queryClient.setQueryData<Branch[]>(userKeys.branches(userId), (current = []) =>
                assign
                    ? [...current.filter((item) => item.id !== branch.id), branch]
                    : current.filter((item) => item.id !== branch.id));
        },
        onSettled: () => invalidateUserBranches(userId),
    });
}
