// --- Contrato del backend (/api/v1/customers) ---

export type AddressResponse = {
    id: number | string;
    label: string | null;
    street: string | null;
    number: string | null;
    apartment: string | null;
    floor: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    reference: string | null;
    mainAddress: boolean;
    active: boolean;
    createdAt: string;
    updatedAt: string;
};

export type CustomerResponse = {
    id: number | string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    documentType: string | null;
    documentNumber: string | null;
    observations: string | null;
    companyId: number | string;
    active: boolean;
    // Resumen de direcciones activas: el listado no trae las direcciones.
    addressCount: number;
    mainAddress: AddressResponse | null;
    createdAt: string;
    updatedAt: string;
};

export type AddressRequest = {
    label?: string | null;
    street: string;
    number?: string | null;
    apartment?: string | null;
    floor?: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    reference?: string | null;
    // true la convierte en la principal; false no le quita ese rol.
    mainAddress?: boolean;
};

// El backend exige nombre o apellido. Los PATCH reemplazan todos los campos:
// uno omitido queda en null, así que siempre se manda el objeto completo.
export type CustomerRequest = {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    documentType?: string | null;
    documentNumber?: string | null;
    observations?: string | null;
};

// Solo en el alta: el cliente y sus direcciones se crean en una transacción.
export type CustomerCreateRequest = CustomerRequest & {
    addresses?: AddressRequest[];
};

export type CustomerListParams = {
    q?: string;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: 'name,asc' | 'name,desc' | 'createdAt,asc' | 'createdAt,desc';
};

// --- Dominio del frontend ---

export type CustomerAddress = {
    id: string;
    // Opcional: con label se muestra como título y la dirección como subtítulo.
    label?: string;
    street: string;
    number?: string;
    apartment?: string;
    floor?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
    reference?: string;
    isMain: boolean;
    active: boolean;
};

export type Customer = {
    id: string;
    firstName?: string;
    lastName?: string;
    // Nombre para mostrar: nombre y apellido unidos.
    name: string;
    email?: string;
    phone?: string;
    documentType?: string;
    documentNumber?: string;
    observations?: string;
    active: boolean;
    addressCount: number;
    mainAddress: CustomerAddress | null;
};

export const CUSTOMER_ANONYMOUS: Customer = {
    id: 'customer-anonymous',
    name: 'Consumidor final',
    active: true,
    addressCount: 0,
    mainAddress: null,
};
