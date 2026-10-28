import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { PaymentMethodPicker } from '@/components/orders/PaymentMethodPicker';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import {
    DeliveryType,
    ORDER_STATUS_LABELS,
} from '@/types/order';
import { orderStatusTone } from '@/utils/status';
import { AppInput } from '../ui/AppInput';


type OrderSummarySectionProps = {
    total: number;
    // Saldo a favor del cliente que se aplicará a esta orden.
    creditApplied?: number;
    // En edición no se registran pagos.
    showPayment?: boolean;
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
    creditApplied = 0,
    showPayment = true,
    deliveryType,
    branchName,
    isSubmitting,
    submitLabel = 'Crear Pedido',
    onSubmit,
    onCancel,
    disabled = false,
}: OrderSummarySectionProps) {
    const setAmountPaid = useOrderDraftStore((state) => state.setAmountPaid);
    const paymentMethod = useOrderDraftStore((state) => state.paymentMethod);
    const setPaymentMethod = useOrderDraftStore((state) => state.setPaymentMethod);
    const [paymentMode, setPaymentMode] = useState<'TOTAL' | 'PARTIAL'>('TOTAL');

    const customer = useOrderDraftStore((state) => state.customer);

    const isAnonymousCustomer = customer.id === CUSTOMER_ANONYMOUS.id;

    const [inputValue, setInputValue] = useState('');

    // Las ventas sin cliente se cobran completas al crearse.
    const effectivePaymentMode = isAnonymousCustomer ? 'TOTAL' : paymentMode;

    const isPickup = deliveryType === 'LOCAL_PICKUP';

    const safeTotal = Math.max(0, total);
    const safeCreditApplied = isAnonymousCustomer
        ? 0
        : Math.min(Math.max(0, creditApplied), safeTotal);
    const amountToCharge = safeTotal - safeCreditApplied;

    const parsedInput = Number(inputValue);
    const parsedAmount = Number.isFinite(parsedInput)
        ? Math.min(Math.max(0, parsedInput), amountToCharge)
        : 0;

    const effectiveAmountPaid =
        effectivePaymentMode === 'TOTAL' ? amountToCharge : parsedAmount;

    function handleInputChange(text: string) {
        setInputValue(text.replace(/[^0-9]/g, ''));
    }

    function handleSelectTotal() {
        setPaymentMode('TOTAL');
    }

    function handleSelectPartial() {
        if (isAnonymousCustomer) {
            return;
        }

        setPaymentMode('PARTIAL');
    }

    function handleSubmit() {
        // La pantalla lee el importe del store en el momento del envío.
        setAmountPaid(showPayment ? effectiveAmountPaid : 0);
        onSubmit();
    }

    return (
        <View style={styles.container}>
            <Text style={SharedStyles.sectionTitle}>Resumen del pedido</Text>
            <View style={styles.summaryCard}>

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
                    <StatusPill
                        label={ORDER_STATUS_LABELS[isPickup ? 'CONFIRMED' : 'TO_PREPARE']}
                        tone={orderStatusTone(isPickup ? 'CONFIRMED' : 'TO_PREPARE')}
                    />
                </View>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total final:</Text>
                    <Text style={styles.totalValue}>
                        ${safeTotal.toLocaleString('es-AR')}
                    </Text>
                </View>

                {showPayment && safeCreditApplied > 0 && (
                    <>
                        <View style={[styles.summaryRow, styles.creditRow]}>
                            <Text style={styles.summaryLabel}>Saldo a favor aplicado:</Text>
                            <Text style={styles.creditValue}>
                                -${safeCreditApplied.toLocaleString('es-AR')}
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>A cobrar:</Text>
                            <Text style={styles.summaryValue}>
                                ${amountToCharge.toLocaleString('es-AR')}
                            </Text>
                        </View>
                    </>
                )}

                {showPayment && (
                    <>
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
                        )}

                        {/* Siempre se elige: sin cliente queda en el pedido, con cliente va en el pago. */}
                        <Text style={styles.entregaTitle}>Medio de pago</Text>
                        <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} disabled={isSubmitting} />
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
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
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
    creditRow: {
        marginTop: Spacing.sm,
    },
    creditValue: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.successDark,
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
        borderRadius: Radius.md,
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
        borderRadius: Radius.md,
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
