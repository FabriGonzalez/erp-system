import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

type CartSummaryBarProps = {
    itemsCount: number;
    onPress: () => void;
    /** Total en pesos; se muestra si no hay detail. */
    totalAmount?: number;
    /** Texto en lugar del total, p. ej. qué se eligió cuando no hay precios. */
    detail?: string;
    actionLabel?: string;
};

export function CartSummaryBar({
    itemsCount,
    onPress,
    totalAmount = 0,
    detail,
    actionLabel = 'Ver resumen',
}: CartSummaryBarProps) {
    if (itemsCount <= 0) return null;

    return (
        <View style={styles.stickyCartBar}>
            <View style={styles.summary}>
                <Text style={styles.stickyCartCount}>
                    {itemsCount} {itemsCount === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}
                </Text>
                {detail ? (
                    <Text style={styles.detail} numberOfLines={2}>{detail}</Text>
                ) : (
                    <Text style={styles.stickyCartTotal}>
                        Total: ${totalAmount.toLocaleString('es-AR')}
                    </Text>
                )}
            </View>

            <Pressable
                style={({ pressed }) => [styles.confirmCartBtn, pressed && SharedStyles.pressed]}
                onPress={onPress}
            >
                <Text style={SharedStyles.buttonPrimaryText}>{actionLabel}</Text>
                <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={16}
                    tintColor={Colors.white}
                />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    stickyCartBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
    },
    summary: {
        flex: 1,
        marginRight: Spacing.md,
    },
    detail: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    stickyCartCount: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    stickyCartTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    confirmCartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm + 2,
        borderRadius: 8,
        gap: 4,
    },
});
