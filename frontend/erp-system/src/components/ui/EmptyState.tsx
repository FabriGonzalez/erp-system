import { StyleSheet, Text, View } from 'react-native';
import { SymbolView, SFSymbol, AndroidSymbol } from 'expo-symbols';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { AppButton } from './AppButton';

type EmptyStateProps = {
    title: string;
    description?: string;
    iconName?: { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol };
    emoji?: string;
    actionLabel?: string;
    onAction?: () => void;
};


export function EmptyState({
    title,
    description,
    iconName,
    emoji,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            {iconName ? (
                <SymbolView
                    name={iconName}
                    size={48}
                    tintColor={Colors.textSecondary}
                    style={styles.icon}
                />
            ) : emoji ? (
                <Text style={styles.emoji}>{emoji}</Text>
            ) : (
                <SymbolView
                    name={{ ios: 'tray.fill', android: 'inbox', web: 'inbox' }}
                    size={48}
                    tintColor={Colors.textSecondary}
                    style={styles.icon}
                />
            )}
            <Text style={styles.title}>{title}</Text>
            {description && <Text style={styles.description}>{description}</Text>}
            {actionLabel && onAction && (
                <View style={styles.actionContainer}>
                    <AppButton title={actionLabel} onPress={onAction} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        marginVertical: Spacing.xl,
    },
    icon: {
        marginBottom: Spacing.md,
        opacity: 0.8,
    },
    emoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    description: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    actionContainer: {
        marginTop: Spacing.sm,
        minWidth: 150,
    },
});
