import { useQuery } from '@tanstack/react-query';

import { getDashboard } from '@/services/report-service';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/utils/permissions';
import { LOW_STOCK_THRESHOLD, periodRange, ReportPeriod } from '@/utils/report-periods';

import { errorText, requireToken } from './use-paged-list';

export const reportKeys = {
    all: ['reports'] as const,
    dashboard: (period: ReportPeriod, branchId: string | null) =>
        [...reportKeys.all, 'dashboard', period, branchId ?? 'all'] as const,
};

/**
 * La clave lleva el período, no las fechas: from/to se calculan en cada fetch, así un
 * refetch toma la hora actual. Ventas, pagos y stock se cambian en otros módulos: no se
 * invalida desde ellos, se refresca por staleTime y con pull to refresh.
 */
export function useDashboard(period: ReportPeriod, branchId: string | null) {
    const hasSession = useAuthStore((state) => Boolean(state.token));
    const canRead = useAuthStore((state) => hasPermission(state.user, 'VER_REPORTES'));
    const enabled = hasSession && canRead;

    const result = useQuery({
        queryKey: reportKeys.dashboard(period, branchId),
        queryFn: () =>
            getDashboard(
                { ...periodRange(period), branchId, lowStockThreshold: LOW_STOCK_THRESHOLD },
                requireToken()
            ),
        enabled,
    });

    return {
        dashboard: result.data ?? null,
        isLoading: result.isPending && enabled,
        isRefreshing: result.isRefetching,
        error: errorText(result.error),
        refresh: () => void result.refetch(),
    };
}
