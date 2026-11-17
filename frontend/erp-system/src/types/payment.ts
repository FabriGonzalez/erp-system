import { PaymentMethod } from './order';

export type PaymentStatus = 'ACTIVE' | 'CANCELLED';

export type PaymentRequest = {
    customerId: number;
    branchId: number;
    amount: number;
    method: PaymentMethod;
};

export type PaymentAllocationResponse = {
    id: number | string;
    orderId: number | string | null;
    orderNumber: string | null;
    amount: number | string;
    createdAt: string;
};

export type PaymentResponse = {
    id: number | string;
    branchId: number | string | null;
    branchName: string | null;
    customerId: number | string | null;
    customerName: string | null;
    amount: number | string;
    method: PaymentMethod;
    status: PaymentStatus;
    createdByUsername: string | null;
    createdAt: string;
    cancelledAt: string | null;
    cancelledByUsername: string | null;
    allocations: PaymentAllocationResponse[] | null;
};

/** Parte de un pago aplicada a una orden. */
export type PaymentAllocation = {
    orderId: string;
    orderNumber: string;
    amount: number;
};

export type Payment = {
    id: string;
    customerId: string;
    branchId: string | null;
    branchName: string | null;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    createdByUsername: string | null;
    createdAt: string;
    cancelledAt: string | null;
    cancelledByUsername: string | null;
    allocations: PaymentAllocation[];
    // Lo que no se aplicó a ninguna orden: queda como saldo a favor del cliente.
    unallocatedAmount: number;
};
