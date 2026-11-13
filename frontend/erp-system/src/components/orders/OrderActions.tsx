import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

interface OrderActionsProps {
    canEdit: boolean;
    canDispatch: boolean;
    canCancel: boolean;
    /** Pedido web a asignar: abre el modal para elegir la sucursal. */
    canAssign?: boolean;
    isBusy?: boolean;
    onEdit: () => void;
    onDispatch: () => void;
    onCancel: () => void;
    onAssign?: () => void;
}

export function OrderActions({
    canEdit,
    canDispatch,
    canCancel,
    canAssign = false,
    isBusy = false,
    onEdit,
    onDispatch,
    onCancel,
    onAssign,
}: OrderActionsProps) {
    return (
        <View style={styles.container}>
            {canAssign && (
                <Pressable style={SharedStyles.buttonPrimary} onPress={onAssign} disabled={isBusy}>
                    <Text style={SharedStyles.buttonPrimaryText}>Asignar sucursal</Text>
                </Pressable>
            )}

            {canEdit && (
                <Pressable style={SharedStyles.buttonSecondary} onPress={onEdit} disabled={isBusy}>
                    <Text style={SharedStyles.buttonSecondaryText}>Editar</Text>
                </Pressable>
            )}

            {canDispatch && (
                <Pressable style={SharedStyles.buttonPrimary} onPress={onDispatch} disabled={isBusy}>
                    <Text style={SharedStyles.buttonPrimaryText}>Despachar</Text>
                </Pressable>
            )}

            {canCancel && (
                <Pressable style={SharedStyles.buttonDanger} onPress={onCancel} disabled={isBusy}>
                    <Text style={SharedStyles.buttonDangerText}>Cancelar pedido</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
});
