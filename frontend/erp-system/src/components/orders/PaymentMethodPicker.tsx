import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconName } from '@/components/ui/icon-name';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '@/types/order';

const METHOD_ICONS: Record<PaymentMethod, IconName> = {
    CASH: { ios: 'banknote', android: 'payments', web: 'payments' },
    TRANSFER: { ios: 'building.columns', android: 'account_balance', web: 'account_balance' },
    DEBIT_CARD: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
    CREDIT_CARD: { ios: 'creditcard.fill', android: 'credit_score', web: 'credit_score' },
};

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

type PaymentMethodPickerProps = {
    value: PaymentMethod;
    onChange: (method: PaymentMethod) => void;
    disabled?: boolean;
};

/** Efectivo, transferencia, débito o crédito: dos por fila, con su ícono. */
export function PaymentMethodPicker({ value, onChange, disabled = false }: PaymentMethodPickerProps) {
    return (
        <View style={styles.grid} accessibilityRole="radiogroup">
            {METHODS.map((method) => {
                const selected = value === method;
                return (
                    <Pressable
                        key={method}
                        onPress={() => onChange(method)}
                        disabled={disabled}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled }}
                        style={({ pressed }) => [
                            styles.option,
                            selected && styles.optionSelected,
                            pressed && !selected && styles.optionPressed,
                            disabled && styles.disabled,
                        ]}
                    >
                        <SymbolView
                            name={METHOD_ICONS[method]}
                            size={22}
                            tintColor={selected ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={[styles.label, selected && styles.labelSelected]}>
                            {PAYMENT_METHOD_LABELS[method]}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    option: {
        // Dos por fila: la mitad menos medio espacio entre columnas.
        flexBasis: '47%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
    },
    optionSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    optionPressed: {
        backgroundColor: Colors.muted,
    },
    disabled: {
        opacity: 0.55,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    labelSelected: {
        color: Colors.primary,
        fontWeight: '700',
    },
});
