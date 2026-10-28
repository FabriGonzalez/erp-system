import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

type SectionHeaderProps = {
    title: string;
    /** Link a la derecha ("Ver todas"). */
    actionLabel?: string;
    onAction?: () => void;
};

/** Título de una sección: chico, gris y en mayúsculas, con un link opcional. */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            {actionLabel && onAction ? (
                <Pressable
                    onPress={onAction}
                    accessibilityRole="link"
                    hitSlop={8}
                    style={({ pressed }) => pressed && SharedStyles.pressed}
                >
                    <Text style={styles.action}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    action: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
});
