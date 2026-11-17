import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ListGroup } from '@/components/ui/ListGroup';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useDashboard } from '@/hooks/use-report-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
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
    // Misma clave que el resumen de Ventas: comparten caché. La deuda es de toda la empresa.
    const { dashboard } = useDashboard('today', activeBranch?.id ?? null);
    const debtorCount = dashboard?.debt.debtorCount ?? 0;

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
    // Las promos fijan precios: se administran con ese permiso.
    const canManagePromotions = hasPermission(user, 'ADMINISTRAR_PRECIOS');
    const showOperations = canSeeOrders || canSeeTransfers || canSeeReports;
    const showAdministration = canManageAttributes || canManageUsers || canManageBranches || canManageCategories
        || canManagePromotions;

    return (
        <Screen style={styles.screen}>
            <PageHeader eyebrow={user?.company.name} title="Más" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={SharedStyles.pageContent}>
                <View style={[styles.profileCard, SharedStyles.raised]}>
                    <Pressable
                        onPress={() => router.push('/settings/profile')}
                        accessibilityRole="button"
                        accessibilityLabel="Mi perfil"
                        style={({ pressed }) => [styles.profileRow, pressed && SharedStyles.pressed]}
                    >
                        <Avatar
                            initials={user?.name ? getInitials(user.name) : 'U'}
                            size={52}
                            fontWeight="800"
                            fontSize={18}
                            backgroundColor={Colors.white}
                            textColor={Colors.primary}
                        />
                        <View style={styles.profileTexts}>
                            <Text style={styles.profileName} numberOfLines={1}>{user?.name ?? 'Usuario'}</Text>
                            <Text style={styles.profileDetail} numberOfLines={1}>
                                {user?.role ? `${user.role} · ${user.email}` : user?.email}
                            </Text>
                        </View>
                        <SymbolView
                            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                            size={18}
                            tintColor={Colors.white}
                        />
                    </Pressable>

                    <Pressable
                        onPress={() => router.push('/settings/active-branch')}
                        accessibilityRole="button"
                        accessibilityLabel={`Sucursal activa: ${activeBranch?.name ?? 'ninguna'}. Cambiar`}
                        style={({ pressed }) => [styles.branchRow, pressed && SharedStyles.pressed]}
                    >
                        <SymbolView
                            name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                            size={18}
                            tintColor={Colors.white}
                        />
                        <View style={styles.profileTexts}>
                            <Text style={styles.branchLabel}>Sucursal activa</Text>
                            <Text style={styles.branchName} numberOfLines={1}>
                                {activeBranch?.name ?? 'Ninguna seleccionada'}
                            </Text>
                        </View>
                        <View style={styles.changeButton}>
                            <Text style={styles.changeText}>Cambiar</Text>
                        </View>
                    </Pressable>
                </View>

                <View style={SharedStyles.pageSection}>
                    <SectionHeader title="General" />
                    <ListGroup>
                        {canSeeStock && (
                            <MenuListItem
                                title="Inventario"
                                subtitle="Consultar y ajustar stock por sucursal"
                                iconName={{ ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' }}
                                tone="teal"
                                onPress={() => router.push('/inventory' as any)}
                            />
                        )}
                        <MenuListItem
                            title="Clientes"
                            subtitle="Gestión de clientes y direcciones"
                            iconName={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                            tone="violet"
                            onPress={() => router.push('/customers' as any)}
                        />
                        {canSeeDebtors && (
                            <MenuListItem
                                title="Cuentas corrientes"
                                subtitle="Deudas, saldos a favor y pagos de clientes"
                                iconName={{ ios: 'exclamationmark.circle.fill', android: 'warning', web: 'warning' }}
                                tone="warning"
                                badge={debtorCount > 0
                                    ? <StatusPill label={`${debtorCount} ${debtorCount === 1 ? 'debe' : 'deben'}`} tone="warning" />
                                    : undefined}
                                onPress={() => router.push('/customers/debtors')}
                            />
                        )}
                    </ListGroup>
                </View>

                {showOperations && (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title="Operaciones" />
                        <ListGroup>
                            {canSeeOrders && (
                                <MenuListItem
                                    title="Operaciones"
                                    subtitle="Consultar ventas y envíos en una sola lista"
                                    iconName={{ ios: 'list.bullet.rectangle', android: 'view_list', web: 'view_list' }}
                                    tone="primary"
                                    onPress={() => router.push('/operations' as any)}
                                />
                            )}
                            {canSeeTransfers && (
                                <MenuListItem
                                    title="Transferencias"
                                    subtitle="Mover stock entre sucursales"
                                    iconName={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
                                    tone="teal"
                                    onPress={() => router.push('/transfers' as any)}
                                />
                            )}
                            {canSeeReports && (
                                <MenuListItem
                                    title="Reportes"
                                    subtitle="Ventas, cobranzas, más vendidos y stock bajo"
                                    iconName={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
                                    tone="success"
                                    onPress={() => router.push('/reports' as any)}
                                />
                            )}
                        </ListGroup>
                    </View>
                )}

                {/* Administración: cada ítem según su permiso */}
                {showAdministration && (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title="Administración" />
                        <ListGroup>
                            {canManageAttributes && (
                                <MenuListItem
                                    title="Importar productos"
                                    subtitle="Cargar o actualizar el catálogo desde un Excel"
                                    iconName={{ ios: 'square.and.arrow.down.fill', android: 'upload_file', web: 'upload_file' }}
                                    tone="primary"
                                    onPress={() => router.push('/imports' as any)}
                                />
                            )}
                            {canManagePromotions && (
                                <MenuListItem
                                    title="Promociones"
                                    subtitle="Combos de productos a precio fijo, con vigencia"
                                    iconName={{ ios: 'gift.fill', android: 'redeem', web: 'redeem' }}
                                    tone="rose"
                                    onPress={() => router.push('/promotions')}
                                />
                            )}
                            {canManageCategories && (
                                <MenuListItem
                                    title="Categorías"
                                    subtitle="Organizar categorías del catálogo"
                                    iconName={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
                                    tone="warning"
                                    onPress={() => router.push('/categories' as any)}
                                />
                            )}
                            {canManageAttributes && (
                                <MenuListItem
                                    title="Atributos de productos"
                                    subtitle="Administrar atributos y valores del catálogo"
                                    iconName={{ ios: 'tag.fill', android: 'label', web: 'label' }}
                                    tone="warning"
                                    onPress={() => router.push('/attributes' as any)}
                                />
                            )}
                            {canManageUsers && (
                                <MenuListItem
                                    title="Usuarios"
                                    subtitle="Administrar empleados, roles y permisos"
                                    iconName={{ ios: 'person.badge.key.fill', android: 'manage_accounts', web: 'manage_accounts' }}
                                    tone="violet"
                                    onPress={() => router.push('/users' as any)}
                                />
                            )}
                            {canManageBranches && (
                                <MenuListItem
                                    title="Sucursales"
                                    subtitle="Configurar locales y almacenes"
                                    iconName={{ ios: 'building.2.fill', android: 'store', web: 'store' }}
                                    onPress={() => router.push('/branches')}
                                />
                            )}
                        </ListGroup>
                    </View>
                )}

                <View style={SharedStyles.pageSection}>
                    <SectionHeader title="Sesión" />
                    <ListGroup>
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
                            danger
                        />
                    </ListGroup>
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
    profileCard: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.xl,
        overflow: 'hidden',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.lg,
    },
    profileTexts: {
        flex: 1,
        gap: 2,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.white,
    },
    profileDetail: {
        fontSize: 13,
        color: Colors.white,
        opacity: 0.85,
    },
    branchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    branchLabel: {
        fontSize: 12,
        color: Colors.white,
        opacity: 0.8,
    },
    branchName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.white,
    },
    changeButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radius.pill,
        backgroundColor: Colors.white,
    },
    changeText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
    },
    versionText: {
        fontSize: 12,
        color: Colors.textTertiary,
        textAlign: 'center',
        marginTop: Spacing.lg,
    },
});
