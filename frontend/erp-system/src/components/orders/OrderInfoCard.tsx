import { StyleSheet, Text, View } from 'react-native';

import { PaymentStatusBadge } from '@/components/orders/PaymentStatusBadge';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { DELIVERY_TYPE_LABELS, Order } from '@/types/order';
import { formatAddress } from '@/utils/address';
import { formatDateTime } from '@/utils/format';

interface OrderInfoCardProps {
    order: Order;
}

export function OrderInfoCard({ order }: OrderInfoCardProps) {
    const isShipping = order.deliveryType === 'SHIPPING';

    return (
        <View style={SharedStyles.card}>
            <InfoRow label="Cliente" value={order.customerName} />

            <View style={styles.divider} />

            <InfoRow
                label="Entrega"
                value={DELIVERY_TYPE_LABELS[order.deliveryType]}
            />

            {isShipping && (
                <>
                    <View style={styles.divider} />

                    <InfoRow
                        label="Dirección"
                        value={
                            order.shippingAddress
                                ? formatAddress(order.shippingAddress)
                                : 'Sin dirección registrada'
                        }
                    />
                </>
            )}

            <View style={styles.divider} />

            <InfoRow label="Sucursal" value={order.branchName} />

            <View style={styles.divider} />

            <InfoRow label="Fecha" value={formatDateTime(order.createdAt)} />

            <View style={styles.divider} />

            {/* Payment info */}
            <View style={styles.paymentSection}>
                <View style={styles.paymentRow}>
                    <Text style={styles.label}>Cobro</Text>
                    <PaymentStatusBadge status={order.paymentStatus} />
                </View>

                <View style={styles.paymentAmounts}>
                    <View style={styles.amountItem}>
                        <Text style={styles.amountLabel}>Total</Text>
                        <Text style={styles.amountValue}>
                            ${order.total.toLocaleString('es-AR')}
                        </Text>
                    </View>
                    <View style={styles.amountItem}>
                        <Text style={styles.amountLabel}>Entregó</Text>
                        <Text style={[styles.amountValue, { color: Colors.success }]}>
                            ${order.amountPaid.toLocaleString('es-AR')}
                        </Text>
                    </View>
                    {order.balance > 0 && (
                        <View style={styles.amountItem}>
                            <Text style={styles.amountLabel}>Debe</Text>
                            <Text style={[styles.amountValue, { color: Colors.error }]}>
                                ${order.balance.toLocaleString('es-AR')}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        paddingVertical: Spacing.sm,
    },

    label: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },

    value: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.text,
    },

    divider: {
        height: 1,
        backgroundColor: Colors.muted,
    },

    paymentSection: {
        paddingVertical: Spacing.sm,
    },

    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },

    paymentAmounts: {
        flexDirection: 'row',
        gap: Spacing.xl,
    },

    amountItem: {
        flex: 1,
    },

    amountLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 2,
    },

    amountValue: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
});
