import { Colors } from '@/constants/colors';
import { OrderStatus } from '@/types/order';

export function getStatusBadgeColor(status: OrderStatus): {
    bg: string;
    text: string;
    dot: string;
} {
    switch (status) {
        case 'DRAFT':
            return {
                bg: Colors.muted,
                text: Colors.textSecondary,
                dot: Colors.textSecondary,
            };

        case 'CONFIRMED':
            return {
                bg: Colors.primaryLight,
                text: Colors.primary,
                dot: Colors.primary,
            };

        case 'TO_PREPARE':
            return {
                bg: Colors.warningLight,
                text: Colors.warningDark,
                dot: Colors.warning,
            };

        case 'SHIPPED':
            return {
                bg: '#EDE9FE',
                text: '#7C3AED',
                dot: '#8B5CF6',
            };

        case 'CANCELLED':
            return {
                bg: Colors.errorLight,
                text: Colors.error,
                dot: Colors.error,
            };

        default:
            return {
                bg: Colors.muted,
                text: Colors.textSecondary,
                dot: Colors.textSecondary,
            };
    }
}
