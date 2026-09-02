import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Product } from '@/types/product';

type ProductCardProps = {
    product: Product;
    stock: number;
    canEdit?: boolean;
    onPress?: () => void;
    onToggleActive?: () => void;
};

export function ProductCard({
    product,
    stock,
    canEdit = false,
    onPress,
    onToggleActive,
}: ProductCardProps) {
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;

    function getStockBadgeStyle() {
        if (isOutOfStock) {
            return {
                bg: '#FEE2E2',
                text: '#DC2626',
                label: 'Sin stock',
                dot: '#DC2626',
            };
        }
        if (isLowStock) {
            return {
                bg: '#FEF3C7',
                text: '#D97706',
                label: `Bajo stock (${stock})`,
                dot: '#F59E0B',
            };
        }
        return {
            bg: '#DCFCE7',
            text: '#16A34A',
            label: `Stock: ${stock}`,
            dot: '#16A34A',
        };
    }

    const stockBadge = getStockBadgeStyle();

    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                !product.active && styles.inactiveCard,
                pressed && canEdit && styles.pressed,
            ]}
            onPress={canEdit ? onPress : undefined}
            disabled={!canEdit}
        >
            <View style={styles.headerRow}>
                <View style={styles.skuCategoryContainer}>
                    <Text style={styles.skuText}>{product.sku}</Text>
                    {product.categoryName && (
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{product.categoryName}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.statusRow}>
                    <View
                        style={[
                            styles.statusBadge,
                            product.active ? styles.activeBadge : styles.inactiveBadge,
                        ]}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                {
                                    backgroundColor: product.active
                                        ? Colors.success
                                        : Colors.textSecondary,
                                },
                            ]}
                        />
                        <Text
                            style={[
                                styles.statusText,
                                {
                                    color: product.active
                                        ? Colors.success
                                        : Colors.textSecondary,
                                },
                            ]}
                        >
                            {product.active ? 'Activo' : 'Inactivo'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.body}>
                <Text style={[styles.name, !product.active && styles.inactiveText]} numberOfLines={2}>
                    {product.name}
                </Text>
                {product.description ? (
                    <Text style={styles.description} numberOfLines={1}>
                        {product.description}
                    </Text>
                ) : null}
            </View>

            <View style={styles.footerRow}>
                <View>
                    <Text style={styles.priceLabel}>Precio</Text>
                    <Text style={styles.priceValue}>
                        ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </Text>
                </View>

                <View style={styles.rightFooter}>
                    <View style={[styles.stockBadge, { backgroundColor: stockBadge.bg }]}>
                        <View style={[styles.stockDot, { backgroundColor: stockBadge.dot }]} />
                        <Text style={[styles.stockBadgeText, { color: stockBadge.text }]}>
                            {stockBadge.label}
                        </Text>
                    </View>

                    {canEdit && (
                        <SymbolView
                            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                            size={18}
                            tintColor={Colors.textSecondary}
                            style={styles.chevron}
                        />
                    )}
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    inactiveCard: {
        opacity: 0.75,
        backgroundColor: '#FAFBFD',
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    skuCategoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        flexShrink: 1,
    },
    skuText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
        letterSpacing: 0.5,
    },
    categoryBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },
    activeBadge: {
        backgroundColor: '#F0FDF4',
    },
    inactiveBadge: {
        backgroundColor: '#F1F5F9',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    body: {
        marginBottom: Spacing.md,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        lineHeight: 22,
    },
    inactiveText: {
        color: Colors.textSecondary,
    },
    description: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    priceLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 1,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    rightFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    stockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    stockDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    stockBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    chevron: {
        marginLeft: 2,
    },
});