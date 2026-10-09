import { create } from 'zustand';

import {
    cancelOrder as cancelOrderRequest,
    createOrder as createOrderRequest,
    dispatchOrder as dispatchOrderRequest,
    getOrderById,
    getOrders,
    updateOrder as updateOrderRequest,
} from '@/services/order-service';
import { useAuthStore } from '@/stores/auth-store';
import {
    Order,
    OrderDeliveryFilter,
    OrderListParams,
    OrderRequest,
    OrderStatusFilter,
    OrderUpdateRequest,
    RefundAction,
} from '@/types/order';

const DEFAULT_PAGE_SIZE = 20;

type FetchOrdersOptions = {
    append?: boolean;
};

type OrderState = {
    orders: Order[];
    page: number;
    totalPages: number;
    totalElements: number;
    hasMore: boolean;
    listParams: OrderListParams;

    searchQuery: string;
    statusFilter: OrderStatusFilter;
    deliveryTypeFilter: OrderDeliveryFilter;
    isLoading: boolean;
    isLoadingMore: boolean;
    isError: boolean;
    errorMessage: string | null;

    // Shipments tab independent filters
    shipmentsSearchQuery: string;
    shipmentsStatusFilter: OrderStatusFilter;

    setSearchQuery: (query: string) => void;
    setStatusFilter: (filter: OrderStatusFilter) => void;
    setDeliveryTypeFilter: (filter: OrderDeliveryFilter) => void;
    resetFilters: () => void;

    setShipmentsSearchQuery: (query: string) => void;
    setShipmentsStatusFilter: (filter: OrderStatusFilter) => void;
    resetShipmentsFilters: () => void;

    fetchOrders: (
        params: Omit<OrderListParams, 'page'>,
        token: string,
        options?: FetchOrdersOptions
    ) => Promise<void>;
    fetchOrderById: (id: string, token: string) => Promise<Order>;
    createOrder: (data: OrderRequest, token: string) => Promise<Order>;
    updateOrder: (
        id: string,
        data: OrderUpdateRequest,
        token: string
    ) => Promise<Order>;
    cancelOrder: (
        id: string,
        token: string,
        refundAction?: RefundAction
    ) => Promise<Order>;
    dispatchOrder: (id: string, token: string) => Promise<Order>;
};

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function upsertOrder(orders: Order[], updated: Order): Order[] {
    return orders.some((order) => order.id === updated.id)
        ? orders.map((order) => (order.id === updated.id ? updated : order))
        : [updated, ...orders];
}

// Identifica la última carga de listado; las respuestas anteriores se descartan.
let latestListRequestId = 0;

export const useOrderStore = create<OrderState>((set, get) => ({
    orders: [],
    page: 0,
    totalPages: 0,
    totalElements: 0,
    hasMore: false,
    listParams: {},

    searchQuery: '',
    statusFilter: 'ALL',
    deliveryTypeFilter: 'ALL',

    shipmentsSearchQuery: '',
    shipmentsStatusFilter: 'ALL',

    isLoading: false,
    isLoadingMore: false,
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

    setShipmentsSearchQuery: (shipmentsSearchQuery) => {
        set({ shipmentsSearchQuery });
    },

    setShipmentsStatusFilter: (shipmentsStatusFilter) => {
        set({ shipmentsStatusFilter });
    },

    resetShipmentsFilters: () => {
        set({
            shipmentsSearchQuery: '',
            shipmentsStatusFilter: 'ALL',
        });
    },

    fetchOrders: async (params, token, options) => {
        const append = options?.append ?? false;

        if (append && (!get().hasMore || get().isLoadingMore)) {
            return;
        }

        const requestId = ++latestListRequestId;
        const page = append ? get().page + 1 : 0;
        const requestParams: OrderListParams = {
            size: DEFAULT_PAGE_SIZE,
            sort: 'createdAt,desc',
            ...params,
            page,
        };

        set(
            append
                ? { isLoadingMore: true, isError: false, errorMessage: null }
                : {
                    isLoading: true,
                    isLoadingMore: false,
                    isError: false,
                    errorMessage: null,
                    listParams: params,
                }
        );

        try {
            const result = await getOrders(requestParams, token);

            if (
                requestId !== latestListRequestId ||
                useAuthStore.getState().token !== token
            ) {
                return;
            }

            set((state) => ({
                orders: append
                    ? [
                        ...state.orders,
                        ...result.content.filter(
                            (order) =>
                                !state.orders.some((item) => item.id === order.id)
                        ),
                    ]
                    : result.content,
                page: result.page,
                totalPages: result.totalPages,
                totalElements: result.totalElements,
                hasMore: result.page + 1 < result.totalPages,
                isLoading: false,
                isLoadingMore: false,
            }));
        } catch (error) {
            if (requestId !== latestListRequestId) {
                return;
            }

            set({
                isLoading: false,
                isLoadingMore: false,
                isError: true,
                errorMessage: getErrorMessage(
                    error,
                    'No se pudieron cargar las órdenes.'
                ),
            });

            throw error;
        }
    },

    fetchOrderById: async (id, token) => {
        const order = await getOrderById(id, token);

        if (useAuthStore.getState().token === token) {
            set((state) => ({ orders: upsertOrder(state.orders, order) }));
        }

        return order;
    },

    createOrder: async (data, token) => {
        const order = await createOrderRequest(data, token);

        set((state) => ({
            orders: upsertOrder(state.orders, order),
            totalElements: state.totalElements + 1,
        }));

        return order;
    },

    updateOrder: async (id, data, token) => {
        const order = await updateOrderRequest(id, data, token);

        set((state) => ({ orders: upsertOrder(state.orders, order) }));

        return order;
    },

    cancelOrder: async (id, token, refundAction) => {
        const order = await cancelOrderRequest(id, token, refundAction);

        set((state) => ({ orders: upsertOrder(state.orders, order) }));

        return order;
    },

    dispatchOrder: async (id, token) => {
        const order = await dispatchOrderRequest(id, token);

        set((state) => ({ orders: upsertOrder(state.orders, order) }));

        return order;
    },
}));
