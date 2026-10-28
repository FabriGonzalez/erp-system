import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type InfoRowProps = {
    label: string;
    /** Texto, o algo propio (una píldora, un link). */
    value: ReactNode;
};

/** Un dato de un detalle (Cliente, Sucursal, Fecha) dentro de un ListGroup: etiqueta a la izquierda, valor a la derecha. */
export function InfoRow({ label, value }: InfoRowProps) {
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            {typeof value === 'string' || typeof value === 'number'
                ? <Text style={styles.value}>{value}</Text>
                : <View style={styles.custom}>{value}</View>}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
        backgroundColor: Colors.surface,
    },
    label: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    value: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'right',
    },
    custom: {
        flex: 1,
        alignItems: 'flex-end',
    },
});
