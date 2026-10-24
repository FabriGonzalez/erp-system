import { create } from 'zustand';

import {
    CUSTOMER_ANONYMOUS,
    Customer,
    CustomerAddress,
} from '@/types/customer';
import {
    DeliveryType,
    Order,
    NEW_PROMO_LINE_PREFIX,
    OrderCreationMode,
    OrderItem,
    OrderPromo,
    OrderPromoComponent,
    PaymentMethod,
    SalesType,
} from '@/types/order';
import { Product } from '@/types/product';
import { Promotion } from '@/types/promotion';
import { draftUnitsByVariant, promoUnitsByVariant } from '@/utils/draft-stock';

/** Lo que el pedido en edición ya tenía de una variante suelta. */
type OriginalItem = {
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
    promos: OrderPromo[];
    // Solo al editar, por variante: lo vendido suelto conserva su precio, como hace el backend.
    originalItems: Record<string, OriginalItem>;
    // Solo al editar, por variante: unidades (sueltas y en promos) ya descontadas del stock,
    // que se suman al límite.
    originalUnits: Record<string, number>;
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

    /**
     * maxStock: stock de la variante en la sucursal. El límite le suma lo que el pedido en edición
     * ya tenía descontado y le resta lo que usan las promos del borrador.
     */
    addItem: (product: Product, maxStock: number, variantId?: string) => void;
    updateItemQuantity: (
        productId: string,
        variantId: string,
        quantity: number,
        maxStock: number,
    ) => void;
    removeItem: (productId: string, variantId: string) => void;
    /**
     * Suma una promo con las variantes elegidas. Si ya hay una línea nueva con la misma
     * combinación, le suma 1; si no, crea otra línea.
     */
    addPromoLine: (promotion: Promotion, components: OrderPromoComponent[]) => void;
    /** limit: cuántas veces entra la combinación (utils/draft-stock promoLimit). 0 la saca. */
    updatePromoQuantity: (lineId: string, quantity: number, limit: number) => void;
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

/** Misma combinación de variantes, sin importar el orden. */
function combinationKey(components: OrderPromoComponent[]): string {
    return components
        .map((component) => `${component.variantId}x${component.quantity}`)
        .sort()
        .join('|');
}

/**
 * Unidades sueltas que puede llevar la variante: el stock de la sucursal, más lo que el pedido
 * en edición ya tenía descontado, menos lo que usan las promos del borrador.
 */
function looseLimit(state: OrderDraftState, variantId: string, maxStock: number): number {
    return maxStock + (state.originalUnits[variantId] ?? 0) - (promoUnitsByVariant(state.promos)[variantId] ?? 0);
}

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
    orderId: null,
    customer: CUSTOMER_ANONYMOUS,
    salesType: 'WITH_PRODUCTS',
    quickSaleAmount: 0,
    deliveryType: 'LOCAL_PICKUP',
    address: undefined,
    items: [],
    promos: [],
    originalItems: {},
    originalUnits: {},
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
            promos: [],
            originalItems: {},
                    originalUnits: {},
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
            promos: order.promos,
            originalItems: Object.fromEntries(
                order.items.map((item) => [item.variantId, { unitPrice: item.unitPrice }]),
            ),
            originalUnits: draftUnitsByVariant(order.items, order.promos),
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
        const state = get();
        const { items, originalItems } = state;
        const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
        if (!variant) return;

        const original = originalItems[variant.id];
        const limit = looseLimit(state, variant.id, maxStock);
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
        const state = get();
        const { items } = state;
        const item = items.find(
            (candidate) => candidate.productId === productId && candidate.variantId === variantId,
        );
        if (!item) return;

        const limit = looseLimit(state, variantId, maxStock);
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

    addPromoLine: (promotion, components) => {
        const { promos } = get();
        const key = combinationKey(components);
        const existing = promos.find((promo) =>
            promo.id.startsWith(NEW_PROMO_LINE_PREFIX)
            && promo.promotionId === promotion.id
            && combinationKey(promo.components) === key);

        if (existing) {
            const quantity = existing.quantity + 1;
            set({
                promos: promos.map((promo) => promo.id === existing.id
                    ? { ...promo, quantity, subtotal: quantity * promo.unitPrice }
                    : promo),
            });
            return;
        }

        set({
            promos: [...promos, {
                id: `${NEW_PROMO_LINE_PREFIX}${Date.now()}-${promotion.id}`,
                promotionId: promotion.id,
                name: promotion.name,
                unitPrice: promotion.price,
                quantity: 1,
                subtotal: promotion.price,
                components,
            }],
        });
    },

    updatePromoQuantity: (lineId, quantity, limit) => {
        const { promos } = get();
        const promo = promos.find((candidate) => candidate.id === lineId);
        if (!promo) return;

        const targetQuantity = nextQuantity(promo.quantity, quantity, limit);

        if (targetQuantity <= 0) {
            set({ promos: promos.filter((candidate) => candidate.id !== lineId) });
            return;
        }

        set({
            promos: promos.map((candidate) => candidate.id === lineId
                ? { ...candidate, quantity: targetQuantity, subtotal: targetQuantity * candidate.unitPrice }
                : candidate),
        });
    },

    clearCart: () => {
        set({ items: [], promos: [] });
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
            promos: [],
            originalItems: {},
                    originalUnits: {},
            amountPaid: 0,
            paymentMethod: 'CASH',
            applyCredit: false,
        });
    },
}));
