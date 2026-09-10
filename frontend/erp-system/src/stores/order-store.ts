import { create } from 'zustand';

import { mockOrders } from '@/data/mock-orders';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import {
    DeliveryType,
    Order,
    OrderDeliveryFilter,
    OrderStatus,
    OrderStatusFilter,
} from '@/types/order';

type OrderUpdate = Pick<
    Order,
    | 'customerId'
    | 'customerName'
    | 'deliveryType'
    | 'address'
    | 'items'
    | 'total'
    | 'amountPaid'
>;

type OrderState = {
    orders: Order[];
    searchQuery: string;
    statusFilter: OrderStatusFilter;
    deliveryTypeFilter: OrderDeliveryFilter;
    isLoading: boolean;
    isError: boolean;
    errorMessage: string | null;

    setSearchQuery: (query: string) => void;
    setStatusFilter: (filter: OrderStatusFilter) => void;
    setDeliveryTypeFilter: (filter: OrderDeliveryFilter) => void;
    resetFilters: () => void;

    setLoading: (loading: boolean) => void;
    setError: (error: boolean, message?: string | null) => void;
    reloadOrders: () => void;

    addOrder: (
        orderData: Omit<
            Order,
            'id' | 'orderNumber' | 'status' | 'createdAt' | 'updatedAt'
        >
    ) => string;

    updateOrder: (id: string, updates: Partial<OrderUpdate>) => void;

    confirmOrder: (id: string) => boolean;
    cancelOrder: (id: string) => boolean;
    advanceOrderStatus: (id: string) => boolean;
};

function getInitialStatus(deliveryType: DeliveryType): OrderStatus {
    return deliveryType === 'LOCAL_PICKUP'
        ? 'CONFIRMED'
        : 'DRAFT';
}

function generateOrderNumber(orders: Order[]): string {
    const maxNum = orders.reduce((max, order) => {
        const num = parseInt(
            order.orderNumber.replace('PED-', ''),
            10
        );

        return num > max ? num : max;
    }, 0);

    return `PED-${String(maxNum + 1).padStart(3, '0')}`;
}

const STATUS_FLOW: OrderStatus[] = [
    'CONFIRMED',
    'IN_PREPARATION',
    'READY_TO_SHIP',
    'SHIPPED',
    'DELIVERED',
];

function normalizeAmountPaid(amountPaid: number, total: number, customerId: string) {
    const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
    const safeAmount = Number.isFinite(amountPaid) ? Math.max(0, amountPaid) : 0;
    const clampedAmount = Math.min(safeAmount, safeTotal);

    if (
        customerId === CUSTOMER_ANONYMOUS.id &&
        clampedAmount > 0 &&
        clampedAmount < safeTotal
    ) {
        return safeTotal;
    }

    return clampedAmount;
}

export const useOrderStore = create<OrderState>((set, get) => ({
    orders: mockOrders,

    searchQuery: '',
    statusFilter: 'ALL',
    deliveryTypeFilter: 'ALL',

    isLoading: false,
    isError: false,
    errorMessage: null,

    setSearchQuery: (searchQuery) => {
        set({ searchQuery });
    },

    setStatusFilter: (statusFilter) => {
        set({ statusFilter });
    },

    setDeliveryTypeFilter: (deliveryTypeFilter) => {
        set({ deliveryTypeFilter });
    },

    resetFilters: () => {
        set({
            searchQuery: '',
            statusFilter: 'ALL',
            deliveryTypeFilter: 'ALL',
            isError: false,
            errorMessage: null,
        });
    },

    setLoading: (isLoading) => {
        set({ isLoading });
    },

    setError: (isError, errorMessage = null) => {
        set({
            isError,
            errorMessage,
        });
    },

    reloadOrders: () => {
        set({
            isLoading: true,
            isError: false,
            errorMessage: null,
        });

        setTimeout(() => {
            set({
                isLoading: false,
            });
        }, 600);
    },

    addOrder: (orderData) => {
        const { orders } = get();

        const now = new Date().toISOString();
        const id = `ord-${Date.now()}`;
        const orderNumber = generateOrderNumber(orders);

        const status = getInitialStatus(orderData.deliveryType);

        const newOrder: Order = {
            ...orderData,
            amountPaid: normalizeAmountPaid(orderData.amountPaid, orderData.total, orderData.customerId),
            id,
            orderNumber,
            status,
            createdAt: now,
            updatedAt: now,
        };

        set((state) => ({
            orders: [newOrder, ...state.orders],
        }));

        return id;
    },

    updateOrder: (id, updates) => {
        set((state) => ({
            orders: state.orders.map((order) =>
                order.id === id
                    ? {
                        ...order,
                        ...updates,
                        amountPaid: normalizeAmountPaid(
                            updates.amountPaid ?? order.amountPaid,
                            updates.total ?? order.total,
                            updates.customerId ?? order.customerId,
                        ),
                        updatedAt: new Date().toISOString(),
                    }
                    : order
            ),
        }));
    },

    confirmOrder: (id) => {
        const order = get().orders.find((order) => order.id === id);

        if (!order) {
            return false;
        }

        if (order.status !== 'DRAFT') {
            return false;
        }

        set((state) => ({
            orders: state.orders.map((order) =>
                order.id === id
                    ? {
                        ...order,
                        status: 'CONFIRMED',
                        updatedAt: new Date().toISOString(),
                    }
                    : order
            ),
        }));

        return true;
    },

    cancelOrder: (id) => {
        const order = get().orders.find((order) => order.id === id);

        if (!order) {
            return false;
        }

        if (
            order.status === 'CANCELLED' ||
            order.status === 'DELIVERED'
        ) {
            return false;
        }

        set((state) => ({
            orders: state.orders.map((order) =>
                order.id === id
                    ? {
                        ...order,
                        status: 'CANCELLED',
                        updatedAt: new Date().toISOString(),
                    }
                    : order
            ),
        }));

        return true;
    },

    advanceOrderStatus: (id) => {
        const order = get().orders.find((order) => order.id === id);

        if (!order) {
            return false;
        }

        if (order.deliveryType !== 'SHIPPING') {
            return false;
        }

        const currentIndex = STATUS_FLOW.indexOf(order.status);

        if (
            currentIndex === -1 ||
            currentIndex >= STATUS_FLOW.length - 1
        ) {
            return false;
        }

        const nextStatus = STATUS_FLOW[currentIndex + 1];

        set((state) => ({
            orders: state.orders.map((order) =>
                order.id === id
                    ? {
                        ...order,
                        status: nextStatus,
                        updatedAt: new Date().toISOString(),
                    }
                    : order
            ),
        }));

        return true;
    },
}));