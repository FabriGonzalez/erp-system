import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { formatCurrency } from '@/utils/format';
import { SalesChartBar } from '@/utils/report-periods';

type SalesChartProps = {
    bars: SalesChartBar[];
    /** Etiquetas del eje, repartidas de punta a punta. */
    axisLabels: string[];
    /** La barra de ahora, señalada mientras no se elija otra; null si no hay ninguna. */
    currentIndex: number | null;
    accessibilityLabel: string;
};

const CHART_HEIGHT = 112;

function describe(bar: SalesChartBar): string {
    if (bar.upcoming) return `${bar.label} · todavía no llegó`;
    const orders = bar.orderCount === 1 ? '1 pedido' : `${bar.orderCount} pedidos`;
    return `${bar.label} · ${formatCurrency(bar.total)} · ${orders}`;
}

/**
 * Barras de ventas por hora o por día. El detalle de una barra se ve arriba al pasar el mouse
 * (web) o al tocarla (celular, donde no hay hover); sin elegir, el de la de ahora.
 */
export function SalesChart({ bars, axisLabels, currentIndex, accessibilityLabel }: SalesChartProps) {
    const [selected, setSelected] = useState<number | null>(null);
    const max = Math.max(...bars.map((bar) => bar.total), 0);
    const highlighted = selected ?? currentIndex;
    // Con muchas barras (30 días) el espacio entre ellas se achica para que no queden hilos.
    const gap = bars.length > 20 ? 2 : 4;

    return (
        <View accessibilityLabel={accessibilityLabel}>
            <Text style={[styles.detail, selected === null && styles.detailIdle]} numberOfLines={1}>
                {/* La barra señalada siempre dice su hora o día, aunque no haya tenido ventas. */}
                {highlighted === null || (selected === null && max === 0)
                    ? 'Sin ventas en el período.'
                    : describe(bars[highlighted])}
            </Text>
            <View style={[styles.bars, { gap }]}>
                {bars.map((bar, index) => (
                    <Pressable
                        key={index}
                        onPress={() => setSelected((current) => (current === index ? null : index))}
                        onHoverIn={() => setSelected(index)}
                        onHoverOut={() => setSelected(null)}
                        accessibilityRole="button"
                        accessibilityLabel={describe(bar)}
                        style={styles.slot}
                    >
                        <View
                            style={[
                                styles.bar,
                                {
                                    height: max > 0 ? `${(bar.total / max) * 100}%` : 0,
                                    backgroundColor: index === highlighted
                                        ? Colors.primary
                                        : bar.upcoming ? Colors.border : Colors.track,
                                },
                            ]}
                        />
                    </Pressable>
                ))}
            </View>
            <View style={styles.axis}>
                {axisLabels.map((label, index) => (
                    <Text key={index} style={styles.axisLabel}>{label}</Text>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    detail: {
        marginBottom: Spacing.sm,
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
    },
    detailIdle: {
        fontWeight: '400',
        color: Colors.textSecondary,
    },
    bars: {
        height: CHART_HEIGHT,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    // Toda la columna es tocable, no solo la barra: una barra baja sería difícil de acertar.
    slot: {
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    bar: {
        // Un tramo sin ventas igual se ve, como una raya sobre el eje.
        minHeight: 2,
        borderTopLeftRadius: Radius.sm / 2,
        borderTopRightRadius: Radius.sm / 2,
    },
    axis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.xs,
    },
    axisLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
});
