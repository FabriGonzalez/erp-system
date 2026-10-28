import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { BranchFormModal } from '@/components/branches/BranchFormModal';
import { BranchUsersAssignmentModal } from '@/components/branches/BranchUsersAssignmentModal';
import { ActionChip } from '@/components/ui/ActionChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import {
    useActiveBranch,
    useBranches,
    useMyBranches,
    useSelectBranch,
    useSetBranchActive,
} from '@/hooks/use-branch-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showErrorToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { Branch } from '@/types/branch';
import { confirmAction } from '@/utils/confirm';
import { hasPermission } from '@/utils/permissions';

export default function BranchesListScreen() {
    const user = useAuthStore((state) => state.user);
    const { branches: allBranches, isLoading, isRefreshing, error, refresh: handleRefresh } = useBranches();
    const { branches: availableBranches } = useMyBranches();
    const activeBranch = useActiveBranch();
    const selectBranch = useSelectBranch();
    const setBranchActive = useSetBranchActive();

    // Se entra con cualquiera de los dos permisos; cada acción pide el suyo.
    const canManageBranches = hasPermission(user, 'ADMINISTRAR_SUCURSALES');
    const canManageUsers = hasPermission(user, 'ADMINISTRAR_USUARIOS');

    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [assigningBranch, setAssigningBranch] = useState<Branch | null>(null);
    const [selectingBranchId, setSelectingBranchId] = useState<string | null>(null);
    const [togglingBranchId, setTogglingBranchId] = useState<string | null>(null);

    function handleOpenCreate() {
        setEditingBranch(null);
        setIsFormModalVisible(true);
    }

    function handleOpenEdit(branch: Branch) {
        setEditingBranch(branch);
        setIsFormModalVisible(true);
    }

    function handleOpenUsersAssignment(branch: Branch) {
        setAssigningBranch(branch);
    }

    async function handleSelectActive(branch: Branch) {
        if (activeBranch?.id === branch.id) return;
        setSelectingBranchId(branch.id);
        try {
            await selectBranch.mutateAsync(branch);
        } catch (err: unknown) {
            showErrorToast(err, 'No se pudo seleccionar la sucursal como activa.');
        } finally {
            setSelectingBranchId(null);
        }
    }

    async function handleToggleActive(branch: Branch) {
        if (togglingBranchId) return;
        if (branch.active) {
            // Inactiva = no asignada para todos: conviene que quede claro antes de hacerlo.
            const confirmed = await confirmAction({
                title: `Desactivar ${branch.name}`,
                message:
                    'Mientras esté inactiva nadie va a poder vender, cobrar, ajustar stock ni transferir en ella, ' +
                    'y sus pedidos dejan de verse en Pedidos, Envíos y Reportes. Podés reactivarla cuando quieras.',
                confirmLabel: 'Desactivar',
                destructive: true,
            });
            if (!confirmed) return;
        }
        setTogglingBranchId(branch.id);
        try {
            await setBranchActive.mutateAsync({ id: branch.id, active: !branch.active });
        } catch (err: unknown) {
            showErrorToast(err, 'No se pudo cambiar el estado de la sucursal.');
        } finally {
            setTogglingBranchId(null);
        }
    }

    function renderItem({ item }: { item: Branch }) {
        const isActiveBranch = activeBranch?.id === item.id;
        const isSelectingThis = selectingBranchId === item.id;
        const isTogglingThis = togglingBranchId === item.id;
        // Elegir una sucursal no asignada la asigna al usuario, y eso exige ADMINISTRAR_USUARIOS.
        const canSelect = canManageUsers || availableBranches.some((branch) => branch.id === item.id);

        return (
            <View
                style={[
                    SharedStyles.card,
                    styles.card,
                    !item.active && SharedStyles.listItemInactive,
                ]}
            >
                <View style={styles.cardTop}>
                    <IconBadge
                        icon={{ ios: 'building.2', android: 'store', web: 'store' }}
                        tone={isActiveBranch ? 'primary' : 'neutral'}
                        size={44}
                    />
                    <View style={SharedStyles.listItemTexts}>
                        <Text style={SharedStyles.listItemTitle} numberOfLines={1}>{item.name}</Text>
                        {item.address ? (
                            <Text style={SharedStyles.listItemMeta} numberOfLines={1}>{item.address}</Text>
                        ) : null}
                        {item.phone ? (
                            <Text style={SharedStyles.listItemMeta}>{item.phone}</Text>
                        ) : null}
                        <View style={styles.pills}>
                            {isActiveBranch ? <StatusPill label="Tu sucursal activa" tone="primary" /> : null}
                            {!item.active ? <StatusPill label="Inactiva" tone="neutral" /> : null}
                        </View>
                    </View>
                    {canManageBranches && (
                        <Pressable
                            style={({ pressed }) => [styles.iconButton, pressed && SharedStyles.pressed]}
                            onPress={() => handleOpenEdit(item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Editar ${item.name}`}
                        >
                            <SymbolView
                                name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                                size={18}
                                tintColor={Colors.primary}
                            />
                        </Pressable>
                    )}
                </View>

                {((item.active && ((canSelect && !isActiveBranch) || canManageUsers)) || canManageBranches) && (
                    <View style={styles.cardActions}>
                        {item.active && canSelect && !isActiveBranch && (
                            <ActionChip
                                label="Usar como activa"
                                icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                                tone="neutral"
                                loading={isSelectingThis}
                                onPress={() => handleSelectActive(item)}
                            />
                        )}

                        {item.active && canManageUsers && (
                            <ActionChip
                                label="Usuarios"
                                icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                                onPress={() => handleOpenUsersAssignment(item)}
                            />
                        )}

                        {canManageBranches && (
                            <ActionChip
                                label={item.active ? 'Desactivar' : 'Activar'}
                                icon={item.active
                                    ? { ios: 'pause.circle', android: 'block', web: 'block' }
                                    : { ios: 'play.circle', android: 'check_circle', web: 'check_circle' }}
                                tone={item.active ? 'danger' : 'success'}
                                loading={isTogglingThis}
                                onPress={() => handleToggleActive(item)}
                            />
                        )}
                    </View>
                )}
            </View>
        );
    }


    return (
        <Screen style={styles.container}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow="Locales, depósitos y puntos de venta"
                title="Sucursales"
                right={canManageBranches ? (
                    <HeaderButton label="Nueva" accessibilityLabel="Nueva sucursal" onPress={handleOpenCreate} />
                ) : undefined}
            />

            {isLoading && allBranches.length === 0 ? (
                <LoadingState label="Cargando sucursales..." />
            ) : error && allBranches.length === 0 ? (
                <ErrorState message={error} onRetry={handleRefresh} />
            ) : (
                <FlatList
                    data={allBranches}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={SharedStyles.pageList}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="Sin sucursales registradas"
                            description="Creá la primera sucursal para comenzar a gestionar stock, pedidos y operaciones."
                            actionLabel={canManageBranches ? '+ Crear Sucursal' : undefined}
                            onAction={canManageBranches ? handleOpenCreate : undefined}
                        />
                    }
                />
            )}

            <BranchFormModal
                visible={isFormModalVisible}
                branchToEdit={editingBranch}
                onClose={() => {
                    setIsFormModalVisible(false);
                    setEditingBranch(null);
                }}
            />

            <BranchUsersAssignmentModal
                visible={!!assigningBranch}
                branch={assigningBranch}
                onClose={() => setAssigningBranch(null)}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    card: {
        padding: Spacing.md,
        borderRadius: Radius.lg,
        gap: Spacing.md,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    pills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    iconButton: {
        alignSelf: 'flex-start',
        padding: 8,
        borderRadius: Radius.sm,
        backgroundColor: Colors.primaryLight,
    },
});
