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

        case 'IN_PREPARATION':
            return {
                bg: Colors.warningLight,
                text: Colors.warningDark,
                dot: Colors.warning,
            };

        case 'READY_TO_SHIP':
            return {
                bg: '#F0FDFA',
                text: '#0D9488',
                dot: '#14B8A6',
            };

        case 'SHIPPED':
            return {
                bg: '#EDE9FE',
                text: '#7C3AED',
                dot: '#8B5CF6',
            };

        case 'DELIVERED':
            return {
                bg: '#F0FDF4',
                text: Colors.success,
                dot: Colors.success,
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
