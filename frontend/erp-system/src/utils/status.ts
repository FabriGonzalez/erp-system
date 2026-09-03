import { Colors } from '@/constants/colors';
import { OrderStatus } from '@/types/order';

export function getStatusBadgeColor(status: OrderStatus) {
    switch (status) {
        case 'DRAFT':
            return {
                bg: '#F1F5F9',
                text: Colors.textSecondary,
            };

        case 'CONFIRMED':
            return {
                bg: '#EFF6FF',
                text: Colors.primary,
            };

        case 'IN_PREPARATION':
            return {
                bg: '#FEF3C7',
                text: '#D97706',
            };

        case 'READY_TO_SHIP':
            return {
                bg: '#F0FDFA',
                text: '#0D9488',
            };

        case 'SHIPPED':
            return {
                bg: '#EDE9FE',
                text: '#7C3AED',
            };

        case 'DELIVERED':
            return {
                bg: '#F0FDF4',
                text: Colors.success,
            };

        case 'CANCELLED':
            return {
                bg: '#FEF2F2',
                text: Colors.error,
            };

        default:
            return {
                bg: '#F1F5F9',
                text: Colors.textSecondary,
            };
    }
}
