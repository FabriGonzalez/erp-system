import { Permission, User } from '@/types/auth';

/**
 * Indica si el usuario tiene un permiso del backend (p. ej. 'ADMINISTRAR_CATEGORIAS').
 *
 * Solo sirve para ocultar acciones en la UI: el backend lo valida igual en cada endpoint.
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
    return user?.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(user: User | null | undefined, permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => hasPermission(user, permission));
}

// Grupos que el backend acepta con hasAnyAuthority en los endpoints de lectura.

/** GET /api/v1/orders y /orders/{id}. */
export const ORDER_READ_PERMISSIONS = ['VER_PEDIDOS', 'CREAR_PEDIDOS', 'PREPARAR_PEDIDOS'] as const satisfies readonly Permission[];

/** GET /api/v1/inventory/stocks. */
export const STOCK_READ_PERMISSIONS = [
    'CONSULTAR_STOCK',
    'AJUSTAR_STOCK',
    'TRANSFERIR_STOCK',
    'CREAR_PEDIDOS',
] as const satisfies readonly Permission[];

/** GET /api/v1/inventory/transfers y /transfers/{id}. */
export const TRANSFER_READ_PERMISSIONS = ['TRANSFERIR_STOCK', 'CONSULTAR_STOCK'] as const satisfies readonly Permission[];

/** GET /api/v1/customers/debtors. */
export const DEBTORS_READ_PERMISSIONS = [
    'ADMINISTRAR_CLIENTES',
    'REGISTRAR_PAGOS',
    'VER_REPORTES',
] as const satisfies readonly Permission[];
