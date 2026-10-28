import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

type FormFieldProps = {
    label: string;
    /** Aclaración debajo del campo. */
    hint?: string;
    /** Error de este campo: reemplaza a la aclaración. */
    error?: string | null;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
};

/** Un campo de formulario: etiqueta, el input (o lo que sea) y una aclaración o error. */
export function FormField({ label, hint, error, style, children }: FormFieldProps) {
    return (
        <View style={[styles.field, style]}>
            <Text style={SharedStyles.fieldLabel}>{label}</Text>
            {children}
            {error
                ? <Text style={styles.error}>{error}</Text>
                : hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    field: {
        gap: Spacing.xs + 2,
    },
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    error: {
        fontSize: 12,
        color: Colors.error,
    },
});
