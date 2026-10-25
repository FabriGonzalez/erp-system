export type ReportPeriod = 'today' | '7d' | '30d';

export const REPORT_PERIODS: { value: ReportPeriod; label: string; comparison: string }[] = [
    { value: 'today', label: 'Hoy', comparison: 'ayer' },
    { value: '7d', label: '7 días', comparison: 'los 7 días anteriores' },
    { value: '30d', label: '30 días', comparison: 'los 30 días anteriores' },
];

const DAYS: Record<ReportPeriod, number> = { today: 1, '7d': 7, '30d': 30 };

/** Hasta este número un stock cuenta como bajo. */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * Desde las 00:00 locales (de hoy, o de hace 6/29 días) hasta ahora. La comparación es el
 * mismo tramo corrido 1, 7 o 30 días: hoy hasta las 15 h contra ayer hasta las 15 h.
 */
export function periodRange(period: ReportPeriod, now: Date = new Date()) {
    const days = DAYS[period];
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    const previousFrom = new Date(from);
    previousFrom.setDate(previousFrom.getDate() - days);
    return { from, to: now, previousFrom };
}

/** Variación porcentual; null si el período anterior fue 0 (no hay contra qué comparar). */
export function percentChange(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
}
