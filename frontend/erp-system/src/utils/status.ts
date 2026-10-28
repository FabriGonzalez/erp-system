import { Colors } from '@/constants/colors';
import { Tone } from '@/constants/tones';
import { OrderStatus, PaymentStatus } from '@/types/order';
import { LOW_STOCK_THRESHOLD } from '@/utils/report-periods';

/** Píldora de stock, con el mismo umbral que "Stock bajo" en Reportes y en Productos. */
export function stockPill(stock: number): { label: string; tone: Tone } {
    if (stock <= 0) {
        return { label: 'Sin stock', tone: 'danger' };
    }
    if (stock <= LOW_STOCK_THRESHOLD) {
        return { label: `Bajo (${stock})`, tone: 'warning' };
    }
    return { label: `Stock ${stock}`, tone: 'success' };
}

/** Tono de la píldora de pago (StatusPill), con el mismo criterio que getPaymentStatusColor. */
export function paymentStatusTone(status: PaymentStatus): Tone {
    switch (status) {
        case 'PAID':
            return 'success';
        case 'PARTIAL':
            return 'warning';
        default:
            return 'danger';
    }
}

/** Tono de la píldora de estado del pedido, con el mismo criterio que getStatusBadgeColor. */
export function orderStatusTone(status: OrderStatus): Tone {
    switch (status) {
        case 'CONFIRMED':
            return 'primary';
        case 'TO_PREPARE':
            return 'warning';
        case 'SHIPPED':
            return 'violet';
        case 'CANCELLED':
            return 'danger';
        default:
            return 'neutral';
    }
}

export function getPaymentStatusColor(status: PaymentStatus): { bg: string; text: string } {
    switch (status) {
        case 'PAID':
            return { bg: Colors.successLight, text: Colors.success };
        case 'PARTIAL':
            return { bg: Colors.warningLight, text: Colors.warningDark };
        default:
            return { bg: Colors.errorLight, text: Colors.error };
    }
}

export function getStatusBadgeColor(status: OrderStatus): {
    bg: string;
    text: string;
    dot: string;
} {
    switch (status) {
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
