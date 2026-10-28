import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { InfoRow } from '@/components/ui/InfoRow';
import { ListGroup } from '@/components/ui/ListGroup';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusPill } from '@/components/ui/StatusPill';
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
            <PageHeader onBack={() => router.back()} eyebrow="Más" title="Mi perfil" />

            <ScrollView contentContainerStyle={SharedStyles.pageContent}>
                <View style={[SharedStyles.card, styles.identity]}>
                    <Avatar name={user.name} size={64} fontSize={22} fontWeight="700" />
                    <View style={styles.identityText}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.secondary}>{user.email}</Text>
                    </View>
                </View>

                <ListGroup>
                    <InfoRow label="Rol" value={user.role || 'Sin rol asignado'} />
                    <InfoRow label="Empresa" value={user.company.name} />
                    <InfoRow label="Sucursal activa" value={activeBranch?.name ?? 'Ninguna seleccionada'} />
                </ListGroup>

                <View style={SharedStyles.pageSection}>
                    <SectionHeader title="Sucursales asignadas" />
                    {isLoadingBranches ? (
                        <Text style={styles.secondary}>Cargando…</Text>
                    ) : branches.length === 0 ? (
                        <Text style={styles.secondary}>
                            No tenés sucursales asignadas. Pedile a un administrador que te asigne una.
                        </Text>
                    ) : (
                        <ListGroup>
                            {branches.map((branch) => (
                                <InfoRow
                                    key={branch.id}
                                    label={branch.name}
                                    value={branch.id === activeBranch?.id
                                        ? <StatusPill label="Activa" tone="primary" />
                                        : ''}
                                />
                            ))}
                        </ListGroup>
                    )}
                </View>

                <ListGroup>
                    <MenuListItem
                        title="Cambiar sucursal activa"
                        iconName={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                        tone="primary"
                        onPress={() => router.push('/settings/active-branch')}
                    />
                    {/* Las cuentas creadas por un administrador no cambian su propia contraseña. */}
                    {user.canChangePassword !== false && (
                        <MenuListItem
                            title="Cambiar contraseña"
                            iconName={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                            tone="warning"
                            onPress={() => router.push('/settings/change-password')}
                        />
                    )}
                </ListGroup>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
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
});
