import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type SectionHeaderProps = {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {actionLabel && onAction && (
                <Pressable onPress={onAction} style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.pressed
                ]}>
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: Spacing.md,
        paddingHorizontal: Spacing.xs,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    actionButton: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    pressed: {
        opacity: 0.7,
    },
});
