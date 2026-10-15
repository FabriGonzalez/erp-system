import { Branch } from './branch';

export type Company = {
    id: string;
    name: string;
};

/** Espejo del enum Permission del backend (modules/roles/entity/Permission.java). */
export type Permission =
    | 'CREAR_PEDIDOS'
    | 'ADMINISTRAR_CLIENTES'
    | 'ADMINISTRAR_PRODUCTOS'
    | 'ADMINISTRAR_CATEGORIAS'
    | 'ADMINISTRAR_PRECIOS'
    | 'AJUSTAR_STOCK'
    | 'TRANSFERIR_STOCK'
    | 'ADMINISTRAR_USUARIOS'
    | 'VER_REPORTES'
    | 'CREAR_ENVIOS'
    | 'ACCEDER_TODAS_SUCURSALES'
    | 'VER_PEDIDOS'
    | 'PREPARAR_PEDIDOS'
    | 'CONSULTAR_STOCK'
    | 'CONSULTAR_ENVIOS'
    | 'ADMINISTRAR_SUCURSALES'
    | 'REGISTRAR_PAGOS';

export type User = {
    id: string;
    name: string;
    email: string;
    /** Nombre del rol tal como lo definió la empresa; vacío si el usuario no tiene rol. */
    role: string;
    company: Company;
    branches: Branch[];
    permissions: Permission[];
};

/** GET /api/v1/auth/me: rol y permisos vigentes del usuario de la sesión. */
export type CurrentUserResponse = {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roleName: string | null;
    permissions: Permission[];
    platformAdmin: boolean;
    companyId: number;
    companyName: string;
};

export type LoginResponse = CurrentUserResponse & {
    token: string;
    type: string;
};

export type ChangePasswordRequest = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export type TokenResponse = {
    token: string;
    type: string;
};