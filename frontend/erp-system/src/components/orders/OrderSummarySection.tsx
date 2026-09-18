import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import { DeliveryType, getBalanceDue, getPaymentStatus } from '@/types/order';
import { AppInput } from '../ui/AppInput';

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
    const [paymentMode, setPaymentMode] = useState<'TOTAL' | 'PARTIAL'>('TOTAL');

    const customer = useOrderDraftStore((state) => state.customer);

    const isAnonymousCustomer = customer.id === CUSTOMER_ANONYMOUS.id;

    const [inputValue, setInputValue] = useState(
        amountPaid > 0 ? String(amountPaid) : '',
    );

    const effectivePaymentMode = isAnonymousCustomer ? 'TOTAL' : paymentMode;

    const isPickup = deliveryType === 'LOCAL_PICKUP';

    const parsedInput = Number(inputValue);
    const parsedAmount = Number.isFinite(parsedInput)
        ? Math.min(Math.max(0, parsedInput), total)
        : 0;

    const effectiveAmountPaid =
        effectivePaymentMode === 'TOTAL' ? total : parsedAmount;

    const balanceDue = getBalanceDue({
        total,
        amountPaid: effectiveAmountPaid,
    });

    const paymentStatus = getPaymentStatus({
        total,
        amountPaid: effectiveAmountPaid,
    });

    function handleInputChange(text: string) {
        const cleaned = text.replace(/[^0-9]/g, '');
        setInputValue(cleaned);
        const parsedValue = Number(cleaned);
        const value = Number.isFinite(parsedValue)
            ? Math.min(Math.max(0, parsedValue), Math.max(0, total))
            : 0;
        setAmountPaid(value);
    }

    function handleSelectTotal() {
        setPaymentMode('TOTAL');
        setInputValue(String(Math.max(0, total)));
        setAmountPaid(Math.max(0, total));
    }

    function handleSelectPartial() {
        if (isAnonymousCustomer) {
            return;
        }

        setPaymentMode('PARTIAL');
    }

    function handleSubmit() {
        setAmountPaid(effectiveAmountPaid);
        onSubmit();
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
                <Text style={[SharedStyles.cardTitle, styles.summaryTitle]}>Resumen del pedido</Text>

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

                <View style={styles.divider} />

                <Text style={styles.entregaTitle}>Pagó</Text>

                <View style={styles.paymentOptions}>
                    <Pressable
                        style={[
                            styles.paymentOption,
                            effectivePaymentMode === 'TOTAL' && styles.paymentOptionActive,
                        ]}
                        onPress={handleSelectTotal}
                    >
                        <Text
                            style={[
                                styles.paymentOptionText,
                                effectivePaymentMode === 'TOTAL' &&
                                styles.paymentOptionTextActive,
                            ]}
                        >
                            Total
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.paymentOption,
                            effectivePaymentMode === 'PARTIAL' &&
                            styles.paymentOptionActive,
                            isAnonymousCustomer &&
                            styles.paymentOptionDisabled,
                        ]}
                        onPress={handleSelectPartial}
                        disabled={isAnonymousCustomer}
                    >
                        <Text
                            style={[
                                styles.paymentOptionText,
                                effectivePaymentMode === 'PARTIAL' &&
                                styles.paymentOptionTextActive,
                                isAnonymousCustomer &&
                                styles.paymentOptionTextDisabled,
                            ]}
                        >
                            Parcial
                        </Text>
                    </Pressable>
                </View>

                {isAnonymousCustomer && (
                    <Text style={styles.paymentRestriction}>
                        El pago parcial requiere un cliente identificado.
                    </Text>
                )}

                {effectivePaymentMode === 'PARTIAL' && (
                    <>
                        <View style={styles.inputRow}>
                            <Text style={styles.currencyPrefix}>$</Text>
                            <AppInput
                                style={styles.amountInput}
                                value={inputValue}
                                onChangeText={handleInputChange}
                                keyboardType="numeric"
                                placeholder="0"
                                maxLength={12}
                            />
                        </View>

                        <View style={styles.balanceRow}>
                            <View
                                style={[
                                    styles.statusPill,
                                    { backgroundColor: paymentStatusBg },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusPillText,
                                        { color: paymentStatusColor },
                                    ]}
                                >
                                    {paymentStatusLabel}
                                </Text>
                            </View>

                            {balanceDue > 0 && (
                                <Text style={styles.balanceText}>
                                    Debe: ${balanceDue.toLocaleString('es-AR')}
                                </Text>
                            )}
                        </View>
                    </>
                )}
            </View>

            <View style={styles.actionsContainer}>
                <Pressable
                    style={[
                        SharedStyles.buttonSubmit,
                        (isSubmitting || disabled) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || disabled}
                >
                    {isSubmitting ? (
                        <View style={styles.submittingContent}>
                            <ActivityIndicator size="small" color={Colors.white} />
                            <Text style={SharedStyles.buttonSubmitText}>Procesando...</Text>
                        </View>
                    ) : (
                        <Text style={SharedStyles.buttonSubmitText}>{submitLabel}</Text>
                    )}
                </Pressable>

                <Pressable
                    style={SharedStyles.buttonCancel}
                    onPress={onCancel}
                    disabled={isSubmitting}
                >
                    <Text style={SharedStyles.buttonCancelText}>Cancelar</Text>
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
    entregaTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
    },
    currencyPrefix: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        marginRight: Spacing.xs,
    },
    amountInput: {
        flex: 1,
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        paddingVertical: Spacing.sm,

        borderWidth: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
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
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submittingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },

    paymentOptions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },

    paymentOption: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },

    paymentOptionActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },

    paymentOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },

    paymentOptionTextActive: {
        color: Colors.primary,
    },

    paymentOptionDisabled: {
        opacity: 0.45,
    },

    paymentRestriction: {
        fontSize: 12,
        color: Colors.error,
        marginTop: -Spacing.sm,
        marginBottom: Spacing.sm,
    },

    paymentOptionTextDisabled: {
        color: Colors.textSecondary,
    },
});
