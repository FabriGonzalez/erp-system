import { Children, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

/** Tarjeta que agrupa filas (opciones de menú, últimas ventas) con una línea entre cada una. */
export function ListGroup({ children }: { children: ReactNode }) {
    // Los ítems condicionales ({canX && <MenuListItem />}) dejan false: no cuentan.
    const items = Children.toArray(children);
    return (
        <View style={[SharedStyles.card, styles.group]}>
            {items.map((item, index) => (
                <View key={index} style={index > 0 && styles.divider}>{item}</View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    group: {
        padding: 0,
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    divider: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
});
