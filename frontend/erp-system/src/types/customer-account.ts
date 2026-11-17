import { DeliveryType, OrderStatus, SalesType } from './order';

// Estado de cuenta calculado por el backend (GET /customers/{id}/account).
export type CustomerAccountSummaryResponse = {
    customerId: number | string;
    balance: number | string;
    debt: number | string;
    credit: number | string;
    pendingOrders: number;
};

export type CustomerAccountSummary = {
    customerId: string;
    balance: number;
    debt: number;
    credit: number;
    pendingOrders: number;
};

export type CustomerDebtorResponse = {
    customerId: number | string;
    customerName: string;
    debt: number | string;
    credit: number | string;
    pendingOrders: number;
    oldestPendingOrderAt: string | null;
};

export type CustomerDebtor = {
    customerId: string;
    customerName: string;
    debt: number;
    credit: number;
    pendingOrders: number;
    oldestPendingOrderAt: string | null;
};

// Orden con saldo pendiente (GET /customers/{id}/account/pending-orders), de todas las
// sucursales y en el orden en que se les aplican los pagos.
export type CustomerPendingOrderResponse = {
    orderId: number | string;
    orderNumber: string;
    branchId: number | string;
    branchName: string;
    status: OrderStatus;
    salesType: SalesType;
    deliveryType: DeliveryType;
    total: number | string;
    amountPaid: number | string;
    balance: number | string;
    createdAt: string;
};

export type CustomerPendingOrder = {
    orderId: string;
    orderNumber: string;
    branchId: string;
    branchName: string;
    status: OrderStatus;
    salesType: SalesType;
    deliveryType: DeliveryType;
    total: number;
    amountPaid: number;
    balance: number;
    createdAt: string;
};

export type AccountTransactionType = 'ORDER_CHARGE' | 'PAYMENT' | 'REFUND';

// Movimiento de la cuenta (GET /customers/{id}/account/transactions). amount positivo
// aumenta lo que el cliente debe; negativo lo reduce.
export type AccountTransactionResponse = {
    id: number | string;
    type: AccountTransactionType;
    amount: number | string;
    description: string | null;
    branchId: number | string | null;
    branchName: string | null;
    createdAt: string;
};

export type AccountTransaction = {
    id: string;
    type: AccountTransactionType;
    amount: number;
    description: string | null;
    branchName: string | null;
    createdAt: string;
};
