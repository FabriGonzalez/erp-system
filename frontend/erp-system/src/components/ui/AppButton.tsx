import {
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';

type AppButtonProps = {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    /** Secundario: blanco con borde (Cancelar al lado de Guardar). */
    variant?: 'primary' | 'secondary';
    style?: StyleProp<ViewStyle>;
};

export function AppButton({
    title,
    onPress,
    disabled = false,
    variant = 'primary',
    style,
}: AppButtonProps) {
    const secondary = variant === 'secondary';
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            style={({ pressed }) => [
                styles.button,
                secondary && styles.secondary,
                pressed && (secondary ? styles.secondaryPressed : styles.pressed),
                disabled && styles.disabled,
                style,
            ]}
        >
            <Text style={[styles.text, secondary && styles.secondaryText]}>
                {title}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: Colors.primary,

        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,

        borderRadius: Radius.md,

        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },

    pressed: {
        backgroundColor: Colors.primaryDark,
    },

    secondary: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    secondaryPressed: {
        backgroundColor: Colors.muted,
    },

    text: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },

    secondaryText: {
        color: Colors.text,
    },

    disabled: {
        opacity: 0.55,
    },
});
