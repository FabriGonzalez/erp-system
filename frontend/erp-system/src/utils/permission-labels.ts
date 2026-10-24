import { Permission } from '@/types/auth';

type PermissionInfo = {
    label: string;
    /** Aclaración que se muestra debajo, p. ej. si todavía no tiene efecto. */
    hint?: string;
};

export const PERMISSION_INFO: Record<Permission, PermissionInfo> = {
    CREAR_PEDIDOS: { label: 'Crear y editar pedidos', hint: 'También cancelarlos y vender en el mostrador.' },
    VER_PEDIDOS: { label: 'Ver pedidos' },
    PREPARAR_PEDIDOS: { label: 'Preparar y despachar pedidos' },
    REGISTRAR_PAGOS: { label: 'Registrar y anular pagos' },
    CREAR_ENVIOS: { label: 'Crear envíos' },
    CONSULTAR_ENVIOS: { label: 'Ver envíos' },
    ADMINISTRAR_CLIENTES: { label: 'Administrar clientes' },
    ADMINISTRAR_PRODUCTOS: { label: 'Administrar productos y atributos' },
    ADMINISTRAR_CATEGORIAS: { label: 'Administrar categorías' },
    ADMINISTRAR_PRECIOS: {
        label: 'Administrar precios',
        hint: 'Junto con "Administrar productos": crear productos, agregar variantes y cambiar precios. Solo: administrar promociones.',
    },
    CONSULTAR_STOCK: { label: 'Ver stock' },
    AJUSTAR_STOCK: { label: 'Ajustar stock' },
    TRANSFERIR_STOCK: { label: 'Transferir stock entre sucursales' },
    ADMINISTRAR_USUARIOS: { label: 'Administrar usuarios y roles' },
    ADMINISTRAR_SUCURSALES: { label: 'Administrar sucursales' },
    ACCEDER_TODAS_SUCURSALES: { label: 'Acceder a todas las sucursales', hint: 'Se asigna automáticamente a cada sucursal nueva.' },
    VER_REPORTES: { label: 'Ver reportes y deudores' },
};

const GROUPS: { title: string; permissions: Permission[] }[] = [
    { title: 'Ventas', permissions: ['CREAR_PEDIDOS', 'VER_PEDIDOS', 'PREPARAR_PEDIDOS', 'REGISTRAR_PAGOS'] },
    { title: 'Envíos', permissions: ['CREAR_ENVIOS', 'CONSULTAR_ENVIOS'] },
    { title: 'Clientes', permissions: ['ADMINISTRAR_CLIENTES'] },
    { title: 'Catálogo', permissions: ['ADMINISTRAR_PRODUCTOS', 'ADMINISTRAR_CATEGORIAS', 'ADMINISTRAR_PRECIOS'] },
    { title: 'Stock', permissions: ['CONSULTAR_STOCK', 'AJUSTAR_STOCK', 'TRANSFERIR_STOCK'] },
    {
        title: 'Administración',
        permissions: ['ADMINISTRAR_USUARIOS', 'ADMINISTRAR_SUCURSALES', 'ACCEDER_TODAS_SUCURSALES', 'VER_REPORTES'],
    },
];

function isKnown(permission: string): permission is Permission {
    return permission in PERMISSION_INFO;
}

export function permissionInfo(permission: string): PermissionInfo {
    // Un permiso que el backend agregó y el frontend todavía no conoce se muestra con su nombre.
    return isKnown(permission) ? PERMISSION_INFO[permission] : { label: permission };
}

/**
 * Agrupa los permisos que devuelve el backend. Los que no están en ningún grupo van a
 * "Otros", así un permiso nuevo igual se puede asignar.
 */
export function groupPermissions(available: string[]): { title: string; permissions: string[] }[] {
    const availableSet = new Set(available);
    const grouped = GROUPS
        .map((group) => ({
            title: group.title,
            permissions: group.permissions.filter((permission) => availableSet.has(permission)),
        }))
        .filter((group) => group.permissions.length > 0);

    const inGroups = new Set(GROUPS.flatMap((group) => group.permissions as string[]));
    const others = available.filter((permission) => !inGroups.has(permission));
    return others.length > 0 ? [...grouped, { title: 'Otros', permissions: others }] : grouped;
}
