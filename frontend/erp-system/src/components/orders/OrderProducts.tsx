import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { formatCurrency } from '@/utils/format';
import { Order } from '@/types/order';

interface OrderProductsProps {
    order: Order;
}

export function OrderProducts({ order }: OrderProductsProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Productos</Text>

            {order.items.map((item) => (
                <View key={item.id} style={styles.productRow}>
                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                            {item.productName}
                        </Text>

                        <Text style={styles.productDetail}>
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                        </Text>
                    </View>

                    <Text style={styles.productSubtotal}>
                        {formatCurrency(item.subtotal)}
                    </Text>
                </View>
            ))}

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                    {formatCurrency(order.total)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },

    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.muted,
    },

    productInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },

    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },

    productDetail: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },

    productSubtotal: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },

    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing.md,
        marginTop: Spacing.xs,
    },

    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },

    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.primary,
    },
});
