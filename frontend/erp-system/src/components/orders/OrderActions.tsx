import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface OrderActionsProps {
    isDraft: boolean;
    canAdvance: boolean;
    onEdit: () => void;
    onConfirm: () => void;
    onAdvance: () => void;
    onCancel: () => void;
}

export function OrderActions({
    isDraft,
    canAdvance,
    onEdit,
    onConfirm,
    onAdvance,
    onCancel,
}: OrderActionsProps) {
    return (
        <View style={styles.container}>
            {isDraft && (
                <>
                    <Pressable style={styles.editButton} onPress={onEdit}>
                        <Text style={styles.editButtonText}>Editar</Text>
                    </Pressable>

                    <Pressable style={styles.confirmButton} onPress={onConfirm}>
                        <Text style={styles.confirmButtonText}>Confirmar</Text>
                    </Pressable>
                </>
            )}

            {canAdvance && (
                <Pressable style={styles.advanceButton} onPress={onAdvance}>
                    <Text style={styles.advanceButtonText}>Avanzar estado</Text>
                </Pressable>
            )}

            <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancelar pedido</Text>
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

    editButton: {
        flex: 1,
        minWidth: 100,
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
    },

    editButtonText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },

    confirmButton: {
        flex: 1,
        minWidth: 100,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },

    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    advanceButton: {
        flex: 1,
        minWidth: 100,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },

    advanceButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    cancelButton: {
        width: '100%',
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },

    cancelButtonText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
});
