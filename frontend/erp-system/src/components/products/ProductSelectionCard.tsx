import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconBadge } from '@/components/ui/IconBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Product, ProductVariant } from '@/types/product';
import { formatCurrency } from '@/utils/format';
import { stockPill } from '@/utils/status';

type ProductSelectionCardProps = {
    product: Product;
    selectedVariant?: ProductVariant;
    availableStock: number;
    qtyInCart: number;
    isOutOfStock: boolean;
    isMaxStockReached: boolean;
    attributeIds: string[];
    isExpanded: boolean;
    selectedAttributes: Record<string, string>;
    branchId: string;
    attributeOptions: (product: Product, attributeId: string) => string[];
    onSelectAttribute: (attributeId: string, valueId: string) => void;
    onSelectProduct: () => void;
    onAddItem: (product: Product, stock: number, variantId: string) => void;
    onUpdateItemQuantity: (productId: string, variantId: string, quantity: number, stock: number) => void;
    /** Las transferencias no usan precio. */
    showPrice?: boolean;
    /** Dónde están las unidades ya elegidas, p. ej. "en el carrito". */
    selectedLabel?: string;
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
    selectedAttributes,
    branchId,
    attributeOptions,
    onSelectAttribute,
    onSelectProduct,
    onAddItem,
    onUpdateItemQuantity,
    showPrice = true,
    selectedLabel = 'en el carrito',
}: ProductSelectionCardProps) {
    const hasVariants = product.variants.length > 1;
    const priceFrom = Math.min(...product.variants
        .filter((variant) => (variant.stockByBranch[branchId] ?? 0) > 0)
        .map((variant) => variant.price));
    const price = selectedVariant ? selectedVariant.price : priceFrom;

    // Con variante elegida se muestra su stock; sin elegir, el total del producto en la sucursal.
    const totalStock = product.variants.reduce(
        (sum, variant) => sum + Math.max(0, variant.stockByBranch[branchId] ?? 0),
        0,
    );
    const pill = stockPill(selectedVariant ? availableStock : totalStock);
    const meta = selectedVariant && hasVariants
        ? selectedVariant.sku
        : hasVariants
            ? `${product.variants.length} variantes`
            : product.variants[0]?.sku ?? 'Sin variantes';

    // Los nombres de atributo y valor vienen en el producto: no hace falta el catálogo de
    // atributos (antes, sin cargarlo, se veía "Atributo" y el id del valor).
    const variantAttributes = product.variants.flatMap((variant) => variant.attributes);
    const attributeName = (attributeId: string) =>
        variantAttributes.find((attribute) => attribute.attributeId === attributeId)?.attributeName ?? 'Atributo';
    const valueName = (valueId: string) =>
        variantAttributes.find((attribute) => attribute.attributeValueId === valueId)?.valueName ?? valueId;

    return (
        <Pressable
            style={({ pressed }) => [
                SharedStyles.card,
                styles.card,
                pressed && hasVariants && !isExpanded && SharedStyles.listItemPressed,
            ]}
            onPress={hasVariants ? onSelectProduct : undefined}
        >
            <View style={styles.row}>
                <IconBadge
                    icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
                    tone="neutral"
                    size={44}
                />
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle} numberOfLines={2}>{product.name}</Text>
                    <Text style={SharedStyles.listItemMeta} numberOfLines={1}>{meta}</Text>
                    <View style={styles.priceRow}>
                        {showPrice && Number.isFinite(price) ? (
                            <Text style={styles.price}>
                                {hasVariants && !selectedVariant ? 'Desde ' : ''}{formatCurrency(price)}
                            </Text>
                        ) : null}
                        <StatusPill label={pill.label} tone={pill.tone} />
                    </View>
                    {selectedVariant && qtyInCart > 0 ? (
                        <Text style={styles.inCart}>{qtyInCart} {selectedLabel}</Text>
                    ) : null}
                </View>

                {hasVariants && !selectedVariant ? (
                    <SymbolView
                        name={isExpanded
                            ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
                            : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                        size={22}
                        tintColor={Colors.textSecondary}
                    />
                ) : qtyInCart > 0 && selectedVariant ? (
                    <View style={styles.stepper}>
                        <Pressable
                            style={styles.stepperButton}
                            onPress={(event) => {
                                event.stopPropagation();
                                onUpdateItemQuantity(product.id, selectedVariant.id, qtyInCart - 1, availableStock);
                            }}
                        >
                            <SymbolView
                                name={{ ios: 'minus', android: 'remove', web: 'remove' }}
                                size={18}
                                tintColor={Colors.text}
                            />
                        </Pressable>

                        <Text style={styles.stepperText}>{qtyInCart}</Text>

                        <Pressable
                            style={[styles.stepperButton, isMaxStockReached && styles.stepperButtonDisabled]}
                            onPress={(event) => {
                                event.stopPropagation();
                                onAddItem(product, availableStock, selectedVariant.id);
                            }}
                            disabled={isMaxStockReached}
                        >
                            <SymbolView
                                name={{ ios: 'plus', android: 'add', web: 'add' }}
                                size={18}
                                tintColor={Colors.text}
                            />
                        </Pressable>
                    </View>
                ) : (
                    <Pressable
                        style={[SharedStyles.addButton, isOutOfStock && SharedStyles.addButtonDisabled]}
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
                        <Text style={[SharedStyles.addButtonText, isOutOfStock && SharedStyles.addButtonTextDisabled]}>
                            Agregar
                        </Text>
                    </Pressable>
                )}
            </View>

            {isExpanded && hasVariants && (
                <View style={styles.attributes}>
                    {attributeIds.map((attributeId) => (
                        <View key={attributeId} style={styles.attribute}>
                            <Text style={styles.attributeName}>{attributeName(attributeId)}</Text>
                            <View style={styles.chips}>
                                {attributeOptions(product, attributeId).map((valueId) => {
                                    const isSelected = selectedAttributes[attributeId] === valueId;
                                    return (
                                        <Pressable
                                            key={valueId}
                                            style={[styles.chip, isSelected && styles.chipSelected]}
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                onSelectAttribute(attributeId, valueId);
                                            }}
                                        >
                                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                                {valueName(valueId)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: 2,
    },
    price: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    inCart: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    attributes: {
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: Spacing.md,
    },
    attribute: {
        gap: Spacing.sm,
    },
    attributeName: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    // Como en PromoVariantChooser: botones de buen tamaño, se eligen con el cliente esperando.
    chip: {
        minWidth: 56,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },
    chipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    chipTextSelected: {
        color: Colors.white,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 104,
        minHeight: 40,
        backgroundColor: Colors.muted,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 2,
    },
    stepperButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.sm,
    },
    stepperButtonDisabled: {
        opacity: 0.35,
    },
    stepperText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        minWidth: 24,
        textAlign: 'center',
    },
});
