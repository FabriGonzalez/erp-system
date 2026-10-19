import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { BRANCH_ACCESS_ERRORS, parseResponse } from '@/services/api-error';
import { Dashboard, DashboardResponse } from '@/types/report';

const REPORT_ERRORS = {
    byCode: {
        ...BRANCH_ACCESS_ERRORS,
        INVALID_REPORT_RANGE: 'El período elegido no es válido.',
    },
    byStatus: {
        403: 'No tenés permisos para ver esta sucursal o los reportes.',
        404: 'No se encontró la sucursal.',
    },
};

function summary(data: DashboardResponse['sales']) {
    return {
        orderCount: Number(data.orderCount),
        total: Number(data.total),
        averageTicket: Number(data.averageTicket),
    };
}

function normalizeDashboard(data: DashboardResponse): Dashboard {
    return {
        from: data.from,
        to: data.to,
        previousFrom: data.previousFrom,
        previousTo: data.previousTo,
        branchId: data.branchId == null ? null : String(data.branchId),
        sales: summary(data.sales),
        previousSales: summary(data.previousSales),
        salesByBranch: data.salesByBranch.map((branch) => ({
            branchId: String(branch.branchId),
            branchName: branch.branchName,
            orderCount: Number(branch.orderCount),
            total: Number(branch.total),
        })),
        collections: {
            byMethod: data.collections.byMethod.map((item) => ({
                method: item.method,
                total: Number(item.total),
            })),
            walkInSalesTotal: Number(data.collections.walkInSalesTotal ?? 0),
        },
        debt: {
            totalDebt: Number(data.debt.totalDebt),
            debtorCount: Number(data.debt.debtorCount),
        },
        topProducts: data.topProducts.map((product) => ({
            productVariantId: String(product.productVariantId),
            productName: product.productName,
            sku: product.sku,
            quantity: Number(product.quantity),
            total: Number(product.total),
        })),
        pendingOrders: {
            count: Number(data.pendingOrders.count),
            oldestCreatedAt: data.pendingOrders.oldestCreatedAt,
        },
        lowStock: {
            threshold: Number(data.lowStock.threshold),
            count: Number(data.lowStock.count),
            items: data.lowStock.items.map((item) => ({
                stockId: String(item.stockId),
                productVariantId: String(item.productVariantId),
                productName: item.productName,
                sku: item.sku,
                branchId: String(item.branchId),
                branchName: item.branchName,
                quantity: Number(item.quantity),
            })),
        },
    };
}

/**
 * Dashboard de [from, to) comparado con [previousFrom, previousFrom + duración).
 * Sin branchId suma todas las sucursales asignadas al usuario.
 */
export async function getDashboard(
    params: {
        from: Date;
        to: Date;
        previousFrom: Date;
        branchId: string | null;
        lowStockThreshold: number;
    },
    token: string
): Promise<Dashboard> {
    const query = new URLSearchParams({
        from: params.from.toISOString(),
        to: params.to.toISOString(),
        previousFrom: params.previousFrom.toISOString(),
        lowStockThreshold: String(params.lowStockThreshold),
    });
    if (params.branchId) query.set('branchId', params.branchId);

    const response = await apiFetch(`${API_BASE_URL}/api/v1/reports/dashboard?${query.toString()}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    const data = await parseResponse<DashboardResponse>(response, {
        ...REPORT_ERRORS,
        fallback: 'No se pudieron cargar los reportes.',
    });
    return normalizeDashboard(data);
}
