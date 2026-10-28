import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ListGroup } from '@/components/ui/ListGroup';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch, useMyBranches } from '@/hooks/use-branch-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';

/**
 * Datos de la cuenta, de solo lectura. Salen de la sesión (/auth/me): nombre, rol y permisos
 * los administra un admin desde Usuarios.
 */
export default function ProfileScreen() {
    const user = useAuthStore((state) => state.user);
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const activeBranch = useActiveBranch();
    const { branches, isLoading: isLoadingBranches } = useMyBranches();

    // Al abrir se traen el rol y los datos vigentes (un admin pudo cambiarlos).
    useEffect(() => {
        void refreshUser();
    }, [refreshUser]);

    if (!user) {
        return null;
    }

    return (
        <Screen style={styles.container}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Mi perfil</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[SharedStyles.card, styles.identity]}>
                    <Avatar name={user.name} size={64} fontSize={22} fontWeight="700" />
                    <View style={styles.identityText}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.secondary}>{user.email}</Text>
                    </View>
                </View>

                <View style={SharedStyles.card}>
                    <InfoRow label="Rol" value={user.role || 'Sin rol asignado'} />
                    <View style={styles.divider} />
                    <InfoRow label="Empresa" value={user.company.name} />
                    <View style={styles.divider} />
                    <InfoRow label="Sucursal activa" value={activeBranch?.name ?? 'Ninguna seleccionada'} />
                </View>

                <View style={SharedStyles.card}>
                    <Text style={styles.label}>Sucursales asignadas</Text>
                    {isLoadingBranches ? (
                        <Text style={styles.secondary}>Cargando…</Text>
                    ) : branches.length === 0 ? (
                        <Text style={styles.secondary}>
                            No tenés sucursales asignadas. Pedile a un administrador que te asigne una.
                        </Text>
                    ) : (
                        branches.map((branch) => (
                            <Text key={branch.id} style={styles.branch}>
                                {branch.name}
                                {branch.id === activeBranch?.id ? ' · activa' : ''}
                            </Text>
                        ))
                    )}
                </View>

                <ListGroup>
                    <MenuListItem
                        title="Cambiar sucursal activa"
                        iconName={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                        onPress={() => router.push('/settings/active-branch')}
                    />
                    {/* Las cuentas creadas por un administrador no cambian su propia contraseña. */}
                    {user.canChangePassword !== false && (
                        <MenuListItem
                            title="Cambiar contraseña"
                            iconName={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                            onPress={() => router.push('/settings/change-password')}
                        />
                    )}
                </ListGroup>
            </ScrollView>
        </Screen>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    identity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    identityText: {
        flex: 1,
        gap: 2,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    secondary: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    row: {
        paddingVertical: Spacing.sm,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    value: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.muted,
    },
    branch: {
        fontSize: 15,
        color: Colors.text,
        paddingVertical: 4,
    },
});
