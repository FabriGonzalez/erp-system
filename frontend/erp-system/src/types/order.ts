import { CustomerAddress } from './customer';

export type OrderStatus =
    | 'DRAFT'
    | 'CONFIRMED'
    | 'IN_PREPARATION'
    | 'READY_TO_SHIP'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export type DeliveryType = 'LOCAL_PICKUP' | 'SHIPPING';

export type OrderItem = {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
};

export type Order = {
    id: string;
    orderNumber: string;
    customerId: string;
    customerName: string;
    deliveryType: DeliveryType;
    address?: CustomerAddress;
    branchId: string;
    branchName: string;
    items: OrderItem[];
    total: number;
    amountPaid: number;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
};

export type OrderStatusFilter = OrderStatus | 'ALL';

export type OrderDeliveryFilter = DeliveryType | 'ALL';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    DRAFT: 'Borrador',
    CONFIRMED: 'Confirmado',
    IN_PREPARATION: 'En preparación',
    READY_TO_SHIP: 'Listo para enviar',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    PENDING: 'Pendiente',
    PARTIAL: 'Pago parcial',
    PAID: 'Pagado',
};

export function getPaymentStatus(order: Pick<Order, 'total' | 'amountPaid'>): PaymentStatus {
    if (order.amountPaid <= 0) return 'PENDING';
    if (order.amountPaid >= order.total) return 'PAID';
    return 'PARTIAL';
}

export function getBalanceDue(order: Pick<Order, 'total' | 'amountPaid'>): number {
    return Math.max(0, order.total - order.amountPaid);
}

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
    LOCAL_PICKUP: 'Retiro',
    SHIPPING: 'Envío',
};

export const SHIPPING_STATUS_FLOW: OrderStatus[] = [
    'CONFIRMED',
    'IN_PREPARATION',
    'READY_TO_SHIP',
    'SHIPPED',
    'DELIVERED',
];
