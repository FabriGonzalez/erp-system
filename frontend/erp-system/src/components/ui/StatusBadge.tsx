import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { ORDER_STATUS_LABELS, OrderStatus } from '@/types/order';
import { getStatusBadgeColor } from '@/utils/status';

type StatusBadgeProps = {
    status: OrderStatus;
    label?: string;
    showDot?: boolean;
};

export function StatusBadge({
    status,
    label,
    showDot = true,
}: StatusBadgeProps) {
    const palette = getStatusBadgeColor(status);
    const badgeLabel = label ?? ORDER_STATUS_LABELS[status];

    return (
        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
            {showDot && (
                <View style={[styles.dot, { backgroundColor: palette.dot }]} />
            )}
            <Text style={[styles.text, { color: palette.text }]}>
                {badgeLabel}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },

    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    text: {
        fontSize: 11,
        fontWeight: '600',
    },
});