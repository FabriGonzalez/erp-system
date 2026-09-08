import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { DeliveryType, getBalanceDue, getPaymentStatus } from '@/types/order';

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
    const amountPaid = useOrderDraftStore((state) => state.amountPaid);
    const setAmountPaid = useOrderDraftStore((state) => state.setAmountPaid);

    const [inputValue, setInputValue] = useState(
        amountPaid > 0 ? String(amountPaid) : '',
    );
    const isFirstMount = useRef(true);

    // Sync input when total changes (e.g. items updated)
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        // If user had paid total, keep it in sync with new total
        if (amountPaid > 0 && amountPaid === total) {
            setInputValue(String(total));
        }
    }, [total]);

    const isPickup = deliveryType === 'LOCAL_PICKUP';

    const parsedAmount = Math.min(
        Math.max(0, parseFloat(inputValue) || 0),
        total,
    );

    const balanceDue = getBalanceDue({ total, amountPaid: parsedAmount });
    const paymentStatus = getPaymentStatus({ total, amountPaid: parsedAmount });

    function handleInputChange(text: string) {
        const cleaned = text.replace(/[^0-9]/g, '');
        setInputValue(cleaned);
        const value = Math.min(Math.max(0, parseInt(cleaned, 10) || 0), total);
        setAmountPaid(value);
    }

    function handlePayTotal() {
        setInputValue(String(total));
        setAmountPaid(total);
    }

    const paymentStatusColor =
        paymentStatus === 'PAID'
            ? Colors.success
            : paymentStatus === 'PARTIAL'
                ? Colors.warning
                : Colors.error;

    const paymentStatusBg =
        paymentStatus === 'PAID'
            ? Colors.successLight
            : paymentStatus === 'PARTIAL'
                ? Colors.warningLight
                : Colors.errorLight;

    const paymentStatusLabel =
        paymentStatus === 'PAID'
            ? 'Pagado'
            : paymentStatus === 'PARTIAL'
                ? 'Pago parcial'
                : 'Pendiente';

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
                    <StatusBadge
                        status={isPickup ? 'CONFIRMED' : 'DRAFT'}
                        label={isPickup ? 'CONFIRMED' : 'DRAFT'}
                        showDot={false}
                    />
                </View>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total final:</Text>
                    <Text style={styles.totalValue}>
                        ${total.toLocaleString('es-AR')}
                    </Text>
                </View>

                {/* Entregó */}
                <View style={styles.divider} />

                <View style={styles.entregaHeader}>
                    <Text style={styles.entregaTitle}>Entregó</Text>
                    <Pressable
                        style={styles.payTotalBtn}
                        onPress={handlePayTotal}
                        disabled={total === 0}
                    >
                        <Text style={styles.payTotalBtnText}>Pagar total</Text>
                    </Pressable>
                </View>

                <View style={styles.inputRow}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={inputValue}
                        onChangeText={handleInputChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={Colors.textSecondary}
                        maxLength={12}
                        editable={total > 0}
                    />
                </View>

                <View style={styles.balanceRow}>
                    <View style={[styles.statusPill, { backgroundColor: paymentStatusBg }]}>
                        <Text style={[styles.statusPillText, { color: paymentStatusColor }]}>
                            {paymentStatusLabel}
                        </Text>
                    </View>
                    {balanceDue > 0 && (
                        <Text style={styles.balanceText}>
                            Debe: ${balanceDue.toLocaleString('es-AR')}
                        </Text>
                    )}
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
                            <ActivityIndicator size="small" color={Colors.white} />
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
    entregaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    entregaTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    payTotalBtn: {
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 6,
    },
    payTotalBtnText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.muted,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
    },
    currencyPrefix: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginRight: 4,
    },
    amountInput: {
        flex: 1,
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        paddingVertical: Spacing.sm,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    statusPill: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 20,
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    balanceText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.error,
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
        color: Colors.white,
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
