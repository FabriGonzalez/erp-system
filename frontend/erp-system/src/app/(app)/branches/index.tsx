import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { BranchFormModal } from '@/components/branches/BranchFormModal';
import { BranchUsersAssignmentModal } from '@/components/branches/BranchUsersAssignmentModal';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { showErrorToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { Branch } from '@/types/branch';
import { confirmAction } from '@/utils/confirm';
import { hasPermission } from '@/utils/permissions';

export default function BranchesListScreen() {
    const { token, user } = useAuthStore();
    const {
        allBranches,
        isLoading,
        error,
        fetchAllBranches,
        toggleBranchActive,
        activeBranch,
        availableBranches,
        selectAndEnsureAssigned,
    } = useBranchStore();

    // Se entra con cualquiera de los dos permisos; cada acción pide el suyo.
    const canManageBranches = hasPermission(user, 'ADMINISTRAR_SUCURSALES');
    const canManageUsers = hasPermission(user, 'ADMINISTRAR_USUARIOS');

    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [assigningBranch, setAssigningBranch] = useState<Branch | null>(null);
    const [selectingBranchId, setSelectingBranchId] = useState<string | null>(null);
    const [togglingBranchId, setTogglingBranchId] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchAllBranches(token).catch(() => {});
        }
    }, [token, fetchAllBranches]);

    function handleRefresh() {
        if (token) {
            fetchAllBranches(token).catch(() => {});
        }
    }

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
        if (!token || !user) return;
        if (activeBranch?.id === branch.id) return;
        setSelectingBranchId(branch.id);
        try {
            await selectAndEnsureAssigned(branch, user.id, token);
        } catch (err: unknown) {
            showErrorToast(err, 'No se pudo seleccionar la sucursal como activa.');
        } finally {
            setSelectingBranchId(null);
        }
    }

    async function handleToggleActive(branch: Branch) {
        if (!token || togglingBranchId) return;
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
            await toggleBranchActive(branch.id, Boolean(branch.active), token);
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
                    styles.card,
                    !item.active && styles.inactiveCard,
                ]}
            >
                <View style={styles.cardMain}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.branchName, !item.active && styles.inactiveText]}>
                            {item.name}
                        </Text>
                        <View
                            style={[
                                styles.statusBadge,
                                item.active ? styles.activeBadge : styles.inactiveBadge,
                            ]}
                        >
                            <View
                                style={[
                                    styles.statusDot,
                                    { backgroundColor: item.active ? Colors.success : Colors.textSecondary },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: item.active ? Colors.success : Colors.textSecondary },
                                ]}
                            >
                                {item.active ? 'Activa' : 'Inactiva'}
                            </Text>
                        </View>
                    </View>

                    {item.address ? (
                        <View style={styles.infoRow}>
                            <SymbolView
                                name={{ ios: 'mappin', android: 'location_on', web: 'location_on' }}
                                size={14}
                                tintColor={Colors.textSecondary}
                            />
                            <Text style={styles.infoText}>{item.address}</Text>
                        </View>
                    ) : null}

                    {item.phone ? (
                        <View style={styles.infoRow}>
                            <SymbolView
                                name={{ ios: 'phone.fill', android: 'phone', web: 'phone' }}
                                size={14}
                                tintColor={Colors.textSecondary}
                            />
                            <Text style={styles.infoText}>{item.phone}</Text>
                        </View>
                    ) : null}

                    {((item.active && (canSelect || canManageUsers)) || canManageBranches) && (
                        <View style={styles.cardBottomActions}>
                            {item.active && canSelect && (
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.activeSelectButton,
                                        isActiveBranch && styles.selectedActiveButton,
                                        pressed && SharedStyles.pressed,
                                    ]}
                                    onPress={() => handleSelectActive(item)}
                                    disabled={isSelectingThis}
                                >
                                    {isSelectingThis ? (
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    ) : (
                                        <SymbolView
                                            name={{
                                                ios: isActiveBranch ? 'checkmark.circle.fill' : 'circle',
                                                android: isActiveBranch ? 'check_circle' : 'radio_button_unchecked',
                                                web: isActiveBranch ? 'check_circle' : 'radio_button_unchecked',
                                            }}
                                            size={16}
                                            tintColor={isActiveBranch ? Colors.primary : Colors.textSecondary}
                                        />
                                    )}
                                    <Text
                                        style={[
                                            styles.activeSelectText,
                                            isActiveBranch && styles.selectedActiveText,
                                        ]}
                                    >
                                        {isActiveBranch ? 'Sucursal activa seleccionada' : 'Seleccionar como activa'}
                                    </Text>
                                </Pressable>
                            )}

                            {item.active && canManageUsers && (
                                <Pressable
                                    style={({ pressed }) => [styles.usersButton, pressed && SharedStyles.pressed]}
                                    onPress={() => handleOpenUsersAssignment(item)}
                                >
                                    <SymbolView
                                        name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                                        size={15}
                                        tintColor={Colors.primary}
                                    />
                                    <Text style={styles.usersButtonText}>Usuarios</Text>
                                </Pressable>
                            )}

                            {canManageBranches && (
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.toggleButton,
                                        item.active ? styles.deactivateButton : styles.activateButton,
                                        pressed && SharedStyles.pressed,
                                    ]}
                                    onPress={() => handleToggleActive(item)}
                                    disabled={isTogglingThis}
                                >
                                    {isTogglingThis ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={item.active ? Colors.error : Colors.success}
                                        />
                                    ) : (
                                        <SymbolView
                                            name={item.active
                                                ? { ios: 'pause.circle', android: 'block', web: 'block' }
                                                : { ios: 'play.circle', android: 'check_circle', web: 'check_circle' }}
                                            size={15}
                                            tintColor={item.active ? Colors.error : Colors.success}
                                        />
                                    )}
                                    <Text
                                        style={[
                                            styles.toggleButtonText,
                                            { color: item.active ? Colors.error : Colors.success },
                                        ]}
                                    >
                                        {item.active ? 'Desactivar' : 'Activar'}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>

                {canManageBranches && (
                    <View style={styles.actionsRow}>
                        <Pressable
                            style={({ pressed }) => [styles.iconButton, pressed && SharedStyles.pressed]}
                            onPress={() => handleOpenEdit(item)}
                        >
                            <SymbolView
                                name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                                size={18}
                                tintColor={Colors.primary}
                            />
                        </Pressable>
                    </View>
                )}
            </View>
        );
    }


    return (
        <Screen style={styles.container}>
            {/* Header */}
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
                <Text style={SharedStyles.headerTitle}>Sucursales</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            {/* Top banner */}
            <View style={styles.topBanner}>
                <View style={styles.topBannerTextContainer}>
                    <Text style={styles.topBannerTitle}>Gestión de sucursales</Text>
                    <Text style={styles.topBannerSubtitle}>
                        Configurá los locales, depósitos y puntos de venta de la empresa.
                    </Text>
                </View>
                {canManageBranches && (
                    <AppButton
                        title="+ Nueva"
                        onPress={handleOpenCreate}
                        style={styles.addButton}
                    />
                )}
            </View>

            {isLoading && allBranches.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Cargando sucursales...</Text>
                </View>
            ) : error && allBranches.length === 0 ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <AppButton
                        title="Reintentar"
                        onPress={handleRefresh}
                        style={styles.retryButton}
                    />
                </View>
            ) : (
                <FlatList
                    data={allBranches}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={
                        allBranches.length === 0 ? SharedStyles.listEmpty : styles.listContainer
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
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
    topBanner: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    topBannerTextContainer: {
        flex: 1,
    },
    topBannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    topBannerSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    addButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    errorContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        color: Colors.error,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    retryButton: {
        minWidth: 140,
    },
    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inactiveCard: {
        backgroundColor: Colors.background,
        opacity: 0.85,
    },
    cardMain: {
        flex: 1,
        marginRight: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    branchName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    inactiveText: {
        color: Colors.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4,
    },
    activeBadge: {
        backgroundColor: Colors.successSoft,
    },
    inactiveBadge: {
        backgroundColor: Colors.muted,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    infoText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    cardBottomActions: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    activeSelectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: Colors.background,
        alignSelf: 'flex-start',
    },
    selectedActiveButton: {
        backgroundColor: Colors.primaryLight,
    },
    activeSelectText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    selectedActiveText: {
        fontWeight: '600',
        color: Colors.primary,
    },
    usersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: Colors.primaryLight,
    },
    usersButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    deactivateButton: {
        backgroundColor: Colors.errorLight,
    },
    activateButton: {
        backgroundColor: Colors.successSoft,
    },
    toggleButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    iconButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: Colors.primaryLight,
    },
});

