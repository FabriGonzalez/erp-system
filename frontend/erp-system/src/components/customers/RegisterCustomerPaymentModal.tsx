import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PaymentMethodPicker } from '@/components/orders/PaymentMethodPicker';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import {
    useCustomerAccountSummaryQuery,
    useRegisterPayment,
} from '@/hooks/use-customer-account-queries';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { SharedStyles } from '@/styles/shared';
import { PaymentMethod } from '@/types/order';
import { Payment } from '@/types/payment';
import { formatCurrency } from '@/utils/format';


type RegisterCustomerPaymentModalProps = {
    visible: boolean;
    customerId: string;
    onClose: () => void;
};

/** Registra un pago del cliente; el backend lo aplica a sus pedidos del más viejo al más nuevo. */
export function RegisterCustomerPaymentModal({
    visible,
    customerId,
    onClose,
}: RegisterCustomerPaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('CASH');
    const [error, setError] = useState<string | null>(null);
    const [registered, setRegistered] = useState<Payment | null>(null);
    const activeBranch = useActiveBranch();
    const { summary } = useCustomerAccountSummaryQuery(customerId);
    const registerPayment = useRegisterPayment(customerId);
    const isSubmitting = registerPayment.isPending;

    function handleClose() {
        if (isSubmitting) return;
        setAmount('');
        setMethod('CASH');
        setError(null);
        setRegistered(null);
        onClose();
    }

    async function handleSubmit() {
        if (isSubmitting) return;

        if (!activeBranch) {
            setError('Elegí una sucursal activa para registrar el pago.');
            return;
        }

        const numericAmount = Math.round(Number(amount.replace(',', '.')) * 100) / 100;
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setError('Ingresá un importe mayor que cero.');
            return;
        }

        setError(null);
        setRegistered(null);
        try {
            const payment = await registerPayment.mutateAsync({
                amount: numericAmount,
                method,
                branchId: activeBranch.id,
            });
            setRegistered(payment);
            setAmount('');
        } catch (submissionError) {
            setError(submissionError instanceof Error ? submissionError.message : 'No se pudo registrar el pago.');
        }
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Registrar pago</Text>
                        <Pressable onPress={handleClose} disabled={isSubmitting}>
                            <Text style={styles.close}>Cerrar</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.summary}>
                        Deuda actual: {summary ? formatCurrency(summary.debt) : '—'}
                    </Text>
                    <Text style={styles.summary}>
                        Saldo a favor: {summary ? formatCurrency(summary.credit) : '—'}
                    </Text>
                    <Text style={styles.summary}>
                        Sucursal: {activeBranch?.name ?? 'sin sucursal activa'}
                    </Text>

                    <AppInput
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="Importe recibido"
                        keyboardType="decimal-pad"
                        editable={!isSubmitting}
                    />

                    <Text style={SharedStyles.fieldLabel}>Medio de pago</Text>
                    <PaymentMethodPicker value={method} onChange={setMethod} disabled={isSubmitting} />

                    {error && <Text style={styles.error}>{error}</Text>}

                    {registered && (
                        <View style={styles.result}>
                            <Text style={styles.success}>
                                Pago de {formatCurrency(registered.amount)} registrado.
                            </Text>
                            {registered.allocations.map((allocation) => (
                                <Text key={allocation.orderId} style={styles.resultLine}>
                                    {allocation.orderNumber}: {formatCurrency(allocation.amount)}
                                </Text>
                            ))}
                            {registered.unallocatedAmount > 0 && (
                                <Text style={styles.resultLine}>
                                    Quedó como saldo a favor: {formatCurrency(registered.unallocatedAmount)}
                                </Text>
                            )}
                        </View>
                    )}

                    <AppButton
                        title={isSubmitting ? 'Registrando...' : 'Confirmar pago'}
                        onPress={() => void handleSubmit()}
                        disabled={isSubmitting || !activeBranch}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    modal: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '700',
    },
    close: {
        color: Colors.primary,
        fontWeight: '600',
    },
    summary: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    error: {
        color: Colors.error,
        fontSize: 13,
    },
    result: {
        backgroundColor: Colors.successLight,
        borderRadius: 10,
        padding: Spacing.md,
        gap: 2,
    },
    success: {
        color: Colors.successDark,
        fontSize: 14,
        fontWeight: '600',
    },
    resultLine: {
        color: Colors.successDark,
        fontSize: 13,
    },
});
