import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { formatDateTime } from '@/utils/format';
import { DELIVERY_TYPE_LABELS, Order } from '@/types/order';

interface OrderInfoCardProps {
    order: Order;
}

export function OrderInfoCard({ order }: OrderInfoCardProps) {
    const isShipping = order.deliveryType === 'SHIPPING';

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
        backgroundColor: '#F1F5F9',
    },
});
