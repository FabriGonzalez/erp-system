import {
    CustomerAccountSnapshot,
    CustomerPayment,
    PaymentAllocation,
} from '@/types/customer-account';
import { Order } from '@/types/order';

export function sortOrdersFifo(orders: Order[]): Order[] {
    const sortedOrders = [...orders];

    sortedOrders.sort(
        (left, right) =>
            left.createdAt.localeCompare(right.createdAt) ||
            left.id.localeCompare(right.id),
    );

    return sortedOrders;
}

export function calculateOrderPaidAmount(
    orderId: string,
    allocations: PaymentAllocation[],
): number {
    let total = 0;

    for (const allocation of allocations) {
        if (allocation.orderId === orderId) {
            total += allocation.amount;
        }
    }

    return total;
}

export function calculateOrderBalanceDue(
    order: Order,
    allocations: PaymentAllocation[],
): number {
    const paidAmount = calculateOrderPaidAmount(order.id, allocations);
    return Math.max(0, order.total - paidAmount);
}

export function calculateCustomerCredit(
    customerId: string,
    payments: CustomerPayment[],
    allocations: PaymentAllocation[],
): number {
    const customerPaymentIds = new Set<string>();
    let paid = 0;

    for (const payment of payments) {
        if (payment.customerId === customerId) {
            customerPaymentIds.add(payment.id);
            paid += payment.amount;
        }
    }

    let allocated = 0;

    for (const allocation of allocations) {
        if (customerPaymentIds.has(allocation.paymentId)) {
            allocated += allocation.amount;
        }
    }

    return Math.max(0, paid - allocated);
}

export function allocatePaymentFifo(
    payment: CustomerPayment,
    orders: Order[],
    allocations: PaymentAllocation[],
    now = new Date().toISOString(),
): {
    allocations: PaymentAllocation[];
    remainingAmount: number;
} {
    let remainingAmount = payment.amount;
    const newAllocations: PaymentAllocation[] = [];

    const sortedOrders = sortOrdersFifo(orders);

    for (const order of sortedOrders) {
        if (remainingAmount <= 0) {
            break;
        }

        if (order.customerId !== payment.customerId) {
            continue;
        }

        if (order.status === 'DRAFT' || order.status === 'CANCELLED') {
            continue;
        }

        const orderBalance = calculateOrderBalanceDue(order, allocations);

        if (orderBalance <= 0) {
            continue;
        }

        const amount = Math.min(remainingAmount, orderBalance);

        if (amount <= 0) {
            continue;
        }

        newAllocations.push({
            id: `allocation-${payment.id}-${order.id}`,
            paymentId: payment.id,
            orderId: order.id,
            amount,
            createdAt: now,
        });

        remainingAmount -= amount;
    }

    return {
        allocations: newAllocations,
        remainingAmount,
    };
}

export function allocateAvailableCredit(
    customerId: string,
    order: Order,
    payments: CustomerPayment[],
    allocations: PaymentAllocation[],
    now = new Date().toISOString(),
): {
    allocations: PaymentAllocation[];
    remainingCredit: number;
} {
    let remainingOrderBalance = calculateOrderBalanceDue(
        order,
        allocations,
    );

    let remainingCredit = calculateCustomerCredit(
        customerId,
        payments,
        allocations,
    );

    const newAllocations: PaymentAllocation[] = [];

    const customerPayments: CustomerPayment[] = [];

    for (const payment of payments) {
        if (payment.customerId === customerId) {
            customerPayments.push(payment);
        }
    }

    customerPayments.sort(
        (left, right) =>
            left.createdAt.localeCompare(right.createdAt) ||
            left.id.localeCompare(right.id),
    );

    for (const payment of customerPayments) {
        if (remainingOrderBalance <= 0) {
            break;
        }

        let allocatedAmount = 0;

        for (const allocation of allocations) {
            if (allocation.paymentId === payment.id) {
                allocatedAmount += allocation.amount;
            }
        }

        const availablePaymentAmount = Math.max(
            0,
            payment.amount - allocatedAmount,
        );

        const amount = Math.min(
            availablePaymentAmount,
            remainingOrderBalance,
        );

        if (amount <= 0) {
            continue;
        }

        newAllocations.push({
            id: `allocation-${payment.id}-${order.id}-${newAllocations.length}`,
            paymentId: payment.id,
            orderId: order.id,
            amount,
            createdAt: now,
        });

        remainingOrderBalance -= amount;
        remainingCredit -= amount;
    }

    return {
        allocations: newAllocations,
        remainingCredit: Math.max(0, remainingCredit),
    };
}

export function serializeCustomerAccountState(
    snapshot: CustomerAccountSnapshot,
): string {
    return JSON.stringify(snapshot);
}

export function deserializeCustomerAccountState(
    serialized: string,
): CustomerAccountSnapshot {
    const parsed = JSON.parse(
        serialized,
    ) as Partial<CustomerAccountSnapshot>;

    return {
        accounts: Array.isArray(parsed.accounts)
            ? parsed.accounts
            : [],
        payments: Array.isArray(parsed.payments)
            ? parsed.payments
            : [],
        allocations: Array.isArray(parsed.allocations)
            ? parsed.allocations
            : [],
    };
}
