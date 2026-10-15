import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { STOCK_TRANSFER_STATUS_LABELS, StockTransferStatus } from '@/types/transfer';

export function TransferStatusBadge({ status }: { status: StockTransferStatus }) {
    const isCancelled = status === 'CANCELLED';

    return (
        <View style={[styles.badge, isCancelled ? styles.cancelled : styles.confirmed]}>
            <Text style={[styles.text, isCancelled ? styles.cancelledText : styles.confirmedText]}>
                {STOCK_TRANSFER_STATUS_LABELS[status]}
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
    confirmed: {
        backgroundColor: Colors.successLight,
    },
    cancelled: {
        backgroundColor: Colors.muted,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
    confirmedText: {
        color: Colors.successDark,
    },
    cancelledText: {
        color: Colors.textSecondary,
    },
});
