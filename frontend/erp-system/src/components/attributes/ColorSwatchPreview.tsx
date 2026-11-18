import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';

type ColorSwatchPreviewProps = {
    colors: string[];
    size?: number;
};

/**
 * Cuadrado con los colores de la muestra en franjas verticales iguales. Es solo la vista del
 * ERP: la tienda decide su propio dibujo con los mismos datos.
 */
export function ColorSwatchPreview({ colors, size = 20 }: ColorSwatchPreviewProps) {
    return (
        <View
            style={[styles.box, { width: size, height: size, borderRadius: size / 4 }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            {colors.map((color, index) => (
                <View key={index} style={[styles.stripe, { backgroundColor: color }]} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        flexDirection: 'row',
        overflow: 'hidden',
        // El borde hace visible el blanco sobre fondo blanco.
        borderWidth: 1,
        borderColor: Colors.border,
    },
    stripe: {
        flex: 1,
    },
});
