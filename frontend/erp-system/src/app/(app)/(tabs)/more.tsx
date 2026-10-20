import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useAuthStore } from '@/stores/auth-store';
import { getInitials } from '@/utils/format';
import {
    DEBTORS_READ_PERMISSIONS,
    hasAnyPermission,
    hasPermission,
    ORDER_READ_PERMISSIONS,
    STOCK_READ_PERMISSIONS,
    TRANSFER_READ_PERMISSIONS,
} from '@/utils/permissions';

export default function MoreScreen() {
    const { user, logout } = useAuthStore();
    const activeBranch = useActiveBranch();

    async function handleLogout() {
        await logout();
        router.replace('/(auth)/login');
    }

    // Cada ítem se muestra si el backend aceptaría lo que hace esa pantalla.
    const canSeeStock = hasAnyPermission(user, STOCK_READ_PERMISSIONS);
    const canSeeDebtors = hasAnyPermission(user, DEBTORS_READ_PERMISSIONS);
    const canSeeOrders = hasAnyPermission(user, ORDER_READ_PERMISSIONS);
    const canSeeTransfers = hasAnyPermission(user, TRANSFER_READ_PERMISSIONS);
    const canSeeReports = hasPermission(user, 'VER_REPORTES');
    const canManageAttributes = hasPermission(user, 'ADMINISTRAR_PRODUCTOS');
    const canManageUsers = hasPermission(user, 'ADMINISTRAR_USUARIOS');
    // La pantalla de sucursales también asigna usuarios.
    const canManageBranches = hasPermission(user, 'ADMINISTRAR_SUCURSALES') || canManageUsers;
    const canManageCategories = hasPermission(user, 'ADMINISTRAR_CATEGORIAS');
    const showAdministration = canManageAttributes || canManageUsers || canManageBranches || canManageCategories;

    return (
        <Screen style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                {/* Perfil Resumen */}
                <View style={styles.profileCard}>
                    <Avatar
                        initials={user?.name ? getInitials(user.name) : 'U'}
                        size={60}
                        fontWeight="700"
                        fontSize={20}
                        backgroundColor={Colors.primary}
                        textColor={Colors.white}
                        style={styles.avatar}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name ?? 'Usuario'}</Text>
                        <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
                        {Boolean(user?.role) && (
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>{user?.role}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Sección General */}
                <Text style={styles.sectionTitle}>General</Text>
                <View style={styles.section}>
                    {canSeeStock && (
                        <MenuListItem
                            title="Inventario"
                            subtitle="Consultar y ajustar stock por sucursal"
                            iconName={{ ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' }}
                            onPress={() => router.push('/inventory' as any)}
                        />
                    )}
                    <MenuListItem
                        title="Clientes"
                        subtitle="Gestión de clientes y direcciones"
                        iconName={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                        onPress={() => router.push('/customers' as any)}
                    />
                    {canSeeDebtors && (
                        <MenuListItem
                            title="Cuentas corrientes"
                            subtitle="Deudas, saldos a favor y pagos de clientes"
                            iconName={{ ios: 'exclamationmark.circle.fill', android: 'warning', web: 'warning' }}
                            onPress={() => router.push('/customers/debtors')}
                        />
                    )}
                    <MenuListItem
                        title="Sucursal activa"
                        subtitle={activeBranch?.name ?? 'Ninguna seleccionada'}
                        iconName={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                        onPress={() => router.push('/settings/active-branch')}
                    />
                    <MenuListItem
                        title="Mi Perfil"
                        subtitle="Detalles de tu cuenta"
                        iconName={{ ios: 'person.fill', android: 'person', web: 'person' }}
                        onPress={() => router.push('/settings/profile')}
                    />
                </View>

                <Text style={styles.sectionTitle}>Operaciones</Text>
                <View style={styles.section}>
                    {canSeeOrders && (
                        <MenuListItem
                            title="Operaciones"
                            subtitle="Consultar ventas y envíos en una sola lista"
                            iconName={{ ios: 'list.bullet.rectangle', android: 'view_list', web: 'view_list' }}
                            onPress={() => router.push('/operations' as any)}
                        />
                    )}
                    {canSeeTransfers && (
                        <MenuListItem
                            title="Transferencias"
                            subtitle="Mover stock entre sucursales"
                            iconName={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
                            onPress={() => router.push('/transfers' as any)}
                        />
                    )}
                    {canSeeReports && (
                        <MenuListItem
                            title="Reportes"
                            subtitle="Ventas, cobranzas, más vendidos y stock bajo"
                            iconName={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
                            onPress={() => router.push('/reports' as any)}
                        />
                    )}
                </View>

                {/* Sección Administración: cada ítem según su permiso */}
                {showAdministration && (
                    <>
                        <Text style={styles.sectionTitle}>Administración</Text>
                        <View style={styles.section}>
                            {canManageAttributes && (
                                <MenuListItem
                                    title="Atributos de productos"
                                    subtitle="Administrar atributos y valores del catálogo"
                                    iconName={{ ios: 'tag.fill', android: 'label', web: 'label' }}
                                    onPress={() => router.push('/attributes' as any)}
                                />
                            )}
                            {canManageUsers && (
                                <MenuListItem
                                    title="Usuarios"
                                    subtitle="Administrar empleados, roles y permisos"
                                    iconName={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                                    onPress={() => router.push('/users' as any)}
                                />
                            )}
                            {canManageBranches && (
                                <MenuListItem
                                    title="Sucursales"
                                    subtitle="Configurar locales y almacenes"
                                    iconName={{ ios: 'building.2.fill', android: 'store', web: 'store' }}
                                    onPress={() => {
                                        router.push({ pathname: '/branches' });
                                    }}
                                />
                            )}
                            {canManageCategories && (
                                <MenuListItem
                                    title="Categorías"
                                    subtitle="Organizar categorías del catálogo"
                                    iconName={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
                                    onPress={() => {
                                        router.push('/categories' as any);
                                    }}
                                />
                            )}
                        </View>
                    </>
                )}

                {/* Sección Sesión */}
                <Text style={styles.sectionTitle}>Sesión</Text>
                <View style={styles.section}>
                    {/* Las cuentas creadas por un administrador no cambian su propia contraseña. */}
                    {user?.canChangePassword !== false && (
                        <MenuListItem
                            title="Cambiar contraseña"
                            subtitle="Actualizá la contraseña de tu cuenta"
                            iconName={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                            onPress={() => router.push('/settings/change-password')}
                        />
                    )}
                    <MenuListItem
                        title="Cerrar sesión"
                        iconName={{ ios: 'arrow.right.to.line.compact', android: 'logout', web: 'logout' }}
                        onPress={handleLogout}
                        showChevron={false}
                        textColor={Colors.error}
                    />
                </View>

                <Text style={styles.versionText}>Versión 1.0.0 (Beta)</Text>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    scrollContainer: {
        paddingVertical: Spacing.lg,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        padding: Spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.xl,
    },
    avatar: {
        marginRight: Spacing.lg,
    },
    profileInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    profileEmail: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.primaryLight,
        borderRadius: 6,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        marginTop: Spacing.xs,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: Spacing.lg,
        marginBottom: Spacing.sm,
        marginTop: Spacing.md,
    },
    section: {
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
    },
    versionText: {
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xxl,
        marginBottom: Spacing.md,
    },
});