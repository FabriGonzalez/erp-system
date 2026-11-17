import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

export type BarListItem = {
    key: string;
    label: string;
    detail?: string;
    /** Lo que se ve a la derecha (importe, unidades). */
    value: string;
    /** Lo que mide la barra; la más larga es la del mayor. */
    amount: number;
};

/** Ranking con barras horizontales: ventas por sucursal, más vendidos. */
export function BarList({ items }: { items: BarListItem[] }) {
    const max = Math.max(...items.map((item) => item.amount), 0);

    return (
        <View style={[SharedStyles.card, styles.card]}>
            {items.map((item) => (
                <View key={item.key} style={styles.item}>
                    <View style={styles.labels}>
                        <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
                        <Text style={styles.value}>{item.value}</Text>
                    </View>
                    <View style={styles.track}>
                        <View style={[styles.fill, { width: `${max > 0 ? (item.amount / max) * 100 : 0}%` }]} />
                    </View>
                    {item.detail ? <Text style={SharedStyles.listItemMeta} numberOfLines={1}>{item.detail}</Text> : null}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: Spacing.md,
    },
    item: {
        gap: 4,
    },
    labels: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: Spacing.sm,
    },
    label: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    value: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    track: {
        height: 6,
        borderRadius: Radius.pill,
        backgroundColor: Colors.muted,
        overflow: 'hidden',
    },
    fill: {
        height: 6,
        borderRadius: Radius.pill,
        backgroundColor: Colors.primary,
    },
});
