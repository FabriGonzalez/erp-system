import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';

type SalesChartProps = {
    /** Importe de cada tramo, en orden. */
    values: number[];
    /** Etiquetas del eje, repartidas de punta a punta. */
    labels: string[];
    accessibilityLabel: string;
};

const CHART_HEIGHT = 112;

/** Barras de ventas por hora o por día; la última (la de ahora) va resaltada. */
export function SalesChart({ values, labels, accessibilityLabel }: SalesChartProps) {
    const max = Math.max(...values, 0);
    // Con muchas barras (30 días) el espacio entre ellas se achica para que no queden hilos.
    const gap = values.length > 20 ? 2 : 4;

    return (
        <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
            <View style={[styles.bars, { gap }]}>
                {values.map((value, index) => (
                    <View
                        key={index}
                        style={[
                            styles.bar,
                            {
                                height: max > 0 ? `${(value / max) * 100}%` : 0,
                                backgroundColor: index === values.length - 1 ? Colors.primary : Colors.track,
                            },
                        ]}
                    />
                ))}
            </View>
            <View style={styles.axis}>
                {labels.map((label, index) => (
                    <Text key={index} style={styles.axisLabel}>{label}</Text>
                ))}
            </View>
            {max === 0 ? <Text style={styles.empty}>Sin ventas en el período.</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    bars: {
        height: CHART_HEIGHT,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    bar: {
        flex: 1,
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
    empty: {
        position: 'absolute',
        top: CHART_HEIGHT / 2 - 10,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
