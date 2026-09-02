export type DashboardStat = {
    label: string;
    value: string;
    icon: string;
};

export type RecentOrder = {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    date: string;
};

export const mockDashboardStats: DashboardStat[] = [
    {
        label: 'Pedidos hoy',
        value: '12',
        icon: '📦',
    },
    {
        label: 'Pendientes',
        value: '5',
        icon: '⏳',
    },
    {
        label: 'Stock bajo',
        value: '3',
        icon: '⚠️',
    },
    {
        label: 'Ventas hoy',
        value: '$45.200',
        icon: '💰',
    },
];

export const mockRecentOrders: RecentOrder[] = [
    {
        id: '1',
        orderNumber: 'PED-001',
        customerName: 'María García',
        total: 15200,
        status: 'CONFIRMED',
        date: '2026-08-31',
    },
    {
        id: '2',
        orderNumber: 'PED-002',
        customerName: 'Carlos López',
        total: 8500,
        status: 'IN_PREPARATION',
        date: '2026-08-31',
    },
    {
        id: '3',
        orderNumber: 'PED-003',
        customerName: 'Ana Rodríguez',
        total: 22300,
        status: 'DRAFT',
        date: '2026-08-30',
    },
];
