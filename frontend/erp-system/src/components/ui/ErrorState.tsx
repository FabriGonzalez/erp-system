import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

type ErrorStateProps = {
    message?: string | null;
    onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
    return (
        <View style={styles.container}>
            <SymbolView
                name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                size={48}
                tintColor={Colors.error}
            />

            <Text style={styles.title}>Ocurrió un error</Text>

            <Text style={styles.description}>
                {message ?? 'No se pudieron cargar los datos. Intenta nuevamente.'}
            </Text>

            <Pressable
                onPress={onRetry}
                style={({ pressed }) => [
                    styles.retryButton,
                    pressed && SharedStyles.pressed,
                ]}
            >
                <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },

    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginTop: Spacing.md,
    },

    description: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
        marginBottom: Spacing.lg,
    },

    retryButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm + 2,
        borderRadius: 8,
    },

    retryButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
});