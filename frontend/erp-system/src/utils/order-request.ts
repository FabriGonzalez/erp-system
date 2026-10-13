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

// Todos los clientes vienen del backend; el consumidor final es el único que no
// existe allí y el pedido se envía sin cliente.
export function toBackendCustomerId(customer: Customer): number | undefined {
    return customer.id === CUSTOMER_ANONYMOUS.id ? undefined : Number(customer.id);
}

export function toOrderItemRequests(items: OrderItem[]): OrderItemRequest[] {
    return items.map((item) => ({
        productVariantId: Number(item.variantId),
        quantity: item.quantity,
    }));
}
