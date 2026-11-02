import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { formatCurrency } from '@/utils/format';

export type CollectionSegment = {
    key: string;
    label: string;
    total: number;
};

type CollectionsBarProps = {
    segments: CollectionSegment[];
};

// Se distinguen también por claridad, no solo por color. El último, gris, es "Sin medio".
const SEGMENT_COLORS = [Colors.primaryDark, Colors.teal, Colors.violet, Colors.warning, Colors.track];

/** Lo cobrado por medio de pago: una barra partida y la leyenda con porcentaje e importe. */
export function CollectionsBar({ segments }: CollectionsBarProps) {
    const total = segments.reduce((sum, segment) => sum + segment.total, 0);
    const visible = segments
        .map((segment, index) => ({ ...segment, color: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }))
        .filter((segment) => segment.total > 0);

    if (total === 0) {
        return (
            <View style={[SharedStyles.card, styles.card]}>
                <Text style={styles.empty}>Sin cobranzas en el período.</Text>
            </View>
        );
    }

    return (
        <View style={[SharedStyles.card, styles.card]}>
            <View style={styles.bar} accessible accessibilityRole="image" accessibilityLabel="Cobranzas por medio de pago">
                {visible.map((segment) => (
                    <View key={segment.key} style={{ flex: segment.total, backgroundColor: segment.color }} />
                ))}
            </View>
            <View style={styles.legend}>
                {visible.map((segment) => (
                    <View key={segment.key} style={styles.legendItem}>
                        <View style={[styles.swatch, { backgroundColor: segment.color }]} />
                        <View style={styles.legendTexts}>
                            <Text style={styles.legendLabel} numberOfLines={1}>
                                {segment.label} · {Math.round((segment.total / total) * 100)}%
                            </Text>
                            <Text style={styles.legendValue}>{formatCurrency(segment.total)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: Spacing.md,
    },
    bar: {
        height: 14,
        flexDirection: 'row',
        gap: 2,
        borderRadius: Radius.pill,
        overflow: 'hidden',
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: Spacing.md,
    },
    legendItem: {
        width: '50%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingRight: Spacing.sm,
    },
    swatch: {
        width: 10,
        height: 10,
        borderRadius: 3,
    },
    legendTexts: {
        flex: 1,
    },
    legendLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    legendValue: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    empty: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
});
