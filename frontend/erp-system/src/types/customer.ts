export type CustomerAddress = {
    id: string;
    label: string;
    street: string;
    number: string;
    city: string;
    province: string;
    zipCode: string;
};

export type Customer = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    addresses: CustomerAddress[];
};

export const CUSTOMER_ANONYMOUS: Customer = {
    id: 'customer-anonymous',
    name: 'Consumidor final',
    addresses: [],
};
