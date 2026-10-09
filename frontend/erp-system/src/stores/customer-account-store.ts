import { mockOrders } from '@/data/mock-orders';
import {
    CustomerAccount,
    CustomerAccountSnapshot,
    CustomerPayment,
    PaymentAllocation,
} from '@/types/customer-account';
import { Order } from '@/types/order';
import {
    allocateAvailableCredit,
    allocatePaymentFifo,
    calculateCustomerCredit,
    calculateOrderBalanceDue,
    calculateOrderPaidAmount,
    deserializeCustomerAccountState,
    serializeCustomerAccountState,
} from '@/utils/customer-account';
import { create } from 'zustand';

type RecordPaymentInput = {
    customerId: string;
    amount: number;
    orders: Order[];
    branchId?: string;
};

export type PaymentApplicationResult = {
    payment: CustomerPayment;
    allocations: PaymentAllocation[];
    remainingAmount: number;
};

type CustomerAccountState = CustomerAccountSnapshot & {
    getAccountByCustomerId: (
        customerId: string,
    ) => CustomerAccount | undefined;

    getOrCreateAccount: (
        customerId: string,
    ) => CustomerAccount;

    recordCustomerPayment: (
        input: RecordPaymentInput,
    ) => PaymentApplicationResult;

    recordInitialOrderPayment: (
        customerId: string,
        order: Order,
        amount: number,
        branchId?: string,
    ) => PaymentApplicationResult;

    applyAvailableCreditToOrder: (
        customerId: string,
        order: Order,
    ) => number;

    getOrderPaidAmount: (
        orderId: string,
    ) => number;

    getOrderBalanceDue: (
        order: Order,
    ) => number;

    getCustomerDebt: (
        customerId: string,
        orders: Order[],
    ) => number;

    getCustomerCredit: (
        customerId: string,
    ) => number;

    getCustomerPayments: (
        customerId: string,
    ) => CustomerPayment[];

    getOrderAllocations: (
        orderId: string,
    ) => PaymentAllocation[];

    serialize: () => string;

    hydrate: (
        serialized: string,
    ) => void;
};

function createLegacyState(): CustomerAccountSnapshot {
    const accounts: CustomerAccount[] = [];
    const payments: CustomerPayment[] = [];
    const allocations: PaymentAllocation[] = [];

    for (const order of mockOrders) {
        if (
            order.customerId === 'customer-anonymous' ||
            order.amountPaid <= 0
        ) {
            continue;
        }

        let account = accounts.find(
            (item) => item.customerId === order.customerId,
        );

        if (!account) {
            account = {
                id: `account-${order.customerId}`,
                customerId: order.customerId,
                createdAt: order.createdAt,
            };

            accounts.push(account);
        }

        const payment: CustomerPayment = {
            id: `legacy-payment-${order.id}`,
            accountId: account.id,
            customerId: order.customerId,
            amount: order.amountPaid,
            createdAt: order.createdAt,
            branchId: order.branchId,
        };

        payments.push(payment);

        allocations.push({
            id: `legacy-allocation-${order.id}`,
            paymentId: payment.id,
            orderId: order.id,
            amount: order.amountPaid,
            createdAt: order.createdAt,
        });
    }

    return {
        accounts,
        payments,
        allocations,
    };
}

export const useCustomerAccountStore = create<CustomerAccountState>(
    (set, get) => ({
        ...createLegacyState(),

        getAccountByCustomerId: (customerId) => {
            return get().accounts.find(
                (account) => account.customerId === customerId,
            );
        },

        getOrCreateAccount: (customerId) => {
            const existing = get().accounts.find(
                (account) => account.customerId === customerId,
            );

            if (existing) {
                return existing;
            }

            const account: CustomerAccount = {
                id: `account-${customerId}`,
                customerId,
                createdAt: new Date().toISOString(),
            };

            set((state) => ({
                accounts: [
                    ...state.accounts,
                    account,
                ],
            }));

            return account;
        },

        recordCustomerPayment: ({
            customerId,
            amount,
            orders,
            branchId,
        }) => {
            const safeAmount = Number.isFinite(amount)
                ? Math.max(0, amount)
                : 0;

            if (safeAmount <= 0) {
                throw new Error(
                    'El importe debe ser mayor que cero.',
                );
            }

            const account =
                get().getOrCreateAccount(customerId);

            const payment: CustomerPayment = {
                id: `payment-${Date.now()}`,
                accountId: account.id,
                customerId,
                amount: safeAmount,
                createdAt: new Date().toISOString(),
                branchId,
            };

            const result = allocatePaymentFifo(
                payment,
                orders,
                get().allocations,
            );

            set((state) => ({
                payments: [
                    ...state.payments,
                    payment,
                ],

                allocations: [
                    ...state.allocations,
                    ...result.allocations,
                ],
            }));

            return {
                payment,
                ...result,
            };
        },

        recordInitialOrderPayment: (
            customerId,
            order,
            amount,
            branchId,
        ) => {
            const safeAmount = Number.isFinite(amount)
                ? Math.max(0, amount)
                : 0;

            if (safeAmount <= 0) {
                throw new Error(
                    'El importe debe ser mayor que cero.',
                );
            }

            const orderBalance = calculateOrderBalanceDue(
                order,
                get().allocations,
            );

            const account =
                get().getOrCreateAccount(customerId);

            const payment: CustomerPayment = {
                id: `payment-${Date.now()}`,
                accountId: account.id,
                customerId,
                amount: safeAmount,
                createdAt: new Date().toISOString(),
                branchId,
            };

            const allocationAmount = Math.min(
                safeAmount,
                orderBalance,
            );

            const newAllocations: PaymentAllocation[] = [];

            if (allocationAmount > 0) {
                newAllocations.push({
                    id: `allocation-${payment.id}-${order.id}`,
                    paymentId: payment.id,
                    orderId: order.id,
                    amount: allocationAmount,
                    createdAt: payment.createdAt,
                });
            }

            set((state) => ({
                payments: [
                    ...state.payments,
                    payment,
                ],

                allocations: [
                    ...state.allocations,
                    ...newAllocations,
                ],
            }));

            return {
                payment,
                allocations: newAllocations,
                remainingAmount:
                    safeAmount - allocationAmount,
            };
        },

        applyAvailableCreditToOrder: (
            customerId,
            order,
        ) => {
            const result = allocateAvailableCredit(
                customerId,
                order,
                get().payments,
                get().allocations,
            );

            if (result.allocations.length === 0) {
                return 0;
            }

            let allocatedAmount = 0;

            for (const allocation of result.allocations) {
                allocatedAmount += allocation.amount;
            }

            set((state) => ({
                allocations: [
                    ...state.allocations,
                    ...result.allocations,
                ],
            }));

            return allocatedAmount;
        },

        getOrderPaidAmount: (orderId) => {
            return calculateOrderPaidAmount(
                orderId,
                get().allocations,
            );
        },

        getOrderBalanceDue: (order) => {
            return calculateOrderBalanceDue(
                order,
                get().allocations,
            );
        },

        getCustomerDebt: (
            customerId,
            orders,
        ) => {
            let totalDebt = 0;

            for (const order of orders) {
                if (order.customerId !== customerId) {
                    continue;
                }

                if (
                    order.status === 'CANCELLED'
                ) {
                    continue;
                }

                const balance = calculateOrderBalanceDue(
                    order,
                    get().allocations,
                );

                totalDebt += balance;
            }

            return totalDebt;
        },

        getCustomerCredit: (customerId) => {
            return calculateCustomerCredit(
                customerId,
                get().payments,
                get().allocations,
            );
        },

        getCustomerPayments: (customerId) => {
            const customerPayments: CustomerPayment[] = [];

            for (const payment of get().payments) {
                if (payment.customerId === customerId) {
                    customerPayments.push(payment);
                }
            }

            customerPayments.sort(
                (left, right) =>
                    right.createdAt.localeCompare(
                        left.createdAt,
                    ),
            );

            return customerPayments;
        },

        getOrderAllocations: (orderId) => {
            const orderAllocations: PaymentAllocation[] = [];

            for (const allocation of get().allocations) {
                if (allocation.orderId === orderId) {
                    orderAllocations.push(allocation);
                }
            }

            return orderAllocations;
        },

        serialize: () => {
            return serializeCustomerAccountState({
                accounts: get().accounts,
                payments: get().payments,
                allocations: get().allocations,
            });
        },

        hydrate: (serialized) => {
            set(
                deserializeCustomerAccountState(
                    serialized,
                ),
            );
        },
    }),
);
