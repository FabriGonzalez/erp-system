import { SalesBucket, SalesPoint } from '@/types/report';

export type ReportPeriod = 'today' | '7d' | '30d';

export const REPORT_PERIODS: {
    value: ReportPeriod;
    label: string;
    comparison: string;
    bucket: SalesBucket;
}[] = [
    { value: 'today', label: 'Hoy', comparison: 'ayer', bucket: 'HOUR' },
    { value: '7d', label: '7 días', comparison: 'los 7 días anteriores', bucket: 'DAY' },
    { value: '30d', label: '30 días', comparison: 'los 30 días anteriores', bucket: 'DAY' },
];

const DAYS: Record<ReportPeriod, number> = { today: 1, '7d': 7, '30d': 30 };

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

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

export function periodBucket(period: ReportPeriod): SalesBucket {
    return REPORT_PERIODS.find((item) => item.value === period)?.bucket ?? 'DAY';
}

/** Variación porcentual; null si el período anterior fue 0 (no hay contra qué comparar). */
export function percentChange(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
}

function pointLabel(from: string, period: ReportPeriod): string {
    const date = new Date(from);
    if (period === 'today') return `${date.getHours()} h`;
    if (period === '7d') return WEEKDAYS[date.getDay()];
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

/**
 * Barras y etiquetas del eje (primera, del medio y última). Hoy se saltean las horas de la
 * madrugada sin ventas: si no, la mitad del gráfico queda vacía antes de abrir.
 */
export function salesChartData(series: SalesPoint[], period: ReportPeriod) {
    const firstSale = period === 'today' ? series.findIndex((point) => point.orderCount > 0) : 0;
    const points = firstSale > 0 ? series.slice(firstSale) : series;
    const edges = points.length < 3
        ? points
        : [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]];
    return {
        values: points.map((point) => point.total),
        labels: edges.map((point) => pointLabel(point.from, period)),
    };
}
