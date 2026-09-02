export type Company = {
    id: string;
    name: string;
};

export type Branch = {
    id: string;
    name: string;
};

export type Role = 'ADMINISTRATOR' | 'EMPLOYEE';

export type Permission =
    | 'PRODUCTS_CREATE'
    | 'PRODUCTS_READ'
    | 'PRODUCTS_UPDATE'
    | 'CATEGORIES_CREATE'
    | 'CATEGORIES_READ'
    | 'CUSTOMERS_CREATE'
    | 'CUSTOMERS_READ'
    | 'ORDERS_CREATE'
    | 'ORDERS_READ'
    | 'ORDERS_UPDATE'
    | 'INVENTORY_READ'
    | 'INVENTORY_ADJUST'
    | 'TRANSFERS_CREATE'
    | 'TRANSFERS_READ'
    | 'USERS_MANAGE'
    | 'BRANCHES_MANAGE'
    | 'REPORTS_READ'
    | 'SHIPPING_READ';

export type User = {
    id: string;
    name: string;
    email: string;
    role: Role;
    company: Company;
    branches: Branch[];
    permissions: Permission[];
};