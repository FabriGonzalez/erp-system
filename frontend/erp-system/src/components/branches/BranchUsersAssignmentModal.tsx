import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchUsers, useToggleBranchUser } from '@/hooks/use-branch-queries';
import { useCompanyUsers } from '@/hooks/use-user-queries';
import { Branch } from '@/types/branch';
import { CompanyUser } from '@/types/user';
import { getInitials } from '@/utils/format';

type BranchUsersAssignmentModalProps = {
    visible: boolean;
    branch: Branch | null;
    onClose: () => void;
};

/**
 * Usuarios asignados a una sucursal. El contenido se monta al abrirlo: así las queries se
 * piden (o se refrescan si quedaron viejas) recién cuando hace falta.
 */
export function BranchUsersAssignmentModal({ visible, branch, onClose }: BranchUsersAssignmentModalProps) {
    if (!visible || !branch) return null;
    return <AssignmentModal branch={branch} onClose={onClose} />;
}

function AssignmentModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
    const companyUsers = useCompanyUsers();
    const branchUsers = useBranchUsers(branch.id);
    const toggleUser = useToggleBranchUser(branch.id);
    const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
    // Dentro del modal: en el celular un toast quedaría tapado por el Modal.
    const [actionError, setActionError] = useState<string | null>(null);

    const users = companyUsers.users;
    // La lista de asignados se actualiza enseguida al tocar el switch (optimista) y vuelve
    // atrás solo si el backend falla.
    const assignedUserIds = new Set(branchUsers.users.map((user) => user.id));
    const isLoading = companyUsers.isLoading || branchUsers.isLoading;
    const errorMessage = actionError ?? companyUsers.error ?? branchUsers.error;

    async function handleToggleUser(targetUser: CompanyUser) {
        if (togglingUserId) return;
        setTogglingUserId(targetUser.id);
        setActionError(null);
        try {
            await toggleUser.mutateAsync({ user: targetUser, assign: !assignedUserIds.has(targetUser.id) });
        } catch (err: unknown) {
            setActionError(err instanceof Error && err.message
                ? err.message
                : 'No se pudo actualizar la asignación del usuario.');
        } finally {
            setTogglingUserId(null);
        }
    }

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.headerRow}>
                        <View style={styles.headerTitles}>
                            <Text style={styles.title}>Usuarios asignados</Text>
                            <Text style={styles.subtitle}>
                                Sucursal: <Text style={styles.branchName}>{branch.name}</Text>
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <SymbolView
                                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                                size={20}
                                tintColor={Colors.textSecondary}
                            />
                        </Pressable>
                    </View>

                    {errorMessage ? (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.loadingText}>Cargando usuarios...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={users}
                            keyExtractor={(item) => String(item.id)}
                            contentContainerStyle={styles.listContainer}
                            ListEmptyComponent={
                                <EmptyState
                                    title="Sin usuarios"
                                    description="No se encontraron usuarios registrados en la empresa."
                                />
                            }
                            renderItem={({ item }) => {
                                const userId = String(item.id);
                                const isAssigned = assignedUserIds.has(userId);
                                const isToggling = togglingUserId === userId;
                                const fullName = `${item.firstName} ${item.lastName}`.trim() || item.username;

                                return (
                                    <View style={styles.userRow}>
                                        <Avatar
                                            initials={getInitials(fullName)}
                                            size={38}
                                            fontSize={13}
                                            fontWeight="600"
                                            backgroundColor={isAssigned ? Colors.primary : Colors.muted}
                                            textColor={isAssigned ? Colors.white : Colors.textSecondary}
                                            style={styles.avatar}
                                        />

                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{fullName}</Text>
                                            <Text style={styles.userEmail}>{item.email || item.username}</Text>
                                            <Text style={styles.userRole}>{item.roleName}</Text>
                                        </View>

                                        <View style={styles.switchWrapper}>
                                            {isToggling && (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={Colors.primary}
                                                    style={styles.inlineSpinner}
                                                />
                                            )}
                                            <Switch
                                                value={isAssigned}
                                                onValueChange={() => handleToggleUser(item)}
                                                disabled={isToggling}
                                                trackColor={{ false: Colors.track, true: Colors.primary }}
                                                thumbColor={Colors.white}
                                            />
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    )}

                    <View style={styles.footer}>
                        <AppButton
                            title="Listo"
                            onPress={onClose}
                            style={styles.doneButton}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 460,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    headerTitles: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    branchName: {
        fontWeight: '600',
        color: Colors.primary,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    errorBanner: {
        backgroundColor: Colors.errorLight,
        borderColor: Colors.errorBorder,
        borderWidth: 1,
        borderRadius: 10,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
    loadingContainer: {
        padding: Spacing.xxl,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    listContainer: {
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Spacing.md,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatar: {
        marginRight: Spacing.md,
    },
    userInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    userEmail: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    userRole: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: '500',
        marginTop: 2,
    },
    switchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    inlineSpinner: {
        transform: [{ scale: 0.8 }],
    },
    footer: {
        marginTop: Spacing.lg,
        alignItems: 'flex-end',
    },
    doneButton: {
        minWidth: 100,
    },
});
