import { User } from '@/types/auth';

/**
 * Indica si el usuario tiene un permiso del backend (p. ej. 'ADMINISTRAR_CATEGORIAS').
 *
 * Solo sirve para ocultar acciones en la UI: el backend lo valida igual en cada endpoint.
 * Recibe string porque el tipo Permission de types/auth no coincide con los nombres que
 * devuelve el login; en runtime user.permissions trae los del backend.
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean {
    return (user?.permissions as readonly string[] | undefined)?.includes(permission) ?? false;
}
