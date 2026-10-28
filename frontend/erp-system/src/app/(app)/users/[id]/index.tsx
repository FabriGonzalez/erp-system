import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ResetPasswordModal } from '@/components/users/ResetPasswordModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { InfoRow } from '@/components/ui/InfoRow';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { Colors } from '@/constants/colors';
import { useBranches } from '@/hooks/use-branch-queries';
import {
    useCompanyUser,
    useSetUserActive,
    useToggleUserBranch,
    useUserBranches,
} from '@/hooks/use-user-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { Branch } from '@/types/branch';
import { confirmAction } from '@/utils/confirm';

export default function UserDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const currentUserId = useAuthStore((state) => state.user?.id);
    const { branches: allBranches } = useBranches();

    const { user, isLoading, error, reload } = useCompanyUser(id);
    const userBranches = useUserBranches(id);
    const setActive = useSetUserActive(id);
    const toggleBranch = useToggleUserBranch(id);
    const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const assignedIds = useMemo(
        () => new Set(userBranches.branches.map((branch) => branch.id)),
        [userBranches.branches],
    );
    // Sucursales activas, más las inactivas que el usuario todavía tenga asignadas.
    const branchOptions = useMemo(
        () => allBranches
            .filter((branch) => branch.active !== false || assignedIds.has(branch.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'es')),
        [allBranches, assignedIds],
    );

    if (isLoading) return <LoadingState label="Cargando usuario..." />;
    if (!user) return <ErrorState message={error ?? 'No se encontró el usuario.'} onRetry={reload} />;

    const isMe = user.id === currentUserId;

    async function handleToggleActive() {
        if (!user || setActive.isPending) return;
        const activate = !user.active;
        const confirmed = await confirmAction({
            title: activate ? 'Activar usuario' : 'Desactivar usuario',
            message: activate
                ? `${user.fullName} va a poder volver a iniciar sesión.`
                : `${user.fullName} no va a poder iniciar sesión ni seguir usando la app.`,
            confirmLabel: activate ? 'Activar' : 'Desactivar',
            destructive: !activate,
        });
        if (!confirmed) return;

        setActionError(null);
        try {
            await setActive.mutateAsync(activate);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'No se pudo actualizar el usuario.');
        }
    }

    async function handleToggleBranch(branch: Branch, assign: boolean) {
        setActionError(null);
        try {
            await toggleBranch.mutateAsync({ branch, assign });
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'No se pudo actualizar la sucursal.');
        }
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={`@${user.username}${isMe ? ' · vos' : ''}`}
                title={user.fullName}
                right={(
                    <HeaderButton
                        label="Editar"
                        icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                        accessibilityLabel="Editar usuario"
                        onPress={() => router.push({ pathname: '/users/[id]/edit', params: { id: user.id } })}
                    />
                )}
            />

            <ScrollView contentContainerStyle={SharedStyles.pageContent} showsVerticalScrollIndicator={false}>
                <ListGroup>
                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="Rol" value={<StatusPill label={user.roleName} tone="primary" />} />
                    <InfoRow
                        label="Estado"
                        value={<StatusPill label={user.active ? 'Activo' : 'Inactivo'} tone={user.active ? 'success' : 'neutral'} />}
                    />
                </ListGroup>

                <View style={SharedStyles.pageSection}>
                    <SectionHeader title="Sucursales" />
                    <Text style={styles.hint}>
                        Solo puede operar en las sucursales que tenga asignadas.
                    </Text>
                    {userBranches.isLoading ? (
                        <ActivityIndicator color={Colors.primary} />
                    ) : userBranches.error ? (
                        <Text style={styles.errorText}>{userBranches.error}</Text>
                    ) : branchOptions.length === 0 ? (
                        <Text style={styles.hint}>No hay sucursales activas.</Text>
                    ) : (
                        <ListGroup>
                            {branchOptions.map((branch) => {
                                const pending = toggleBranch.isPending && toggleBranch.variables?.branch.id === branch.id;
                                const assigned = pending ? toggleBranch.variables!.assign : assignedIds.has(branch.id);
                                return (
                                    <SwitchRow
                                        key={branch.id}
                                        title={branch.name}
                                        subtitle={branch.active === false ? 'Inactiva' : undefined}
                                        value={assigned}
                                        disabled={toggleBranch.isPending}
                                        onValueChange={(value) => void handleToggleBranch(branch, value)}
                                    />
                                );
                            })}
                        </ListGroup>
                    )}
                </View>

                {!isMe && (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title="Acciones" />
                        <ListGroup>
                            <MenuListItem
                                title="Cambiar contraseña"
                                subtitle="Elegís la nueva; se cierran sus sesiones."
                                iconName={{ ios: 'key', android: 'key', web: 'key' }}
                                tone="warning"
                                onPress={() => setPasswordModalVisible(true)}
                            />
                            <MenuListItem
                                title={user.active ? 'Desactivar usuario' : 'Activar usuario'}
                                subtitle={user.active ? 'No va a poder iniciar sesión.' : 'Vuelve a poder iniciar sesión.'}
                                iconName={user.active
                                    ? { ios: 'person.crop.circle.badge.xmark', android: 'person_off', web: 'person_off' }
                                    : { ios: 'person.crop.circle.badge.checkmark', android: 'how_to_reg', web: 'how_to_reg' }}
                                tone="success"
                                danger={user.active}
                                showChevron={false}
                                badge={setActive.isPending ? <ActivityIndicator color={Colors.primary} /> : undefined}
                                onPress={() => void handleToggleActive()}
                            />
                        </ListGroup>
                    </View>
                )}

                {actionError && <Text style={styles.errorText}>{actionError}</Text>}
            </ScrollView>

            {!isMe && (
                <ResetPasswordModal
                    user={user}
                    visible={isPasswordModalVisible}
                    onClose={() => setPasswordModalVisible(false)}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    hint: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
});
