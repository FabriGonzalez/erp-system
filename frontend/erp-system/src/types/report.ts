import { PaymentMethod } from '@/types/order';

// --- API: GET /api/v1/reports/dashboard (montos BigDecimal → number) ---

/** Largo de los tramos de la serie de ventas, contados desde from. */
export type SalesBucket = 'HOUR' | 'DAY';

type SalesSummaryResponse = {
    orderCount: number;
    total: number;
    averageTicket: number;
};

export type DashboardResponse = {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    branchId: number | null;
    sales: SalesSummaryResponse;
    previousSales: SalesSummaryResponse;
    salesByBranch: { branchId: number; branchName: string; orderCount: number; total: number }[];
    // Opcional: un backend anterior a la serie no la manda.
    salesSeries?: { from: string; orderCount: number; total: number }[];
    collections: {
        byMethod: { method: PaymentMethod; total: number }[];
        withoutMethodTotal: number | null;
    };
    debt: { totalDebt: number; debtorCount: number };
    topProducts: {
        productVariantId: number;
        productName: string;
        sku: string;
        quantity: number;
        total: number;
    }[];
    pendingOrders: { count: number; oldestCreatedAt: string | null };
    lowStock: {
        threshold: number;
        count: number;
        items: {
            stockId: number;
            productVariantId: number;
            productName: string;
            sku: string;
            branchId: number;
            branchName: string;
            quantity: number;
        }[];
    };
};

// --- Dominio (ids string) ---

export type SalesSummary = SalesSummaryResponse;

export type BranchSales = {
    branchId: string;
    branchName: string;
    orderCount: number;
    total: number;
};

/** Un tramo de la serie: desde from, una hora o un día. */
export type SalesPoint = {
    from: string;
    orderCount: number;
    total: number;
};

export type TopProduct = {
    productVariantId: string;
    productName: string;
    sku: string;
    quantity: number;
    total: number;
};

export type LowStockItem = {
    stockId: string;
    productVariantId: string;
    productName: string;
    sku: string;
    branchId: string;
    branchName: string;
    quantity: number;
};

export type Dashboard = {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    branchId: string | null;
    sales: SalesSummary;
    previousSales: SalesSummary;
    salesByBranch: BranchSales[];
    // Vacía si el backend no la mandó.
    salesSeries: SalesPoint[];
    collections: {
        // Pagos de clientes y ventas sin cliente, por medio.
        byMethod: { method: PaymentMethod; total: number }[];
        // Ventas sin cliente de antes de guardar su medio.
        withoutMethodTotal: number;
    };
    debt: { totalDebt: number; debtorCount: number };
    topProducts: TopProduct[];
    pendingOrders: { count: number; oldestCreatedAt: string | null };
    lowStock: { threshold: number; count: number; items: LowStockItem[] };
};
