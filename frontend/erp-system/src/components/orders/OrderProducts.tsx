import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import { formatCurrency } from '@/utils/format';
import { Order } from '@/types/order';

interface OrderProductsProps {
    order: Order;
}

export function OrderProducts({ order }: OrderProductsProps) {
    const isQuickSale = order.salesType === 'QUICK_SALE';

    return (
        <View style={SharedStyles.card}>
            <Text style={[SharedStyles.cardTitle, styles.sectionTitle]}>
                {isQuickSale ? 'Venta Rápida' : 'Productos'}
            </Text>

            {isQuickSale ? (
                <View style={styles.productRow}>
                    <View style={styles.productInfo}>
                        <Text style={styles.productName}>Importe total manual</Text>
                        <Text style={styles.productDetail}>Sin detalle de productos</Text>
                    </View>
                    <Text style={styles.productSubtotal}>
                        {formatCurrency(order.total)}
                    </Text>
                </View>
            ) : (
                order.items.map((item) => (
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
                ))
            )}

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
    sectionTitle: {
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
