import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Screen } from '@/components/ui/Screen';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';

export default function MoreScreen() {
    const { user, logout } = useAuthStore();
    const { activeBranch } = useBranchStore();

    function handleLogout() {
        logout();
        router.replace('/(auth)/login');
    }

    const isAdmin = user?.role === 'ADMINISTRATOR';

    return (
        <Screen style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                {/* Perfil Resumen */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.name
                                ? user.name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()
                                : 'U'}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name ?? 'Usuario'}</Text>
                        <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>
                                {isAdmin ? 'Administrador' : 'Empleado'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Sección General */}
                <Text style={styles.sectionTitle}>General</Text>
                <View style={styles.section}>
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
                        onPress={() => {}}
                        showChevron={false}
                    />
                </View>

                {/* Sección Administración (sólo Admin) */}
                {isAdmin && (
                    <>
                        <Text style={styles.sectionTitle}>Administración</Text>
                        <View style={styles.section}>
                            <MenuListItem
                                title="Usuarios"
                                subtitle="Administrar empleados y permisos"
                                iconName={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                                onPress={() => {}}
                                showChevron={false}
                            />
                            <MenuListItem
                                title="Sucursales"
                                subtitle="Configurar locales y almacenes"
                                iconName={{ ios: 'building.2.fill', android: 'store', web: 'store' }}
                                onPress={() => {}}
                                showChevron={false}
                            />
                        </View>
                    </>
                )}

                {/* Sección Sesión */}
                <Text style={styles.sectionTitle}>Sesión</Text>
                <View style={styles.section}>
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
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.lg,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
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
        backgroundColor: '#EFF6FF',
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