/**
 * Pantallas auxiliares del formulario de pedido, por stack. Cada flujo navega solo dentro
 * de su propio stack (si saltara a otro, la flecha atrás volvería a otro lado): un stack
 * que use el formulario re-exporta estas pantallas y se suma acá.
 */
export type OrderFlow = 'orders' | 'shipments' | 'operations';

/** Los flujos que crean pedidos. Operaciones solo edita envíos, con el cliente fijo. */
export type OrderCreationFlow = Exclude<OrderFlow, 'operations'>;

export const ORDER_FORM_ROUTES = {
    orders: {
        selectProducts: '/orders/select-products',
        selectAddress: '/orders/select-address',
        addAddress: '/orders/add-address',
    },
    shipments: {
        selectProducts: '/shipments/select-products',
        selectAddress: '/shipments/select-address',
        addAddress: '/shipments/add-address',
    },
    operations: {
        selectProducts: '/operations/select-products',
        selectAddress: '/operations/select-address',
        addAddress: '/operations/add-address',
    },
} as const;

export const CUSTOMER_PICKER_ROUTES = {
    orders: {
        selectCustomer: '/orders/select-customer',
        newCustomer: '/orders/new-customer',
    },
    shipments: {
        selectCustomer: '/shipments/select-customer',
        newCustomer: '/shipments/new-customers',
    },
} as const;
