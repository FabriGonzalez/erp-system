import { StyleSheet, Switch, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { CUSTOMER_ANONYMOUS, Customer } from '@/types/customer';
import { formatCurrency } from '@/utils/format';

type OrderCustomerNoticesProps = {
    customer: Customer;
    customerCredit?: number;
    customerDebt?: number;
    pendingOrders?: number;
    applyCredit?: boolean;
    // Si no se pasa, el saldo a favor se muestra sin opción de usarlo.
    onToggleApplyCredit?: (applyCredit: boolean) => void;
};

/** Deuda y saldo a favor del cliente elegido (el cliente en sí va en OrderTotalCard). */
export function OrderCustomerNotices({
    customer,
    customerCredit = 0,
    customerDebt = 0,
    pendingOrders = 0,
    applyCredit = false,
    onToggleApplyCredit,
}: OrderCustomerNoticesProps) {
    const isAnonymous = customer.id === CUSTOMER_ANONYMOUS.id;
    const showDebt = !isAnonymous && customerDebt > 0;
    const showCredit = !isAnonymous && customerCredit > 0;

    if (!showDebt && !showCredit) {
        return null;
    }

    return (
        <View style={styles.container}>
            {showDebt && (
                <View style={styles.debtNotice}>
                    <Text style={styles.debtText}>
                        Debe {formatCurrency(customerDebt)}
                        {pendingOrders > 0
                            ? ` en ${pendingOrders} ${pendingOrders === 1 ? 'pedido' : 'pedidos'}`
                            : ''}
                        . El pago de esta venta se asigna solo a este pedido.
                    </Text>
                </View>
            )}

            {showCredit && (
                <View style={styles.creditNotice}>
                    <View style={styles.creditTexts}>
                        <Text style={styles.creditTitle}>Saldo a favor {formatCurrency(customerCredit)}</Text>
                        <Text style={styles.creditText}>
                            {onToggleApplyCredit ? 'Usarlo en esta compra' : 'No se aplica al editar'}
                        </Text>
                    </View>
                    {onToggleApplyCredit ? (
                        <Switch
                            value={applyCredit}
                            onValueChange={onToggleApplyCredit}
                            trackColor={{ true: Colors.success, false: Colors.border }}
                            accessibilityLabel="Usar saldo a favor en esta compra"
                        />
                    ) : null}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    debtNotice: {
        padding: Spacing.md,
        borderRadius: Radius.md,
        backgroundColor: Colors.warningLight,
    },
    debtText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.warningText,
    },
    creditNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: Radius.md,
        backgroundColor: Colors.successSoft,
        borderWidth: 1,
        borderColor: Colors.successBorder,
    },
    creditTexts: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    creditTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.successDark,
    },
    creditText: {
        fontSize: 12,
        color: Colors.successDark,
    },
});
