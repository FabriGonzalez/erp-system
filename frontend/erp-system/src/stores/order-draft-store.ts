import { create } from 'zustand';

import {
    CUSTOMER_ANONYMOUS,
    Customer,
    CustomerAddress,
} from '@/types/customer';
import {
    DeliveryType,
    Order,
    OrderCreationMode,
    OrderItem,
    PaymentMethod,
    SalesType,
} from '@/types/order';
import { Product } from '@/types/product';

/** Lo que el pedido en edición ya tenía de una variante. */
type OriginalItem = {
    quantity: number;
    unitPrice: number;
};

type OrderDraftState = {
    orderId: string | null;
    customer: Customer;
    salesType: SalesType;
    quickSaleAmount: number;
    deliveryType: DeliveryType;
    address: CustomerAddress | undefined;
    items: OrderItem[];
    // Solo al editar, por variante: esas unidades ya están descontadas del stock (se suman al
    // límite) y conservan el precio con que se vendieron, como hace el backend.
    originalItems: Record<string, OriginalItem>;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    applyCredit: boolean;

    initNewOrder: (mode?: OrderCreationMode) => void;
    initEditOrder: (order: Order, customer: Customer) => void;

    setCustomer: (customer: Customer) => void;
    updateCustomer: (customer: Customer) => void;
    setSalesType: (salesType: SalesType) => void;
    setQuickSaleAmount: (amount: number) => void;
    setDeliveryType: (deliveryType: DeliveryType) => void;
    setAddress: (address: CustomerAddress) => void;
    setAmountPaid: (amount: number) => void;
    setPaymentMethod: (method: PaymentMethod) => void;
    setApplyCredit: (applyCredit: boolean) => void;

    /** maxStock: stock de la variante en la sucursal; al editar se le suma lo ya reservado. */
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

/**
 * Cantidad que queda después de pedir quantity: bajar siempre se puede; subir, hasta el límite
 * (o hasta lo que ya hay, si el stock bajó). 0 saca el ítem.
 */
function nextQuantity(current: number, requested: number, limit: number): number {
    if (requested <= current) {
        return Math.max(0, requested);
    }
    return Math.min(requested, Math.max(limit, current));
}

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
    orderId: null,
    customer: CUSTOMER_ANONYMOUS,
    salesType: 'WITH_PRODUCTS',
    quickSaleAmount: 0,
    deliveryType: 'LOCAL_PICKUP',
    address: undefined,
    items: [],
    originalItems: {},
    amountPaid: 0,
    paymentMethod: 'CASH',
    applyCredit: false,

    initNewOrder: (mode = 'SALE') => {
        set({
            orderId: null,
            customer: CUSTOMER_ANONYMOUS,
            salesType: 'WITH_PRODUCTS',
            quickSaleAmount: 0,
            deliveryType: mode === 'SHIPMENT' ? 'SHIPPING' : 'LOCAL_PICKUP',
            address: undefined,
            items: [],
            originalItems: {},
            amountPaid: 0,
            paymentMethod: 'CASH',
            applyCredit: false,
        });
    },

    initEditOrder: (order, customer) => {
        // Lo pagado lo calcula el backend a partir de los pagos asignados a la orden.
        const amountPaid = Number.isFinite(order.amountPaid)
            ? Math.max(0, order.amountPaid)
            : 0;

        const initialSalesType = order.salesType;

        const initialQuickSaleAmount =
            order.quickSaleAmount ??
            (initialSalesType === 'QUICK_SALE' ? order.total : 0);

        set({
            orderId: order.id,
            customer,
            salesType: initialSalesType,
            quickSaleAmount: initialQuickSaleAmount,
            deliveryType: order.deliveryType,
            // Al editar, address es la dirección nueva que se elija; la actual del envío
            // es un snapshot (order.shippingAddress), no una dirección del cliente.
            address: undefined,
            items: order.items,
            originalItems: Object.fromEntries(
                order.items.map((item) => [item.variantId, { quantity: item.quantity, unitPrice: item.unitPrice }]),
            ),
            amountPaid,
        });
    },

    setCustomer: (customer) => {
        set({
            customer,
            address: undefined,
            applyCredit: false,
        });
    },

    updateCustomer: (customer) => {
        set({ customer });
    },

    setSalesType: (salesType) => {
        set({ salesType });
    },

    setQuickSaleAmount: (amount) => {
        set({ quickSaleAmount: Number.isFinite(amount) ? Math.max(0, amount) : 0 });
    },

    setDeliveryType: (deliveryType) => {
        set({
            deliveryType,
            address: undefined,
        });
    },

    setPaymentMethod: (paymentMethod) => {
        set({ paymentMethod });
    },

    setApplyCredit: (applyCredit) => {
        set({ applyCredit });
    },

    setAddress: (address) => {
        set({ address });
    },

    setAmountPaid: (amountPaid) => {
        set({ amountPaid: Number.isFinite(amountPaid) ? Math.max(0, amountPaid) : 0 });
    },

    addItem: (product, maxStock, variantId) => {
        const { items, originalItems } = get();
        const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
        if (!variant) return;

        const original = originalItems[variant.id];
        const limit = maxStock + (original?.quantity ?? 0);
        const existingItem = items.find(
            (item) => item.productId === product.id && item.variantId === variant.id,
        );

        const currentQuantity = existingItem?.quantity ?? 0;

        if (currentQuantity >= limit) {
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

        // Si se quitó y se vuelve a agregar en la misma edición, conserva el precio vendido.
        const unitPrice = original?.unitPrice ?? variant.price;
        const newItem: OrderItem = {
            id: `item-${Date.now()}-${product.id}`,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            productSku: variant.sku,
            quantity: 1,
            unitPrice,
            subtotal: unitPrice,
        };

        set({
            items: [...items, newItem],
        });
    },

    updateItemQuantity: (productId, variantId, quantity, maxStock) => {
        const { items, originalItems } = get();
        const item = items.find(
            (candidate) => candidate.productId === productId && candidate.variantId === variantId,
        );
        if (!item) return;

        const limit = maxStock + (originalItems[variantId]?.quantity ?? 0);
        const targetQuantity = nextQuantity(item.quantity, quantity, limit);

        // Sin stock libre no se borra: solo lo saca llegar a 0 (o el botón quitar).
        if (targetQuantity <= 0) {
            set({
                items: items.filter(
                    (candidate) => candidate.productId !== productId || candidate.variantId !== variantId,
                ),
            });

            return;
        }

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
            salesType: 'WITH_PRODUCTS',
            quickSaleAmount: 0,
            deliveryType: 'LOCAL_PICKUP',
            address: undefined,
            items: [],
            originalItems: {},
            amountPaid: 0,
            paymentMethod: 'CASH',
            applyCredit: false,
        });
    },
}));
