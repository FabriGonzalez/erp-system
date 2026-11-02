import { SalesBucket, SalesPoint } from '@/types/report';

export type ReportPeriod = 'today' | '7d' | '30d';

export const REPORT_PERIODS: { value: ReportPeriod; label: string; bucket: SalesBucket }[] = [
    { value: 'today', label: 'Hoy', bucket: 'HOUR' },
    { value: '7d', label: '7 días', bucket: 'DAY' },
    { value: '30d', label: '30 días', bucket: 'DAY' },
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

/** Etiqueta corta, para el eje. */
function axisLabel(from: string, period: ReportPeriod): string {
    const date = new Date(from);
    if (period === 'today') return `${date.getHours()} h`;
    if (period === '7d') return WEEKDAYS[date.getDay()];
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** Etiqueta del detalle de una barra: "15 a 16 h", "lun 27/10". */
function barLabel(from: string, period: ReportPeriod): string {
    const date = new Date(from);
    if (period === 'today') return `${date.getHours()} a ${date.getHours() + 1} h`;
    return `${WEEKDAYS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

export type SalesChartBar = { label: string; total: number; orderCount: number };

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
        bars: points.map((point): SalesChartBar => ({
            label: barLabel(point.from, period),
            total: point.total,
            orderCount: point.orderCount,
        })),
        axisLabels: edges.map((point) => axisLabel(point.from, period)),
    };
}
