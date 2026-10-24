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

export const NEW_PROMO_LINE_PREFIX = 'new-';

/** Variante elegida en una línea de promo; quantity = unidades por cada promo de la línea. */
export type OrderPromoComponent = {
    productId: string;
    productName: string;
    variantId: string;
    sku: string;
    // "Rojo · M"; vacío si el producto no tiene variantes.
    variantName: string;
    quantity: number;
};

/**
 * Una línea de promo: una combinación de variantes elegidas, vendida quantity veces; la misma
 * promo puede ir en varias líneas. Nombre, precio y variantes quedan como se vendió: no cambian
 * aunque después se edite, venza o se desactive la promo. En el borrador, las líneas nuevas
 * tienen un id que empieza con NEW_PROMO_LINE_PREFIX.
 */
export type OrderPromo = {
    id: string;
    promotionId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    components: OrderPromoComponent[];
};

/**
 * Dirección de entrega copiada al crear el envío: no cambia si después editan la
 * dirección del cliente. No es una CustomerAddress (no tiene id, principal ni activa).
 */
export type OrderShippingAddress = {
    street: string;
    number?: string;
    apartment?: string;
    floor?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    reference?: string;
};

export type Order = {
    id: string;
    orderNumber: string;
    customerId: string;
    customerName: string;
    salesType: SalesType;
    quickSaleAmount?: number;
    deliveryType: DeliveryType;
    // Sin dirección en retiros y en envíos creados antes de que se guardara.
    shippingAddress?: OrderShippingAddress;
    branchId: string;
    branchName: string;
    items: OrderItem[];
    promos: OrderPromo[];
    total: number;
    // Los tres los calcula el backend con los pagos asignados; sin cliente se cobra en el acto.
    amountPaid: number;
    paymentStatus: PaymentStatus;
    balance: number;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
};

export type RefundAction = 'KEEP_AS_CREDIT' | 'REFUND_MONEY';

export type OrderItemRequest = {
    productVariantId: number;
    quantity: number;
};

/**
 * Una línea de promo. Nueva: promotionId y las variantes elegidas (por cada producto, sus
 * unidades por promo). Al editar, una línea existente va solo con id y quantity.
 */
export type OrderPromoRequest = {
    id?: number;
    promotionId?: number;
    quantity: number;
    variants?: { productVariantId: number; quantity: number }[];
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
    // Obligatoria con SHIPPING y prohibida con LOCAL_PICKUP: dirección del cliente del pedido.
    shippingAddressId?: number;
    items?: OrderItemRequest[];
    // Promos vigentes, sin repetir. Con productos lleva al menos un ítem o una promo.
    promos?: OrderPromoRequest[];
    // Solo con cliente: aplica su saldo a favor a esta orden.
    applyCredit?: boolean;
    // Solo con cliente: pago cobrado ahora, asignado a esta orden.
    initialPayment?: InitialPaymentRequest;
};

export type OrderUpdateRequest = {
    quickSaleAmount?: number;
    items?: OrderItemRequest[];
    // Reemplaza las promos: las que ya tenía conservan precio y componentes.
    promos?: OrderPromoRequest[];
    // Solo envíos: cambia la dirección de entrega. Sin el campo queda la actual.
    shippingAddressId?: number;
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

export type OrderPromoResponse = {
    id: number | string;
    promotionId: number | string;
    name: string;
    unitPrice: number | string;
    quantity: number;
    components?: {
        productId: number | string;
        productName: string;
        productVariantId: number | string;
        productVariantSku: string;
        variantName?: string | null;
        quantity: number;
    }[] | null;
};

export type ShipmentResponse = {
    id: number | string;
    orderId: number | string;
    street: string;
    number?: string | null;
    apartment?: string | null;
    floor?: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    country: string;
    reference?: string | null;
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
    shipment?: ShipmentResponse | null;
    status: OrderStatus;
    total: number | string;
    amountPaid?: number | string | null;
    paymentStatus: PaymentStatus;
    balance?: number | string | null;
    createdAt: string;
    updatedAt: string;
    items?: OrderItemResponse[] | null;
    promos?: OrderPromoResponse[] | null;
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
