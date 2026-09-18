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
