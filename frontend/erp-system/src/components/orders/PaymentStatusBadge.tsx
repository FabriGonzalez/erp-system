import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { PAYMENT_STATUS_LABELS, PaymentStatus } from '@/types/order';
import { getPaymentStatusColor } from '@/utils/status';

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
    const palette = getPaymentStatusColor(status);

    return (
        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
            <Text style={[styles.text, { color: palette.text }]}>
                {PAYMENT_STATUS_LABELS[status]}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 20,
    },

    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
