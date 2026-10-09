export type CustomerAccount = {
    id: string;
    customerId: string;
    createdAt: string;
};

export type CustomerPayment = {
    id: string;
    accountId: string;
    customerId: string;
    amount: number;
    createdAt: string;
    branchId?: string;
};

export type PaymentAllocation = {
    id: string;
    paymentId: string;
    orderId: string;
    amount: number;
    createdAt: string;
};

export type CustomerAccountSnapshot = {
    accounts: CustomerAccount[];
    payments: CustomerPayment[];
    allocations: PaymentAllocation[];
};

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
