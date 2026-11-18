import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

type FilterChipProps = {
    label: string;
    selected: boolean;
    onPress: () => void;
    /** Algo antes del texto, como la muestra de color de un valor. */
    leading?: ReactNode;
};

export function FilterChip({
    label,
    selected,
    onPress,
    leading,
}: FilterChipProps) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.chip,
                leading ? styles.chipWithLeading : null,
                selected && styles.chipActive,
                pressed && SharedStyles.pressed,
            ]}
            onPress={onPress}
        >
            {leading}
            <Text
                style={[
                    styles.chipText,
                    selected && styles.chipTextActive,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    chipWithLeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },

    chipActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primary,
    },

    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },

    chipTextActive: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
