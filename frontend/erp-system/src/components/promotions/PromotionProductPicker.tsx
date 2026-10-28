import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useProducts } from '@/hooks/use-product-queries';
import { SharedStyles } from '@/styles/shared';
import { Product } from '@/types/product';
import { formatCurrency } from '@/utils/format';

type PromotionProductPickerProps = {
    getQuantity: (productId: string) => number;
    onAdd: (product: Product) => void;
    onChangeQuantity: (productId: string, quantity: number) => void;
    /** Espacio al final de la lista para la barra fija del modal. */
    listPaddingBottom?: number;
};

/** Precios de las variantes activas: la promo vale para cualquiera de ellas. */
export function activeVariantPrices(product: Product): number[] {
    return product.variants.filter((variant) => variant.active !== false).map((variant) => variant.price);
}

/**
 * Productos activos de la empresa para armar una promo. Sin stock ni sucursal: la promo es de
 * toda la empresa y la variante de cada unidad se elige al vender.
 */
export function PromotionProductPicker({
    getQuantity,
    onAdd,
    onChangeQuantity,
    listPaddingBottom = Spacing.xxl * 3,
}: PromotionProductPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { items: products, isInitialLoading, isLoadingMore, error, loadMore, refresh } =
        useProducts({ q: searchQuery, active: true });

    function renderItem({ item: product }: { item: Product }) {
        const quantity = getQuantity(product.id);
        const prices = activeVariantPrices(product);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const hasVariants = prices.length > 0;

        return (
            <View style={[SharedStyles.rowCard, styles.card]}>
                <View style={styles.main}>
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.detail}>
                        {!hasVariants
                            ? 'Sin variantes activas'
                            : minPrice === maxPrice
                                ? formatCurrency(minPrice)
                                : `${formatCurrency(minPrice)} a ${formatCurrency(maxPrice)}`}
                        {prices.length > 1 ? ` · ${prices.length} variantes` : ''}
                    </Text>
                </View>

                {quantity > 0 ? (
                    <View style={styles.qtyControls}>
                        <Pressable style={styles.qtyBtn} onPress={() => onChangeQuantity(product.id, quantity - 1)}>
                            <SymbolView name={{ ios: 'minus', android: 'remove', web: 'remove' }} size={16} tintColor={Colors.text} />
                        </Pressable>
                        <Text style={styles.qtyText}>{quantity}</Text>
                        <Pressable style={styles.qtyBtn} onPress={() => onChangeQuantity(product.id, quantity + 1)}>
                            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} tintColor={Colors.text} />
                        </Pressable>
                    </View>
                ) : (
                    <Pressable
                        style={[styles.addButton, !hasVariants && styles.btnDisabled]}
                        onPress={() => onAdd(product)}
                        disabled={!hasVariants}
                    >
                        <SymbolView
                            name={{ ios: 'plus', android: 'add', web: 'add' }}
                            size={16}
                            tintColor={hasVariants ? Colors.white : Colors.textSecondary}
                        />
                        <Text style={[styles.addButtonText, !hasVariants && styles.addButtonTextDisabled]}>Agregar</Text>
                    </Pressable>
                )}
            </View>
        );
    }

    return (
        <>
            <View style={styles.searchBox}>
                <AppInput
                    placeholder="Buscar por nombre o SKU..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isInitialLoading ? (
                <LoadingState label="Cargando productos..." />
            ) : error && products.length === 0 ? (
                <ErrorState message={error} onRetry={refresh} />
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: listPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
                    ListEmptyComponent={
                        <EmptyState title="No se encontraron productos" description="No hay productos activos para esa búsqueda." />
                    }
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    searchBox: {
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    listContainer: {
        paddingHorizontal: Spacing.lg,
    },
    card: {
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    main: {
        flex: 1,
        paddingRight: Spacing.sm,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    detail: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 96,
        minHeight: 36,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        borderRadius: 8,
        gap: 4,
    },
    addButtonText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '600',
    },
    addButtonTextDisabled: {
        color: Colors.textSecondary,
    },
    btnDisabled: {
        opacity: 0.4,
        backgroundColor: Colors.border,
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 96,
        minHeight: 36,
        backgroundColor: Colors.muted,
        borderRadius: 8,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        paddingHorizontal: Spacing.sm,
        minWidth: 24,
        textAlign: 'center',
    },
});
