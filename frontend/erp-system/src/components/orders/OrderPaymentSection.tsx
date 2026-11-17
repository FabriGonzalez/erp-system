import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PaymentMethodPicker } from '@/components/orders/PaymentMethodPicker';
import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { PaymentMethod } from '@/types/order';
import { formatCurrency } from '@/utils/format';

export type PaymentMode = 'TOTAL' | 'PARTIAL';

type OrderPaymentSectionProps = {
    creditApplied: number;
    amountToCharge: number;
    /** Sin cliente se cobra todo: el pago parcial queda deshabilitado. */
    isAnonymousCustomer: boolean;
    paymentMode: PaymentMode;
    onChangePaymentMode: (mode: PaymentMode) => void;
    partialAmount: string;
    onChangePartialAmount: (value: string) => void;
    paymentMethod: PaymentMethod;
    onChangePaymentMethod: (method: PaymentMethod) => void;
    disabled?: boolean;
};

/** Cómo paga: medio de pago, todo o una parte, y el saldo a favor que se descuenta. */
export function OrderPaymentSection({
    creditApplied,
    amountToCharge,
    isAnonymousCustomer,
    paymentMode,
    onChangePaymentMode,
    partialAmount,
    onChangePartialAmount,
    paymentMethod,
    onChangePaymentMethod,
    disabled = false,
}: OrderPaymentSectionProps) {
    const modes: { mode: PaymentMode; label: string }[] = [
        { mode: 'TOTAL', label: 'Paga todo' },
        { mode: 'PARTIAL', label: 'Paga una parte' },
    ];

    return (
        <View style={styles.container}>
            <Text style={[SharedStyles.sectionTitle, styles.title]}>Cobro</Text>

            {creditApplied > 0 ? (
                <View style={[SharedStyles.card, styles.credit]}>
                    <View style={styles.creditRow}>
                        <Text style={styles.creditLabel}>Saldo a favor aplicado</Text>
                        <Text style={styles.creditValue}>-{formatCurrency(creditApplied)}</Text>
                    </View>
                    <View style={styles.creditRow}>
                        <Text style={styles.chargeLabel}>A cobrar</Text>
                        <Text style={styles.chargeValue}>{formatCurrency(amountToCharge)}</Text>
                    </View>
                </View>
            ) : null}

            <PaymentMethodPicker value={paymentMethod} onChange={onChangePaymentMethod} disabled={disabled} />

            <View style={styles.segmented} accessibilityRole="radiogroup">
                {modes.map(({ mode, label }) => {
                    const selected = paymentMode === mode;
                    const isDisabled = disabled || (mode === 'PARTIAL' && isAnonymousCustomer);
                    return (
                        <Pressable
                            key={mode}
                            style={[styles.segment, selected && styles.segmentSelected]}
                            onPress={() => onChangePaymentMode(mode)}
                            disabled={isDisabled}
                            accessibilityRole="radio"
                            accessibilityState={{ selected, disabled: isDisabled }}
                        >
                            <Text style={[
                                styles.segmentText,
                                selected && styles.segmentTextSelected,
                                isDisabled && !selected && styles.segmentTextDisabled,
                            ]}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {isAnonymousCustomer ? (
                <Text style={styles.hint}>Para que pague una parte, elegí un cliente registrado.</Text>
            ) : null}

            {paymentMode === 'PARTIAL' ? (
                <View style={styles.amountRow}>
                    <Text style={styles.currency}>$</Text>
                    <AppInput
                        style={styles.amountInput}
                        value={partialAmount}
                        onChangeText={(text) => onChangePartialAmount(text.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        placeholder="0"
                        maxLength={12}
                        editable={!disabled}
                        accessibilityLabel="Importe que paga ahora"
                    />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    title: {
        marginBottom: 0,
    },
    credit: {
        padding: Spacing.md,
        gap: Spacing.xs,
    },
    creditRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    creditLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    creditValue: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.successDark,
    },
    chargeLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    chargeValue: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text,
    },
    segmented: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: Radius.md,
        backgroundColor: Colors.muted,
    },
    segment: {
        flex: 1,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.sm,
    },
    segmentSelected: {
        backgroundColor: Colors.surface,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.12)',
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    segmentTextSelected: {
        color: Colors.text,
    },
    segmentTextDisabled: {
        color: Colors.textTertiary,
    },
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
    },
    currency: {
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
});
