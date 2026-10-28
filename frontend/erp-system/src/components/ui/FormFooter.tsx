import { Children, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

/** Barra fija debajo de un formulario con su botón de guardar (y, si hace falta, otro al lado, mismo ancho). */
export function FormFooter({ children }: { children: ReactNode }) {
    // Los botones condicionales ({canX && <AppButton />}) dejan false: no cuentan.
    const buttons = Children.toArray(children);
    return (
        <View style={styles.footer}>
            {buttons.map((button, index) => (
                <View key={index} style={styles.slot}>{button}</View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    footer: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    slot: {
        flex: 1,
    },
});
