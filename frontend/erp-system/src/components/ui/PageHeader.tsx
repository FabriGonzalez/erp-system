import { SymbolView } from 'expo-symbols';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

type PageHeaderProps = {
    title: string;
    /** Dato chico arriba del título: la fecha, una cantidad, la sucursal. */
    eyebrow?: string;
    /** A la derecha: la sucursal activa, un botón "Nuevo"... */
    right?: ReactNode;
    /** Flecha para volver, en las pantallas que se abren desde otra (Más → Clientes). */
    onBack?: () => void;
};

/** Encabezado de las pantallas principales: título grande, sin barra. */
export function PageHeader({ title, eyebrow, right, onBack }: PageHeaderProps) {
    return (
        <View style={styles.container}>
            {onBack ? (
                <Pressable
                    onPress={onBack}
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                    hitSlop={8}
                    style={({ pressed }) => [styles.back, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
            ) : null}
            <View style={styles.texts}>
                {eyebrow ? <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text> : null}
                <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
            </View>
            {right}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg + Spacing.xs,
        paddingBottom: Spacing.sm,
    },
    back: {
        // Alineada con el título, no con el dato chico de arriba.
        paddingVertical: 4,
        marginLeft: -Spacing.xs,
        marginRight: -Spacing.xs,
    },
    texts: {
        flex: 1,
        gap: 2,
    },
    eyebrow: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
        color: Colors.text,
    },
});
