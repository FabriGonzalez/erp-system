import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Order, DELIVERY_TYPE_LABELS } from '@/types/order';

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

export function OrderCard({ order, onPress }: OrderCardProps) {
    return (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={onPress}
        >
            <View style={styles.headerRow}>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <StatusBadge status={order.status} />
            </View>

            <View style={styles.body}>
                <Text style={styles.customerName} numberOfLines={1}>
                    {order.customerName}
                </Text>
                <View style={styles.deliveryBadge}>
                    <Text style={styles.deliveryText}>
                        {DELIVERY_TYPE_LABELS[order.deliveryType]}
                    </Text>
                </View>
            </View>

            <View style={styles.footerRow}>
                <View style={styles.footerLeft}>
                    <Text style={styles.itemsCount}>
                        {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                    </Text>
                    <Text style={styles.total}>${order.total.toLocaleString('es-AR')}</Text>
                </View>
                <View style={styles.footerRight}>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                    <SymbolView
                        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                        size={16}
                        tintColor={Colors.textSecondary}
                    />
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    orderNumber: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    body: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    customerName: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
        flex: 1,
    },
    deliveryBadge: {
        backgroundColor: Colors.muted,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    deliveryText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
    },
    footerLeft: {
        gap: 2,
    },
    itemsCount: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    total: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    date: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});
