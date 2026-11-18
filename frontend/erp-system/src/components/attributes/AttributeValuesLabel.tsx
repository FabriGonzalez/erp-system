import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';

import { ColorSwatchPreview } from '@/components/attributes/ColorSwatchPreview';
import { Spacing } from '@/constants/spacing';
import { ColorSwatch } from '@/types/product-attribute';

type LabelValue = {
    name?: string | null;
    swatch?: ColorSwatch | null;
};

type AttributeValuesLabelProps = {
    values: LabelValue[];
    /** Entre valor y valor (" / ", " · "). */
    separator: string;
    /** Sin valores con nombre (variante única o manual). */
    fallback: string;
    textStyle?: StyleProp<TextStyle>;
    swatchSize?: number;
};

/**
 * Los valores de una variante como texto, con la muestra de color antes del nombre de los que
 * la tienen ("■ Negro / M"). En el ERP el nombre va siempre: dos colores parecidos se confunden.
 */
export function AttributeValuesLabel({
    values,
    separator,
    fallback,
    textStyle,
    swatchSize = 14,
}: AttributeValuesLabelProps) {
    const named = values.filter((value): value is LabelValue & { name: string } => Boolean(value.name));
    if (named.length === 0) {
        return <Text style={textStyle}>{fallback}</Text>;
    }

    return (
        <View style={styles.row} accessible accessibilityLabel={named.map((value) => value.name).join(separator)}>
            {named.map((value, index) => (
                <View key={index} style={styles.value}>
                    {index > 0 ? <Text style={textStyle}>{separator.trim()}</Text> : null}
                    {value.swatch ? <ColorSwatchPreview colors={value.swatch.colors} size={swatchSize} /> : null}
                    <Text style={textStyle}>{value.name}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: Spacing.xs,
    },
    value: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
});
