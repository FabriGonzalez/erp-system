import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerAccountStore } from '@/stores/customer-account-store';
import { Order } from '@/types/order';
import { formatCurrency } from '@/utils/format';

type RegisterCustomerPaymentModalProps = {
    visible: boolean;
    customerId: string;
    orders: Order[];
    branchId?: string;
    onClose: () => void;
};

export function RegisterCustomerPaymentModal({
    visible,
    customerId,
    orders,
    branchId,
    onClose,
}: RegisterCustomerPaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const recordCustomerPayment = useCustomerAccountStore((state) => state.recordCustomerPayment);
    const debt = useCustomerAccountStore((state) => state.getCustomerDebt(customerId, orders));
    const credit = useCustomerAccountStore((state) => state.getCustomerCredit(customerId));

    function handleClose() {
        setAmount('');
        setError(null);
        setResult(null);
        onClose();
    }

    function handleSubmit() {
        const numericAmount = Number(amount.replace(',', '.'));
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setError('Ingresá un importe mayor que cero.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const paymentResult = recordCustomerPayment({
                customerId,
                amount: numericAmount,
                orders,
                branchId,
            });
            setResult(
                `Pago registrado. Aplicado: ${formatCurrency(numericAmount - paymentResult.remainingAmount)}. ` +
                `Saldo a favor: ${formatCurrency(paymentResult.remainingAmount)}.`,
            );
            setAmount('');
        } catch (submissionError) {
            setError(submissionError instanceof Error ? submissionError.message : 'No se pudo registrar el pago.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Registrar pago</Text>
                        <Pressable onPress={handleClose}>
                            <Text style={styles.close}>Cerrar</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.summary}>Deuda actual: {formatCurrency(debt)}</Text>
                    <Text style={styles.summary}>Saldo a favor: {formatCurrency(credit)}</Text>
                    <AppInput
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="Importe recibido"
                        keyboardType="decimal-pad"
                        autoFocus
                    />
                    {error && <Text style={styles.error}>{error}</Text>}
                    {result && <Text style={styles.success}>{result}</Text>}
                    <AppButton
                        title={isSubmitting ? 'Registrando...' : 'Confirmar pago'}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
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
    success: {
        color: Colors.success,
        fontSize: 13,
    },
});
