import { queryClient } from '@/services/query-client';

/**
 * Claves de caché de usuarios y roles. Van aparte de los hooks para que componentes que no
 * usan TanStack (como BranchUsersAssignmentModal) puedan invalidarlas.
 */
export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    detail: (id: string) => [...userKeys.all, 'detail', id] as const,
    branches: (id: string) => [...userKeys.all, 'branches', id] as const,
};

export const roleKeys = {
    all: ['roles'] as const,
    list: () => [...roleKeys.all, 'list'] as const,
    detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
    permissions: () => [...roleKeys.all, 'permissions'] as const,
};

/** Tras asignar o quitar una sucursal a un usuario. */
export function invalidateUserBranches(userId: string) {
    void queryClient.invalidateQueries({ queryKey: userKeys.branches(userId) });
}
