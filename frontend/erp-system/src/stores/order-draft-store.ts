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
    amountPaid: number;

    initNewOrder: () => void;
    initEditOrder: (order: Order, customer: Customer) => void;

    setCustomer: (customer: Customer) => void;
    updateCustomer: (customer: Customer) => void;
    setDeliveryType: (deliveryType: DeliveryType) => void;
    setAddress: (address: CustomerAddress) => void;
    setAmountPaid: (amount: number) => void;

    addItem: (product: Product, maxStock: number, variantId?: string) => void;
    updateItemQuantity: (
        productId: string,
        variantId: string,
        quantity: number,
        maxStock: number,
    ) => void;
    removeItem: (productId: string, variantId: string) => void;
    clearCart: () => void;
    reset: () => void;
};

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
    orderId: null,
    customer: CUSTOMER_ANONYMOUS,
    deliveryType: 'LOCAL_PICKUP',
    address: undefined,
    items: [],
    amountPaid: 0,

    initNewOrder: () => {
        set({
            orderId: null,
            customer: CUSTOMER_ANONYMOUS,
            deliveryType: 'LOCAL_PICKUP',
            address: undefined,
            items: [],
            amountPaid: 0,
        });
    },

    initEditOrder: (order, customer) => {
        const total = Number.isFinite(order.total) && order.total >= 0 ? order.total : 0;
        const amountPaid = Number.isFinite(order.amountPaid)
            ? Math.min(Math.max(0, order.amountPaid), total)
            : 0;

        set({
            orderId: order.id,
            customer,
            deliveryType: order.deliveryType,
            address: order.address,
            items: order.items,
            amountPaid,
        });
    },

    setCustomer: (customer) => {
        set({
            customer,
            address: undefined,
        });
    },

    updateCustomer: (customer) => {
        set({ customer });
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

    setAmountPaid: (amountPaid) => {
        set({ amountPaid: Number.isFinite(amountPaid) ? Math.max(0, amountPaid) : 0 });
    },

    addItem: (product, maxStock, variantId) => {
        if (maxStock <= 0) {
            return;
        }

        const { items } = get();
        const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
        if (!variant) return;

        const existingItem = items.find(
            (item) => item.productId === product.id && item.variantId === variant.id,
        );

        const currentQuantity = existingItem?.quantity ?? 0;

        if (currentQuantity >= maxStock) {
            return;
        }

        const newQuantity = currentQuantity + 1;

        if (existingItem) {
            set({
                items: items.map((item) =>
                    item.productId === product.id && item.variantId === variant.id
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
            variantId: variant.id,
            productName: product.name,
            productSku: variant.sku,
            quantity: 1,
            unitPrice: variant.price,
            subtotal: variant.price,
        };

        set({
            items: [...items, newItem],
        });
    },

    updateItemQuantity: (productId, variantId, quantity, maxStock) => {
        const { items } = get();

        if (quantity <= 0 || maxStock <= 0) {
            set({
                items: items.filter(
                    (item) => item.productId !== productId || item.variantId !== variantId,
                ),
            });

            return;
        }

        const targetQuantity = Math.min(quantity, maxStock);

        set({
            items: items.map((item) =>
                item.productId === productId && item.variantId === variantId
                    ? {
                        ...item,
                        quantity: targetQuantity,
                        subtotal: targetQuantity * item.unitPrice,
                    }
                    : item,
            ),
        });
    },

    removeItem: (productId, variantId) => {
        const { items } = get();

        set({
            items: items.filter(
                (item) => item.productId !== productId || item.variantId !== variantId,
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
            amountPaid: 0,
        });
    },
}));
