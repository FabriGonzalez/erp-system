import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS, Customer } from '@/types/customer';
import { formatCurrency } from '@/utils/format';

type OrderCustomerSectionProps = {
    customer: Customer;
    customerCredit?: number;
    customerDebt?: number;
    pendingOrders?: number;
    applyCredit?: boolean;
    // Si no se pasa, el saldo a favor se muestra sin opción de usarlo.
    onToggleApplyCredit?: (applyCredit: boolean) => void;
    // Envíos y ventas rápidas no admiten consumidor final.
    requireRegisteredCustomer?: boolean;
    onSelectCustomer: () => void;
};

export function OrderCustomerSection({
    customer,
    customerCredit = 0,
    customerDebt = 0,
    pendingOrders = 0,
    applyCredit = false,
    onToggleApplyCredit,
    requireRegisteredCustomer = false,
    onSelectCustomer,
}: OrderCustomerSectionProps) {
    const isAnonymous = customer.id === CUSTOMER_ANONYMOUS.id;
    const isPendingSelection = isAnonymous && requireRegisteredCustomer;

    return (
        <View style={styles.container}>
            <Text style={SharedStyles.sectionTitle}>Cliente</Text>

            <Pressable
                style={({ pressed }) => [SharedStyles.rowCard, pressed && SharedStyles.pressed]}
                onPress={onSelectCustomer}
            >
                <Avatar style={styles.avatar}>
                    <SymbolView
                        name={{
                            ios: isPendingSelection
                                ? 'person.crop.circle.badge.plus'
                                : isAnonymous ? 'person.fill.questionmark' : 'person.fill',
                            android: isPendingSelection ? 'person_add' : 'person',
                            web: isPendingSelection ? 'person_add' : 'person',
                        }}
                        size={22}
                        tintColor={Colors.primary}
                    />
                </Avatar>

                <View style={styles.info}>
                    {isPendingSelection ? (
                        <>
                            <Text style={[styles.customerName, styles.placeholderName]}>
                                Seleccionar cliente
                            </Text>
                            <Text style={styles.customerDetail}>
                                Esta operación requiere un cliente registrado
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.customerName}>{customer.name}</Text>
                            {!isAnonymous && customer.email ? (
                                <Text style={styles.customerDetail}>{customer.email}</Text>
                            ) : null}
                            {!isAnonymous && customer.phone ? (
                                <Text style={styles.customerDetail}>{customer.phone}</Text>
                            ) : null}
                            {isAnonymous ? (
                                <Text style={styles.customerDetail}>Venta sin datos de comprador</Text>
                            ) : null}
                        </>
                    )}
                </View>

                <View style={styles.changeAction}>
                    <Text style={styles.changeText}>{isPendingSelection ? 'Elegir' : 'Cambiar'}</Text>
                    <SymbolView
                        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                        size={16}
                        tintColor={Colors.primary}
                    />
                </View>
            </Pressable>

            {!isAnonymous && customerDebt > 0 && (
                <Text style={styles.debtNotice}>
                    El cliente tiene deudas pendientes por {formatCurrency(customerDebt)}
                    {pendingOrders > 0
                        ? ` en ${pendingOrders} ${pendingOrders === 1 ? 'pedido' : 'pedidos'}`
                        : ''}
                    . El pago de esta venta se asigna solo a este pedido.
                </Text>
            )}

            {!isAnonymous && customerCredit > 0 && (
                <View style={styles.creditNotice}>
                    <Text style={styles.creditNoticeTitle}>Saldo a favor</Text>
                    <Text style={styles.creditNoticeAmount}>
                        {formatCurrency(customerCredit)}
                    </Text>
                    {onToggleApplyCredit ? (
                        <View style={styles.creditToggleRow}>
                            <Text style={styles.creditNoticeText}>
                                Usar saldo a favor en esta compra
                            </Text>
                            <Switch
                                value={applyCredit}
                                onValueChange={onToggleApplyCredit}
                                trackColor={{ true: Colors.success, false: Colors.border }}
                                accessibilityLabel="Usar saldo a favor en esta compra"
                            />
                        </View>
                    ) : null}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    avatar: {
        marginRight: Spacing.md,
    },
    info: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    placeholderName: {
        color: Colors.primary,
    },
    customerDetail: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    changeAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    changeText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
    creditNotice: {
        marginTop: Spacing.sm,
        padding: Spacing.md,
        borderRadius: 10,
        backgroundColor: Colors.successLight,
        borderWidth: 1,
        borderColor: Colors.successBorder,
    },
    creditNoticeTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.successDark,
        textTransform: 'uppercase',
    },
    creditNoticeAmount: {
        marginTop: 2,
        fontSize: 20,
        fontWeight: '700',
        color: Colors.successDark,
    },
    creditNoticeText: {
        marginTop: 4,
        fontSize: 13,
        color: Colors.successDark,
        flexShrink: 1,
    },
    creditToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    debtNotice: {
        marginTop: Spacing.sm,
        fontSize: 13,
        color: Colors.warningDark,
    },
});
