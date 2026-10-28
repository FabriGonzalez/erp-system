import { StyleSheet, Text, View, Pressable } from 'react-native';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import {
    DELIVERY_TYPE_LABELS,
    ORDER_STATUS_LABELS,
    Order,
    PAYMENT_STATUS_LABELS,
} from '@/types/order';
import { formatCurrency } from '@/utils/format';
import { orderStatusTone, paymentStatusTone } from '@/utils/status';

type OrderCardProps = {
    order: Order;
    onPress?: () => void;
};

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return `Hoy · ${time}`;
    if (diffDays === 1) return `Ayer · ${time}`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ` · ${time}`;
}

function detailOf(order: Order): string {
    if (order.salesType === 'QUICK_SALE') return 'Venta rápida';
    return [
        `${order.items.length} ${order.items.length === 1 ? 'producto' : 'productos'}`,
        order.promos.length > 0
            ? `${order.promos.length} ${order.promos.length === 1 ? 'promo' : 'promos'}`
            : null,
    ].filter(Boolean).join(' · ');
}

export function OrderCard({ order, onPress }: OrderCardProps) {
    // Al cancelar se revierten los pagos: el estado de pago ya no dice nada.
    const showPayment = order.status !== 'CANCELLED';

    return (
        <Pressable
            style={({ pressed }) => [SharedStyles.card, SharedStyles.listItem, pressed && SharedStyles.listItemPressed]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Pedido ${order.orderNumber}, ${order.customerName}`}
        >
            <View style={SharedStyles.listItemTexts}>
                <Text style={SharedStyles.listItemTitle} numberOfLines={1}>{order.customerName}</Text>
                <Text style={SharedStyles.listItemMeta} numberOfLines={1}>
                    #{order.orderNumber} · {formatDate(order.createdAt)}
                </Text>
                <Text style={SharedStyles.listItemMeta} numberOfLines={1}>
                    {DELIVERY_TYPE_LABELS[order.deliveryType]} · {detailOf(order)}
                </Text>
                <View style={styles.pills}>
                    <StatusPill label={ORDER_STATUS_LABELS[order.status]} tone={orderStatusTone(order.status)} />
                    {showPayment ? (
                        <StatusPill
                            label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
                            tone={paymentStatusTone(order.paymentStatus)}
                        />
                    ) : null}
                </View>
            </View>
            <View style={styles.amounts}>
                <Text style={styles.total}>{formatCurrency(order.total)}</Text>
                {showPayment && order.balance > 0 ? (
                    <Text style={styles.balance}>Saldo {formatCurrency(order.balance)}</Text>
                ) : null}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginTop: 2,
    },
    amounts: {
        alignSelf: 'flex-start',
        alignItems: 'flex-end',
        gap: 2,
    },
    total: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text,
    },
    balance: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.error,
    },
});
