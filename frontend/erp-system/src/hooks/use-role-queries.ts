import { useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/services/query-client';
import {
    createRole,
    getAssignablePermissions,
    getRole,
    getRoles,
    setRoleActive,
    updateRole,
} from '@/services/role-service';
import { useAuthStore } from '@/stores/auth-store';
import { Role, RoleRequest } from '@/types/role';

import { errorText, requireToken } from './use-paged-list';
import { roleKeys, userKeys } from './user-keys';

function useHasSession() {
    return useAuthStore((state) => Boolean(state.token));
}

// --- Consultas ---

export function useRoles() {
    const hasSession = useHasSession();
    const result = useQuery({
        queryKey: roleKeys.list(),
        queryFn: () => getRoles(requireToken()),
        enabled: hasSession,
    });

    return {
        roles: result.data ?? [],
        isLoading: result.isPending && hasSession,
        isRefreshing: result.isRefetching,
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

export function useRole(id: string | undefined) {
    const hasSession = useHasSession();
    const enabled = hasSession && Boolean(id);
    const result = useQuery({
        queryKey: roleKeys.detail(id ?? ''),
        queryFn: () => getRole(id as string, requireToken()),
        enabled,
    });

    return {
        role: result.data ?? null,
        isLoading: result.isPending && enabled,
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

/** La lista de permisos solo cambia con un deploy del backend. */
export function useAssignablePermissions() {
    const hasSession = useHasSession();
    const result = useQuery({
        queryKey: roleKeys.permissions(),
        queryFn: () => getAssignablePermissions(requireToken()),
        enabled: hasSession,
        staleTime: Infinity,
    });

    return {
        permissions: result.data ?? [],
        isLoading: result.isPending && hasSession,
        error: errorText(result.error),
        reload: () => void result.refetch(),
    };
}

// --- Mutaciones ---

/**
 * Un rol cambia lo que muestran los usuarios (nombre del rol) y, si es el de la sesión,
 * los permisos propios: se releen ambos.
 */
function refreshAfterRoleChange(role: Role) {
    queryClient.setQueryData(roleKeys.detail(role.id), role);
    void queryClient.invalidateQueries({ queryKey: roleKeys.list() });
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
    void useAuthStore.getState().refreshUser();
}

export function useCreateRole() {
    return useMutation({
        mutationFn: (values: RoleRequest) => createRole(values, requireToken()),
        onSuccess: refreshAfterRoleChange,
    });
}

export function useUpdateRole(id: string) {
    return useMutation({
        mutationFn: (values: RoleRequest) => updateRole(id, values, requireToken()),
        onSuccess: refreshAfterRoleChange,
    });
}

export function useSetRoleActive(id: string) {
    return useMutation({
        mutationFn: (active: boolean) => setRoleActive(id, active, requireToken()),
        onSuccess: refreshAfterRoleChange,
    });
}
