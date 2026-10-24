import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { PROMOTION_STATUS_LABELS, PromotionStatus } from '@/types/promotion';

const PALETTE: Record<PromotionStatus, { bg: string; text: string }> = {
    ACTIVE: { bg: Colors.successLight, text: Colors.successDark },
    SCHEDULED: { bg: Colors.primaryLight, text: Colors.primaryDark },
    EXPIRED: { bg: Colors.warningLight, text: Colors.warningText },
    INACTIVE: { bg: Colors.muted, text: Colors.textSecondary },
};

export function PromotionStatusBadge({ status }: { status: PromotionStatus }) {
    const palette = PALETTE[status];

    return (
        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
            <Text style={[styles.text, { color: palette.text }]}>{PROMOTION_STATUS_LABELS[status]}</Text>
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
