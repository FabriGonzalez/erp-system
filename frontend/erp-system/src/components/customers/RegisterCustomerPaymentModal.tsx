import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PaymentMethodPicker } from '@/components/orders/PaymentMethodPicker';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { InfoRow } from '@/components/ui/InfoRow';
import { ListGroup } from '@/components/ui/ListGroup';
import { ModalCard } from '@/components/ui/ModalCard';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import {
    useCustomerAccountSummaryQuery,
    useRegisterPayment,
} from '@/hooks/use-customer-account-queries';
import { useActiveBranch } from '@/hooks/use-branch-queries';
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
        <ModalCard
            visible={visible}
            title="Registrar pago"
            onClose={handleClose}
            closeDisabled={isSubmitting}
            error={error}
            footer={[
                <AppButton key="close" title="Cerrar" variant="secondary" onPress={handleClose} disabled={isSubmitting} />,
                <AppButton
                    key="save"
                    title={isSubmitting ? 'Registrando...' : 'Confirmar pago'}
                    onPress={() => void handleSubmit()}
                    disabled={isSubmitting || !activeBranch}
                />,
            ]}
        >
            <ListGroup>
                <InfoRow label="Deuda actual" value={summary ? formatCurrency(summary.debt) : '—'} />
                <InfoRow label="Saldo a favor" value={summary ? formatCurrency(summary.credit) : '—'} />
                <InfoRow label="Sucursal" value={activeBranch?.name ?? 'Sin sucursal activa'} />
            </ListGroup>

            <FormField label="Importe recibido">
                <AppInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    editable={!isSubmitting}
                />
            </FormField>

            <FormField label="Medio de pago">
                <PaymentMethodPicker value={method} onChange={setMethod} disabled={isSubmitting} />
            </FormField>

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
        </ModalCard>
    );
}

const styles = StyleSheet.create({
    result: {
        backgroundColor: Colors.successLight,
        borderRadius: Radius.sm,
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
