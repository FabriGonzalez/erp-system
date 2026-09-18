import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Product, ProductAttribute, ProductAttributeValue, ProductVariant } from '@/types/product';

type ProductSelectionCardProps = {
    product: Product;
    selectedVariant?: ProductVariant;
    availableStock: number;
    qtyInCart: number;
    isOutOfStock: boolean;
    isMaxStockReached: boolean;
    attributeIds: string[];
    isExpanded: boolean;
    attributes: ProductAttribute[];
    attributeValues: ProductAttributeValue[];
    selectedAttributes: Record<string, string>;
    branchId: string;
    attributeOptions: (product: Product, attributeId: string) => string[];
    onSelectAttribute: (attributeId: string, valueId: string) => void;
    onSelectProduct: () => void;
    onAddItem: (product: Product, stock: number, variantId: string) => void;
    onUpdateItemQuantity: (productId: string, variantId: string, quantity: number, stock: number) => void;
};

export function ProductSelectionCard({
    product,
    selectedVariant,
    availableStock,
    qtyInCart,
    isOutOfStock,
    isMaxStockReached,
    attributeIds,
    isExpanded,
    attributes,
    attributeValues,
    selectedAttributes,
    branchId,
    attributeOptions,
    onSelectAttribute,
    onSelectProduct,
    onAddItem,
    onUpdateItemQuantity,
}: ProductSelectionCardProps) {
    const priceFrom = Math.min(...product.variants
        .filter((variant) => (variant.stockByBranch[branchId] ?? 0) > 0)
        .map((variant) => variant.price));

    return (
        <Pressable
            style={({ pressed }) => [SharedStyles.rowCard, styles.productCard, pressed && !isExpanded && SharedStyles.pressed]}
            onPress={product.variants.length > 1 ? onSelectProduct : undefined}        >
            <View style={styles.productMain}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSku}>{product.variants.length} {product.variants.length === 1 ? 'variante' : 'variantes'}</Text>
                <View style={styles.productMeta}>
                    <Text style={styles.productPrice}>
                        Desde ${priceFrom.toLocaleString('es-AR')}
                    </Text>
                </View>

                {isExpanded && product.variants.length > 1 && (
                    <View style={styles.attributeSelection}>
                        {attributeIds.map((attributeId) => (
                            <View key={attributeId}>
                                <Text style={styles.smallLabel}>
                                    {attributes.find((attribute) => attribute.id === attributeId)?.name ?? 'Atributo'}
                                </Text>
                                <View style={styles.optionRow}>
                                    {attributeOptions(product, attributeId).map((valueId) => (
                                        <Pressable
                                            key={valueId}
                                            style={[
                                                styles.optionButton,
                                                selectedAttributes[attributeId] === valueId && styles.optionButtonSelected,
                                            ]}
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                onSelectAttribute(attributeId, valueId);
                                            }}
                                        >
                                            <Text style={[
                                                styles.optionText,
                                                selectedAttributes[attributeId] === valueId && styles.optionTextSelected,
                                            ]}
                                            >
                                                {attributeValues.find((value) => value.id === valueId)?.name ?? valueId}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.cartActionContainer}>
                {product.variants.length > 1 && !selectedVariant ? null : qtyInCart > 0 && selectedVariant ? (
                    <View style={styles.qtyControls}>
                        <Pressable
                            style={styles.qtyBtn}
                            onPress={(event) => {
                                event.stopPropagation();
                                onUpdateItemQuantity(product.id, selectedVariant.id, qtyInCart - 1, availableStock);
                            }}
                        >
                            <SymbolView
                                name={{ ios: 'minus', android: 'remove', web: 'remove' }}
                                size={16}
                                tintColor={Colors.text}
                            />
                        </Pressable>

                        <Text style={styles.qtyText}>{qtyInCart}</Text>

                        <Pressable
                            style={[styles.qtyBtn, isMaxStockReached && styles.btnDisabled]}
                            onPress={(event) => {
                                event.stopPropagation();
                                onAddItem(product, availableStock, selectedVariant.id);
                            }}
                            disabled={isMaxStockReached}
                        >
                            <SymbolView
                                name={{ ios: 'plus', android: 'add', web: 'add' }}
                                size={16}
                                tintColor={isMaxStockReached ? Colors.textSecondary : Colors.text}
                            />
                        </Pressable>
                    </View>
                ) : (
                    <Pressable
                        style={[styles.addToCartButton, isOutOfStock && styles.btnDisabled]}
                        onPress={(event) => {
                            event.stopPropagation();
                            if (selectedVariant) onAddItem(product, availableStock, selectedVariant.id);
                        }}
                        disabled={isOutOfStock}
                    >
                        <SymbolView
                            name={{ ios: 'plus', android: 'add', web: 'add' }}
                            size={16}
                            tintColor={isOutOfStock ? Colors.textSecondary : Colors.white}
                        />
                        <Text style={[styles.addToCartButtonText, isOutOfStock && styles.addButtonTextDisabled]}>
                            Agregar
                        </Text>
                    </Pressable>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    smallLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    attributeSelection: {
        marginTop: Spacing.sm,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    optionButton: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    optionButtonSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    optionText: {
        fontSize: 13,
        color: Colors.text,
    },
    optionTextSelected: {
        color: Colors.white,
    },
    productCard: {
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    productMain: {
        flex: 1,
        paddingRight: Spacing.sm,
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    productSku: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    productMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: 6,
    },
    productPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
    },
    cartActionContainer: {
        justifyContent: 'center',
        minHeight: 36,
    },
    addToCartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 96,
        minHeight: 36,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        borderRadius: 8,
        gap: 4,
    },
    addToCartButtonText: {
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
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
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
