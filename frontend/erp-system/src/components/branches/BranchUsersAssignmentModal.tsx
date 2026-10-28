import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalCard } from '@/components/ui/ModalCard';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { ToneColors } from '@/constants/tones';
import { useBranchUsers, useToggleBranchUser } from '@/hooks/use-branch-queries';
import { useCompanyUsers } from '@/hooks/use-user-queries';
import { SharedStyles } from '@/styles/shared';
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
        <ModalCard
            title="Usuarios asignados"
            subtitle={`Sucursal ${branch.name}`}
            onClose={onClose}
            error={errorMessage}
            scroll={false}
            footer={[<AppButton key="done" title="Listo" onPress={onClose} />]}
        >
            {isLoading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loading} />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => String(item.id)}
                    style={styles.list}
                    ItemSeparatorComponent={Separator}
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
                                    fontWeight="700"
                                    backgroundColor={isAssigned ? ToneColors.violet.background : Colors.muted}
                                    textColor={isAssigned ? ToneColors.violet.foreground : Colors.textSecondary}
                                />
                                <View style={SharedStyles.listItemTexts}>
                                    <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
                                    <Text style={SharedStyles.listItemMeta} numberOfLines={1}>
                                        {item.roleName} · {item.email || item.username}
                                    </Text>
                                </View>
                                {isToggling && <ActivityIndicator size="small" color={Colors.primary} />}
                                <Switch
                                    value={isAssigned}
                                    onValueChange={() => handleToggleUser(item)}
                                    disabled={isToggling}
                                    trackColor={{ false: Colors.track, true: Colors.primary }}
                                    thumbColor={Colors.white}
                                    accessibilityLabel={fullName}
                                />
                            </View>
                        );
                    }}
                />
            )}
        </ModalCard>
    );
}

function Separator() {
    return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
    loading: {
        paddingVertical: Spacing.xxl,
    },
    list: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.lg,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.border,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.md,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
});
