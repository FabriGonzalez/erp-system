import { SymbolView } from 'expo-symbols';
import { Pressable, View, Text, StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

interface OrdersErrorStateProps {
    errorMessage?: string | null;
    title?: string;
    onRetry: () => void;
}

export function OrdersErrorState({ errorMessage, title, onRetry }: OrdersErrorStateProps) {
    return (
        <View style={SharedStyles.errorContainer}>
            <View style={styles.errorIcon}>
                <SymbolView
                    name={{
                        ios: 'exclamationmark.triangle.fill',
                        android: 'warning',
                        web: 'warning',
                    }}
                    size={20}
                    tintColor={Colors.error}
                />
            </View>

            <View style={styles.errorContent}>
                <Text style={SharedStyles.errorTitle}>
                    {title ?? 'No pudimos cargar los pedidos'}
                </Text>

                {errorMessage && (
                    <Text style={SharedStyles.errorMessage}>
                        {errorMessage}
                    </Text>
                )}
            </View>

            <Pressable
                onPress={onRetry}
                style={({ pressed }) => [
                    SharedStyles.retryButton,
                    pressed && SharedStyles.pressed,
                ]}
            >
                <Text style={SharedStyles.retryText}>Reintentar</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    errorIcon: {
        marginRight: Spacing.sm,
    },

    errorContent: {
        flex: 1,
    },
});
