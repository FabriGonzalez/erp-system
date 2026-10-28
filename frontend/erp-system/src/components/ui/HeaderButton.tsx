import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import { IconName } from './icon-name';

type HeaderButtonProps = {
    label: string;
    onPress: () => void;
    /** Sin ícono si es null. */
    icon?: IconName | null;
    accessibilityLabel?: string;
    /** Secundario: blanco con borde, para una segunda acción al lado de la principal (Usuarios → Roles). */
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
};

/** La acción principal de un listado, en el encabezado (Productos → "Nuevo"). */
export function HeaderButton({
    label,
    onPress,
    icon = { ios: 'plus', android: 'add', web: 'add' },
    accessibilityLabel,
    variant = 'primary',
    disabled = false,
}: HeaderButtonProps) {
    const secondary = variant === 'secondary';
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            hitSlop={6}
            style={({ pressed }) => [
                styles.button,
                secondary ? styles.secondary : SharedStyles.raised,
                pressed && (secondary ? styles.secondaryPressed : styles.pressed),
                disabled && SharedStyles.pressed,
            ]}
        >
            {icon ? <SymbolView name={icon} size={20} tintColor={secondary ? Colors.text : Colors.white} /> : null}
            <Text style={[styles.text, secondary && styles.secondaryText]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        backgroundColor: Colors.primary,
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
    secondaryText: {
        color: Colors.text,
    },
    text: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.white,
    },
});
