import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { DeliveryType } from '@/types/order';

type OrderSummarySectionProps = {
    total: number;
    itemsCount: number;
    deliveryType: DeliveryType;
    branchName: string;
    isSubmitting: boolean;
    submitLabel?: string;
    onSubmit: () => void;
    onCancel: () => void;
    disabled?: boolean;
};

export function OrderSummarySection({
    total,
    itemsCount,
    deliveryType,
    branchName,
    isSubmitting,
    submitLabel = 'Crear Pedido',
    onSubmit,
    onCancel,
    disabled = false,
}: OrderSummarySectionProps) {
    const isPickup = deliveryType === 'LOCAL_PICKUP';

    return (
        <View style={styles.container}>
            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Resumen del pedido</Text>

                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Sucursal:</Text>
                    <Text style={styles.summaryValue}>{branchName}</Text>
                </View>

                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tipo de entrega:</Text>
                    <Text style={styles.summaryValue}>
                        {isPickup ? 'Retiro en local' : 'Envío a domicilio'}
                    </Text>
                </View>

                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Estado inicial:</Text>
                    <View style={[styles.statusBadge, isPickup ? styles.statusConfirmed : styles.statusDraft]}>
                        <Text style={[styles.statusBadgeText, isPickup ? styles.statusConfirmedText : styles.statusDraftText]}>
                            {isPickup ? 'CONFIRMED' : 'DRAFT'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total final:</Text>
                    <Text style={styles.totalValue}>${total.toLocaleString('es-AR')}</Text>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <Pressable
                    style={[
                        styles.submitButton,
                        (isSubmitting || disabled) && styles.submitButtonDisabled,
                    ]}
                    onPress={onSubmit}
                    disabled={isSubmitting || disabled}
                >
                    {isSubmitting ? (
                        <View style={styles.submittingContent}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.submitButtonText}>Procesando...</Text>
                        </View>
                    ) : (
                        <Text style={styles.submitButtonText}>{submitLabel}</Text>
                    )}
                </Pressable>

                <Pressable
                    style={styles.cancelButton}
                    onPress={onCancel}
                    disabled={isSubmitting}
                >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    summaryCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    summaryLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    summaryValue: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    statusBadge: {
        paddingHorizontal: Spacing.xs + 2,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusConfirmed: {
        backgroundColor: '#E0F2FE',
    },
    statusConfirmedText: {
        color: '#0369A1',
    },
    statusDraft: {
        backgroundColor: '#F1F5F9',
    },
    statusDraftText: {
        color: '#475569',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.sm,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.primary,
    },
    actionsContainer: {
        gap: Spacing.sm,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submittingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    cancelButtonText: {
        color: Colors.textSecondary,
        fontSize: 15,
        fontWeight: '500',
    },
});
