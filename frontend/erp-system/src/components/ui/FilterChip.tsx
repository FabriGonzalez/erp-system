import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

type FilterChipProps = {
    label: string;
    selected: boolean;
    onPress: () => void;
};

export function FilterChip({
    label,
    selected,
    onPress,
}: FilterChipProps) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.chip,
                selected && styles.chipActive,
                pressed && SharedStyles.pressed,
            ]}
            onPress={onPress}
        >
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
