/** RoleResponse del backend (/api/v1/roles). */
export type RoleResponse = {
    id: number | string;
    name: string;
    code: string;
    description: string | null;
    permissions: string[] | null;
    system: boolean;
    active: boolean;
};

/**
 * Rol de la empresa. Los permisos quedan como string: la lista la da el backend
 * (GET /roles/permissions) y puede traer alguno que el frontend todavía no conoce.
 */
export type Role = {
    id: string;
    name: string;
    code: string;
    description: string;
    permissions: string[];
    /** Rol creado al dar de alta la empresa ("Administrador"): no se puede editar ni desactivar. */
    system: boolean;
    active: boolean;
};

export type RoleRequest = {
    name: string;
    code: string;
    description: string | null;
    permissions: string[];
};
