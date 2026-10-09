import { CUSTOMER_ANONYMOUS, Customer } from '@/types/customer';
import { OrderItem, OrderItemRequest, OrderRequest, PaymentMethod } from '@/types/order';

type DraftPayment = {
    customer: Customer;
    applyCredit: boolean;
    amountPaid: number;
    paymentMethod: PaymentMethod;
};

/**
 * Opciones de pago del alta. Las ventas sin cliente se cobran completas en el
 * backend, así que no envían crédito ni pago.
 */
export function toOrderPaymentOptions(
    draft: DraftPayment
): Pick<OrderRequest, 'applyCredit' | 'initialPayment'> {
    if (toBackendCustomerId(draft.customer) === undefined) {
        return {};
    }

    const amount = Number.isFinite(draft.amountPaid) ? Math.max(0, draft.amountPaid) : 0;

    return {
        applyCredit: draft.applyCredit || undefined,
        initialPayment: amount > 0 ? { amount, method: draft.paymentMethod } : undefined,
    };
}

// Los clientes todavía provienen de datos locales; solo los ids numéricos
// corresponden a un cliente real del backend.
export function toBackendCustomerId(customer: Customer): number | undefined {
    if (customer.id === CUSTOMER_ANONYMOUS.id) {
        return undefined;
    }

    const id = Number(customer.id);
    return Number.isInteger(id) && id > 0 ? id : undefined;
}

export function toOrderItemRequests(items: OrderItem[]): OrderItemRequest[] {
    return items.map((item) => ({
        productVariantId: Number(item.variantId),
        quantity: item.quantity,
    }));
}
