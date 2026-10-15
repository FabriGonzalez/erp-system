import { User } from '@/types/auth';
import { hasAnyPermission, hasPermission, ORDER_READ_PERMISSIONS } from '@/utils/permissions';

/**
 * Primera pestaña que el usuario puede usar: Ventas solo sirve para crear pedidos y Envíos
 * necesita leerlos. Productos se puede consultar con cualquier rol.
 */
export function homeRoute(user: User | null | undefined) {
    if (hasPermission(user, 'CREAR_PEDIDOS')) {
        return '/(app)/(tabs)/orders' as const;
    }
    if (hasAnyPermission(user, ORDER_READ_PERMISSIONS)) {
        return '/(app)/(tabs)/shipments' as const;
    }
    return '/(app)/(tabs)/products' as const;
}
