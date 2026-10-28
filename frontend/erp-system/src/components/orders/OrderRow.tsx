import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { ORDER_STATUS_LABELS, Order, PAYMENT_STATUS_LABELS } from '@/types/order';
import { formatCurrency, formatTime } from '@/utils/format';
import { orderStatusTone, paymentStatusTone } from '@/utils/status';

type OrderRowProps = {
    order: Order;
    onPress: () => void;
    /** Qué estado mostrar: el pago (ventas) o el del pedido (envíos a preparar). */
    show?: 'payment' | 'status';
};

function detailOf(order: Order): string {
    if (order.salesType === 'QUICK_SALE') return 'venta rápida';
    const count = order.items.length;
    return `${count} ${count === 1 ? 'producto' : 'productos'}`;
}

/** Fila compacta de un pedido para las listas cortas de las pantallas principales (dentro de un ListGroup). */
export function OrderRow({ order, onPress, show = 'payment' }: OrderRowProps) {
    // Un pedido cancelado devuelve los pagos: su estado de pago ya no dice nada.
    const pill = show === 'status' || order.status === 'CANCELLED'
        ? { label: ORDER_STATUS_LABELS[order.status], tone: orderStatusTone(order.status) }
        : { label: PAYMENT_STATUS_LABELS[order.paymentStatus], tone: paymentStatusTone(order.paymentStatus) };

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Pedido ${order.orderNumber}, ${order.customerName}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
            <View style={styles.texts}>
                <Text style={styles.title} numberOfLines={1}>{order.customerName}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                    #{order.orderNumber} · {formatTime(order.createdAt)} · {detailOf(order)}
                </Text>
            </View>
            <View style={styles.right}>
                <Text style={styles.total}>{formatCurrency(order.total)}</Text>
                <StatusPill label={pill.label} tone={pill.tone} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
        backgroundColor: Colors.surface,
    },
    pressed: {
        backgroundColor: Colors.muted,
    },
    texts: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    right: {
        alignItems: 'flex-end',
        gap: Spacing.xs,
    },
    total: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
});
