import { router } from 'expo-router';

import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { DELIVERY_TYPE_LABELS, ORDER_STATUS_LABELS, Order } from '@/types/order';
import { formatDateTime } from '@/utils/format';
import { orderStatusTone } from '@/utils/status';

interface OrderHeaderProps {
    order: Order;
}

export function OrderHeader({ order }: OrderHeaderProps) {
    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/orders');
        }
    };

    return (
        <PageHeader
            onBack={handleBack}
            eyebrow={`${DELIVERY_TYPE_LABELS[order.deliveryType]} · ${formatDateTime(order.createdAt)}`}
            title={order.orderNumber}
            right={<StatusPill label={ORDER_STATUS_LABELS[order.status]} tone={orderStatusTone(order.status)} />}
        />
    );
}
