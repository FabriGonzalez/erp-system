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

/** Horario de venta habitual: el gráfico de hoy va de 7 a 21 h aunque todavía no haya ventas. */
const OPENING_HOUR = 7;
const CLOSING_HOUR = 21;

/** Etiqueta corta, para el eje. */
function axisLabel(from: string, period: ReportPeriod): string {
    const date = new Date(from);
    if (period === '7d') return WEEKDAYS[date.getDay()];
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** Etiqueta del detalle de una barra: "lun 27/10". */
function barLabel(from: string): string {
    const date = new Date(from);
    return `${WEEKDAYS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

/** upcoming: una hora de hoy que todavía no llegó. */
export type SalesChartBar = { label: string; axisLabel: string; total: number; orderCount: number; upcoming: boolean };

/**
 * Barras, etiquetas del eje (primera, del medio y última) y la barra de ahora, que se señala si
 * no se elige otra (null: hoy antes de abrir y sin ventas).
 */
export function salesChartData(points: SalesPoint[], period: ReportPeriod) {
    const { bars, currentIndex } = period === 'today'
        ? hourlyBars(points)
        : {
            bars: points.map((point): SalesChartBar => ({
                label: barLabel(point.from),
                axisLabel: axisLabel(point.from, period),
                total: point.total,
                orderCount: point.orderCount,
                upcoming: false,
            })),
            currentIndex: points.length > 0 ? points.length - 1 : null,
        };
    const edges = bars.length < 3
        ? bars
        : [bars[0], bars[Math.floor((bars.length - 1) / 2)], bars[bars.length - 1]];
    return { bars, axisLabels: edges.map((bar) => bar.axisLabel), currentIndex };
}

/**
 * Hoy, de 7 a 21 h: las horas que faltan van vacías, así el gráfico ya muestra el día entero. Si
 * hay ventas antes o después (abrió temprano o se anotó tarde), la franja se estira hasta ellas.
 */
function hourlyBars(points: SalesPoint[]): { bars: SalesChartBar[]; currentIndex: number | null } {
    // El backend manda de las 0 h hasta la hora de ahora, todas aunque estén vacías.
    const byHour = new Map(points.map((point) => [new Date(point.from).getHours(), point]));
    const saleHours = points
        .filter((point) => point.orderCount > 0)
        .map((point) => new Date(point.from).getHours());
    const firstHour = Math.min(OPENING_HOUR, ...saleHours);
    const lastHour = Math.max(CLOSING_HOUR - 1, ...saleHours);
    const currentHour = points.length > 0 ? new Date(points[points.length - 1].from).getHours() : null;

    const bars: SalesChartBar[] = [];
    for (let hour = firstHour; hour <= lastHour; hour++) {
        const point = byHour.get(hour);
        bars.push({
            label: `${hour} a ${hour + 1} h`,
            axisLabel: `${hour} h`,
            total: point?.total ?? 0,
            orderCount: point?.orderCount ?? 0,
            upcoming: !point,
        });
    }

    let currentIndex: number | null = null;
    if (currentHour !== null && currentHour >= firstHour) {
        // Después del cierre y sin ventas tardías, la de ahora es la última.
        currentIndex = Math.min(currentHour, lastHour) - firstHour;
    }
    return { bars, currentIndex };
}
