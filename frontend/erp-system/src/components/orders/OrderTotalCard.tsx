import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS, Customer } from '@/types/customer';
import { DeliveryType } from '@/types/order';
import { formatCurrency } from '@/utils/format';

type OrderTotalCardProps = {
    total: number;
    /** Unidades sueltas más promos; sin productos (venta rápida) no se muestra. */
    unitsCount?: number;
    deliveryType: DeliveryType;
    customer: Customer;
    /** Envíos: el consumidor final no alcanza, hay que elegir un cliente. */
    requireRegisteredCustomer?: boolean;
    /** Sin función el cliente queda fijo (edición). */
    onSelectCustomer?: () => void;
};

/** Total del pedido bien grande, con la entrega y el cliente: lo primero que se mira al vender. */
export function OrderTotalCard({
    total,
    unitsCount,
    deliveryType,
    customer,
    requireRegisteredCustomer = false,
    onSelectCustomer,
}: OrderTotalCardProps) {
    const isAnonymous = customer.id === CUSTOMER_ANONYMOUS.id;
    const isPendingSelection = isAnonymous && requireRegisteredCustomer;
    const eyebrow = unitsCount === undefined
        ? 'Total'
        : `Total · ${unitsCount} ${unitsCount === 1 ? 'artículo' : 'artículos'}`;

    return (
        <View style={[styles.card, SharedStyles.raised]}>
            <View style={styles.totalRow}>
                <View style={styles.totalTexts}>
                    <Text style={styles.eyebrow}>{eyebrow}</Text>
                    <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                        {formatCurrency(Math.max(0, total))}
                    </Text>
                </View>
                <View style={styles.pill}>
                    <Text style={styles.pillText}>
                        {deliveryType === 'SHIPPING' ? 'Envío a domicilio' : 'Retira en el local'}
                    </Text>
                </View>
            </View>

            <Pressable
                style={({ pressed }) => [styles.customer, pressed && onSelectCustomer && styles.customerPressed]}
                onPress={onSelectCustomer}
                disabled={!onSelectCustomer}
                accessibilityRole={onSelectCustomer ? 'button' : undefined}
            >
                <SymbolView
                    name={isPendingSelection
                        ? { ios: 'person.crop.circle.badge.plus', android: 'person_add', web: 'person_add' }
                        : { ios: 'person.fill', android: 'person', web: 'person' }}
                    size={20}
                    tintColor={Colors.white}
                />
                <View style={styles.customerTexts}>
                    <Text style={styles.customerName} numberOfLines={1}>
                        {isPendingSelection ? 'Elegir cliente' : customer.name}
                    </Text>
                    {isPendingSelection ? (
                        <Text style={styles.customerDetail}>Hace falta un cliente registrado</Text>
                    ) : !isAnonymous && customer.phone ? (
                        <Text style={styles.customerDetail} numberOfLines={1}>{customer.phone}</Text>
                    ) : null}
                </View>
                {onSelectCustomer ? (
                    <Text style={styles.change}>{isPendingSelection ? 'Elegir' : 'Cambiar'}</Text>
                ) : null}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
    },
    totalTexts: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.onPrimarySoft,
    },
    total: {
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -0.8,
        color: Colors.white,
    },
    pill: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: Radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 6,
    },
    pillText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.white,
    },
    customer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: 48,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    customerPressed: {
        backgroundColor: 'rgba(255,255,255,0.24)',
    },
    customerTexts: {
        flex: 1,
        minWidth: 0,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.white,
    },
    customerDetail: {
        fontSize: 12,
        color: Colors.onPrimarySoft,
    },
    change: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.onPrimarySoft,
    },
});
