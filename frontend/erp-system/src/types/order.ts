import { CustomerAddress } from './customer';

export type OrderStatus =
    | 'CONFIRMED'
    | 'TO_PREPARE'
    | 'SHIPPED'
    | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export type DeliveryType = 'LOCAL_PICKUP' | 'SHIPPING';

export type SalesType = 'WITH_PRODUCTS' | 'QUICK_SALE';

export type OrderCreationMode = 'SALE' | 'SHIPMENT';

export type OrderItem = {
    id: string;
    productId: string;
    variantId: string;
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
    salesType: SalesType;
    quickSaleAmount?: number;
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

export type RefundAction = 'KEEP_AS_CREDIT' | 'REFUND_MONEY';

export type OrderItemRequest = {
    productVariantId: number;
    quantity: number;
};

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'DEBIT_CARD' | 'CREDIT_CARD';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia',
    DEBIT_CARD: 'Débito',
    CREDIT_CARD: 'Crédito',
};

export type InitialPaymentRequest = {
    amount: number;
    method: PaymentMethod;
};

export type OrderRequest = {
    branchId: number;
    customerId?: number;
    salesType: SalesType;
    quickSaleAmount?: number;
    deliveryType: DeliveryType;
    items?: OrderItemRequest[];
    // Solo con cliente: aplica su saldo a favor a esta orden.
    applyCredit?: boolean;
    // Solo con cliente: pago cobrado ahora, asignado a esta orden.
    initialPayment?: InitialPaymentRequest;
};

export type OrderUpdateRequest = {
    quickSaleAmount?: number;
    items?: OrderItemRequest[];
};

export type OrderCancelRequest = {
    refundAction?: RefundAction;
};

export type OrderItemResponse = {
    id: number | string;
    productId: number | string;
    productName: string;
    productVariantId: number | string;
    productVariantSku: string;
    quantity: number;
    unitPrice: number | string;
};

export type OrderResponse = {
    id: number | string;
    orderNumber: string;
    branchId: number | string;
    branchName: string;
    customerId?: number | string | null;
    customerName?: string | null;
    salesType: SalesType;
    quickSaleAmount?: number | string | null;
    deliveryType: DeliveryType;
    status: OrderStatus;
    total: number | string;
    amountPaid?: number | string | null;
    paymentStatus?: PaymentStatus;
    balance?: number | string | null;
    createdAt: string;
    updatedAt: string;
    items?: OrderItemResponse[] | null;
};

export type PageResponse<T> = {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

export type OrderListParams = {
    page?: number;
    size?: number;
    sort?: string;
    q?: string;
    status?: OrderStatus;
    branchId?: string;
    salesType?: SalesType;
    deliveryType?: DeliveryType;
    customerId?: string;
    paymentStatus?: PaymentStatus;
};

export type OrderStatusFilter = OrderStatus | 'ALL';

export type OrderDeliveryFilter = DeliveryType | 'ALL';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    CONFIRMED: 'Confirmado',
    TO_PREPARE: 'A preparar',
    SHIPPED: 'Enviado',
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

export const SALES_TYPE_LABELS: Record<SalesType, string> = {
    WITH_PRODUCTS: 'Con productos',
    QUICK_SALE: 'Venta rápida',
};

export const SHIPPING_STATUS_FLOW: OrderStatus[] = [
    'TO_PREPARE',
    'SHIPPED',
];
