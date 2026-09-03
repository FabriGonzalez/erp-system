import { create } from 'zustand';

import {
    CUSTOMER_ANONYMOUS,
    Customer,
    CustomerAddress,
} from '@/types/customer';
import { DeliveryType, Order, OrderItem } from '@/types/order';
import { Product } from '@/types/product';

type OrderDraftState = {
    orderId: string | null;
    customer: Customer;
    deliveryType: DeliveryType;
    address: CustomerAddress | undefined;
    items: OrderItem[];

    initNewOrder: () => void;
    initEditOrder: (order: Order, customer: Customer) => void;

    setCustomer: (customer: Customer) => void;
    setDeliveryType: (deliveryType: DeliveryType) => void;
    setAddress: (address: CustomerAddress) => void;

    addItem: (product: Product, maxStock: number) => void;
    updateItemQuantity: (
        productId: string,
        quantity: number,
        maxStock: number,
    ) => void;
    removeItem: (productId: string) => void;
    clearCart: () => void;
    reset: () => void;
};

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
    orderId: null,
    customer: CUSTOMER_ANONYMOUS,
    deliveryType: 'LOCAL_PICKUP',
    address: undefined,
    items: [],

    initNewOrder: () => {
        set({
            orderId: null,
            customer: CUSTOMER_ANONYMOUS,
            deliveryType: 'LOCAL_PICKUP',
            address: undefined,
            items: [],
        });
    },

    initEditOrder: (order, customer) => {
        set({
            orderId: order.id,
            customer,
            deliveryType: order.deliveryType,
            address: order.address,
            items: order.items,
        });
    },

    setCustomer: (customer) => {
        set({
            customer,
            address: undefined,
        });
    },

    setDeliveryType: (deliveryType) => {
        set({
            deliveryType,
            address: undefined,
        });
    },

    setAddress: (address) => {
        set({ address });
    },

    addItem: (product, maxStock) => {
        if (maxStock <= 0) {
            return;
        }

        const { items } = get();
        const existingItem = items.find(
            (item) => item.productId === product.id,
        );

        const currentQuantity = existingItem?.quantity ?? 0;

        if (currentQuantity >= maxStock) {
            return;
        }

        const newQuantity = currentQuantity + 1;

        if (existingItem) {
            set({
                items: items.map((item) =>
                    item.productId === product.id
                        ? {
                            ...item,
                            quantity: newQuantity,
                            subtotal: newQuantity * item.unitPrice,
                        }
                        : item,
                ),
            });

            return;
        }

        const newItem: OrderItem = {
            id: `item-${Date.now()}-${product.id}`,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: 1,
            unitPrice: product.price,
            subtotal: product.price,
        };

        set({
            items: [...items, newItem],
        });
    },

    updateItemQuantity: (productId, quantity, maxStock) => {
        const { items } = get();

        if (quantity <= 0 || maxStock <= 0) {
            set({
                items: items.filter(
                    (item) => item.productId !== productId,
                ),
            });

            return;
        }

        const targetQuantity = Math.min(quantity, maxStock);

        set({
            items: items.map((item) =>
                item.productId === productId
                    ? {
                        ...item,
                        quantity: targetQuantity,
                        subtotal: targetQuantity * item.unitPrice,
                    }
                    : item,
            ),
        });
    },

    removeItem: (productId) => {
        const { items } = get();

        set({
            items: items.filter(
                (item) => item.productId !== productId,
            ),
        });
    },

    clearCart: () => {
        set({ items: [] });
    },

    reset: () => {
        set({
            orderId: null,
            customer: CUSTOMER_ANONYMOUS,
            deliveryType: 'LOCAL_PICKUP',
            address: undefined,
            items: [],
        });
    },
}));
