import { Customer, CUSTOMER_ANONYMOUS } from '@/types/customer';

export { CUSTOMER_ANONYMOUS };

export const mockCustomers: Customer[] = [
    {
        id: 'cust-1',
        name: 'María García',
        email: 'maria.garcia@email.com',
        phone: '11-5555-1234',
        addresses: [
            {
                id: 'addr-1',
                label: 'Casa',
                street: 'Av. Corrientes',
                number: '1234',
                city: 'Buenos Aires',
                province: 'CABA',
                zipCode: 'C1042',
            },
            {
                id: 'addr-2',
                label: 'Oficina',
                street: 'Av. Libertador',
                number: '5678',
                city: 'Buenos Aires',
                province: 'CABA',
                zipCode: 'C1425',
            },
        ],
    },
    {
        id: 'cust-2',
        name: 'Carlos López',
        email: 'carlos.lopez@email.com',
        phone: '11-5555-5678',
        addresses: [
            {
                id: 'addr-3',
                label: 'Casa',
                street: 'Calle Florida',
                number: '456',
                city: 'Buenos Aires',
                province: 'CABA',
                zipCode: 'C1005',
            },
        ],
    },
    {
        id: 'cust-3',
        name: 'Ana Rodríguez',
        email: 'ana.rodriguez@email.com',
        phone: '11-5555-9012',
        addresses: [
            {
                id: 'addr-4',
                label: 'Casa',
                street: 'Calle San Martín',
                number: '789',
                city: 'San Isidro',
                province: 'Buenos Aires',
                zipCode: 'B1642',
            },
        ],
    },
    {
        id: 'cust-4',
        name: 'Pedro Martínez',
        email: 'pedro.martinez@email.com',
        phone: '11-5555-3456',
        addresses: [
            {
                id: 'addr-5',
                label: 'Casa',
                street: 'Av. Santa Fe',
                number: '2345',
                city: 'Buenos Aires',
                province: 'CABA',
                zipCode: 'C1425',
            },
            {
                id: 'addr-6',
                label: 'Depósito',
                street: 'Calle Lavalle',
                number: '890',
                city: 'Buenos Aires',
                province: 'CABA',
                zipCode: 'C1047',
            },
        ],
    },
    {
        id: 'cust-5',
        name: 'Luciana Fernández',
        email: 'luciana.fernandez@email.com',
        phone: '11-5555-7890',
        addresses: [],
    },
];
