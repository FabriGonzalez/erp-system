import { User } from '@/types/auth';

export const mockUser: User = {
    id: '1',

    name: 'Administrador',

    email: 'admin@elyuyei.com',

    role: 'ADMINISTRATOR',

    company: {
        id: '1',
        name: 'ElYuyei',
    },

    branches: [
        {
            id: '1',
            name: 'Sucursal Centro',
        },
        {
            id: '2',
            name: 'Sucursal Norte',
        },
        {
            id: '3',
            name: 'Sucursal Sur',
        },
    ],

    permissions: [
        'PRODUCTS_CREATE',
        'PRODUCTS_READ',
        'PRODUCTS_UPDATE',
        'CATEGORIES_CREATE',
        'CATEGORIES_READ',
        'CUSTOMERS_CREATE',
        'CUSTOMERS_READ',
        'ORDERS_CREATE',
        'ORDERS_READ',
        'ORDERS_UPDATE',
        'INVENTORY_READ',
        'INVENTORY_ADJUST',
        'TRANSFERS_CREATE',
        'TRANSFERS_READ',
        'USERS_MANAGE',
        'BRANCHES_MANAGE',
        'REPORTS_READ',
        'SHIPPING_READ',
    ],
};

export const mockEmployee: User = {
    id: '2',

    name: 'Juan Pérez',

    email: 'juan@elyuyei.com',

    role: 'EMPLOYEE',

    company: {
        id: '1',
        name: 'ElYuyei',
    },

    branches: [
        {
            id: '1',
            name: 'Sucursal Centro',
        },
    ],

    permissions: [
        'PRODUCTS_READ',
        'CATEGORIES_READ',
        'CUSTOMERS_READ',
        'ORDERS_READ',
        'INVENTORY_READ',
        'SHIPPING_READ',
    ],
};