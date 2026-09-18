import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

interface OrderActionsProps {
    isDraft: boolean;
    canEdit: boolean;
    canAdvance: boolean;
    onEdit: () => void;
    onConfirm: () => void;
    onAdvance: () => void;
    onCancel: () => void;
}

export function OrderActions({
    isDraft,
    canEdit,
    canAdvance,
    onEdit,
    onConfirm,
    onAdvance,
    onCancel,
}: OrderActionsProps) {
    return (
        <View style={styles.container}>
            {canEdit && (
                <Pressable style={SharedStyles.buttonSecondary} onPress={onEdit}>
                    <Text style={SharedStyles.buttonSecondaryText}>Editar</Text>
                </Pressable>
            )}

            {isDraft && (
                <>
                    <Pressable style={SharedStyles.buttonPrimary} onPress={onConfirm}>
                        <Text style={SharedStyles.buttonPrimaryText}>Confirmar</Text>
                    </Pressable>
                </>
            )}

            {canAdvance && (
                <Pressable style={SharedStyles.buttonPrimary} onPress={onAdvance}>
                    <Text style={SharedStyles.buttonPrimaryText}>Avanzar estado</Text>
                </Pressable>
            )}

            <Pressable style={SharedStyles.buttonDanger} onPress={onCancel}>
                <Text style={SharedStyles.buttonDangerText}>Cancelar pedido</Text>
            </Pressable>
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
