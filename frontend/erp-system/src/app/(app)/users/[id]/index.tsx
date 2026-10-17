import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ResetPasswordModal } from '@/components/users/ResetPasswordModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import {
    useCompanyUser,
    useSetUserActive,
    useToggleUserBranch,
    useUserBranches,
} from '@/hooks/use-user-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { SharedStyles } from '@/styles/shared';
import { Branch } from '@/types/branch';
import { confirmAction } from '@/utils/confirm';

export default function UserDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const token = useAuthStore((state) => state.token);
    const currentUserId = useAuthStore((state) => state.user?.id);
    const allBranches = useBranchStore((state) => state.allBranches);
    const fetchAllBranches = useBranchStore((state) => state.fetchAllBranches);

    const { user, isLoading, error, reload } = useCompanyUser(id);
    const userBranches = useUserBranches(id);
    const setActive = useSetUserActive(id);
    const toggleBranch = useToggleUserBranch(id);
    const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchAllBranches(token).catch(() => {});
        }
    }, [token, fetchAllBranches]);

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
            <View style={[SharedStyles.topBar, SharedStyles.topBarElevated]}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle} numberOfLines={1}>{user.fullName}</Text>
                    <Text style={styles.screenSubtitle}>@{user.username}{isMe ? ' · vos' : ''}</Text>
                </View>
                <Pressable
                    style={({ pressed }) => [styles.editButton, pressed && SharedStyles.pressed]}
                    onPress={() => router.push({ pathname: '/users/[id]/edit', params: { id: user.id } })}
                >
                    <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Row label="Email" value={user.email} />
                    <Row label="Rol" value={user.roleName} />
                    <Row label="Estado" value={user.active ? 'Activo' : 'Inactivo'} />
                </View>

                {!isMe && (
                    <View style={styles.card}>
                        <ActionRow
                            title="Cambiar contraseña"
                            subtitle="Elegís la nueva; se cierran sus sesiones."
                            onPress={() => setPasswordModalVisible(true)}
                        />
                        <ActionRow
                            title={user.active ? 'Desactivar usuario' : 'Activar usuario'}
                            subtitle={user.active ? 'No va a poder iniciar sesión.' : 'Vuelve a poder iniciar sesión.'}
                            danger={user.active}
                            busy={setActive.isPending}
                            onPress={() => void handleToggleActive()}
                        />
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sucursales</Text>
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
                        branchOptions.map((branch) => {
                            const pending = toggleBranch.isPending && toggleBranch.variables?.branch.id === branch.id;
                            const assigned = pending ? toggleBranch.variables!.assign : assignedIds.has(branch.id);
                            return (
                                <View key={branch.id} style={styles.branchRow}>
                                    <Text style={styles.branchName}>
                                        {branch.name}
                                        {branch.active === false ? ' (inactiva)' : ''}
                                    </Text>
                                    <Switch
                                        value={assigned}
                                        disabled={toggleBranch.isPending}
                                        onValueChange={(value) => void handleToggleBranch(branch, value)}
                                    />
                                </View>
                            );
                        })
                    )}
                </View>

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

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

function ActionRow({
    title,
    subtitle,
    danger = false,
    busy = false,
    onPress,
}: {
    title: string;
    subtitle: string;
    danger?: boolean;
    busy?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={busy}
            style={({ pressed }) => [styles.actionRow, pressed && SharedStyles.pressed]}
        >
            <View style={styles.actionText}>
                <Text style={[styles.actionTitle, danger && styles.danger]}>{title}</Text>
                <Text style={styles.hint}>{subtitle}</Text>
            </View>
            {busy ? (
                <ActivityIndicator color={Colors.primary} />
            ) : (
                <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={18}
                    tintColor={Colors.textSecondary}
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
        marginRight: Spacing.xs,
    },
    titleContainer: {
        flex: 1,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    screenSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    editButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    editButtonText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    rowLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    rowValue: {
        flexShrink: 1,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'right',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    actionText: {
        flex: 1,
        gap: 2,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    danger: {
        color: Colors.error,
    },
    hint: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    branchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
        paddingTop: Spacing.sm,
    },
    branchName: {
        flexShrink: 1,
        fontSize: 15,
        color: Colors.text,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
});
