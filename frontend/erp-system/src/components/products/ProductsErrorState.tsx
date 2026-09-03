import { SymbolView } from 'expo-symbols';
import { Pressable, View, Text, StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

interface ProductsErrorStateProps {
    errorMessage?: string | null;
    onRetry: () => void;
}

export function ProductsErrorState({ errorMessage, onRetry }: ProductsErrorStateProps) {
    return (
        <View style={styles.container}>
            <SymbolView
                name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                size={48}
                tintColor={Colors.error}
            />

            <Text style={styles.title}>Ocurrió un error</Text>

            <Text style={styles.description}>
                {errorMessage ?? 'No se pudieron cargar los productos. Intenta nuevamente.'}
            </Text>

            <Pressable
                style={({ pressed }) => [
                    styles.retryButton,
                    pressed && SharedStyles.pressed,
                ]}
                onPress={onRetry}
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
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
