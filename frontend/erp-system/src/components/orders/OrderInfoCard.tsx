import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { formatDateTime } from '@/utils/format';
import {
    DELIVERY_TYPE_LABELS,
    Order,
    getBalanceDue,
    getPaymentStatus,
} from '@/types/order';

interface OrderInfoCardProps {
    order: Order;
}

export function OrderInfoCard({ order }: OrderInfoCardProps) {
    const isShipping = order.deliveryType === 'SHIPPING';
    const paymentStatus = getPaymentStatus(order);
    const balanceDue = getBalanceDue(order);

    const paymentStatusColor =
        paymentStatus === 'PAID'
            ? Colors.success
            : paymentStatus === 'PARTIAL'
              ? Colors.warningDark
              : Colors.error;

    const paymentStatusBg =
        paymentStatus === 'PAID'
            ? Colors.successLight
            : paymentStatus === 'PARTIAL'
              ? Colors.warningLight
              : Colors.errorLight;

    const paymentStatusLabel =
        paymentStatus === 'PAID'
            ? 'Pagado'
            : paymentStatus === 'PARTIAL'
              ? 'Pago parcial'
              : 'Pendiente';

    return (
        <View style={styles.card}>
            <InfoRow label="Cliente" value={order.customerName} />

            <View style={styles.divider} />

            <InfoRow
                label="Entrega"
                value={DELIVERY_TYPE_LABELS[order.deliveryType]}
            />

            {isShipping && order.address && (
                <>
                    <View style={styles.divider} />

                    <InfoRow
                        label="Dirección"
                        value={`${order.address.street} ${order.address.number}\n${order.address.city}, ${order.address.province}`}
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
                    <View style={[styles.statusPill, { backgroundColor: paymentStatusBg }]}>
                        <Text style={[styles.statusPillText, { color: paymentStatusColor }]}>
                            {paymentStatusLabel}
                        </Text>
                    </View>
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
                    {balanceDue > 0 && (
                        <View style={styles.amountItem}>
                            <Text style={styles.amountLabel}>Debe</Text>
                            <Text style={[styles.amountValue, { color: Colors.error }]}>
                                ${balanceDue.toLocaleString('es-AR')}
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
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },

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

    statusPill: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 20,
    },

    statusPillText: {
        fontSize: 12,
        fontWeight: '600',
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
