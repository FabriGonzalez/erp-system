    import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

    import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';
import { Product, ProductVariant } from '@/types/product';

    export default function SelectProductsScreen() {
        const activeBranch = useBranchStore((state) => state.activeBranch);
        const { products, attributes, attributeValues, searchQuery, setSearchQuery } = useProductStore();

        const items = useOrderDraftStore((state) => state.items);
        const addItem = useOrderDraftStore((state) => state.addItem);
        const updateItemQuantity = useOrderDraftStore((state) => state.updateItemQuantity);
        const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
        const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

        const branchId = activeBranch?.id ?? '1';

        const filteredProducts = useMemo(() => {
            const query = searchQuery.trim().toLowerCase();

            return products.filter((product) => {
                if (!product.active) return false;
                if (!product.variants.some((variant) => (variant.stockByBranch[branchId] ?? 0) > 0)) return false;
                if (!query) return true;

                const matchesName = product.name.toLowerCase().includes(query);
                const matchesSku = product.variants.some((variant) => variant.sku.toLowerCase().includes(query));
                return matchesName || matchesSku;
            });
        }, [products, searchQuery, branchId]);

        function variantLabel(product: Product, variant: ProductVariant) {
            return variant.attributes.map((attribute) => {
                return attributeValues.find((value) => value.id === attribute.attributeValueId)?.name ?? attribute.attributeValueId;
            }).join(' / ');
        }

        function getSelectedVariant(product: Product) {
            if (product.variants.length === 1 && (product.variants[0].stockByBranch[branchId] ?? 0) > 0) return product.variants[0];
            if (selectedProductId !== product.id) return undefined;
            return product.variants.find((variant) =>
                (variant.stockByBranch[branchId] ?? 0) > 0 &&
                variant.attributes.every((attribute) => selectedAttributes[attribute.attributeId] === attribute.attributeValueId),
            );
        }

        function attributeOptions(product: Product, attributeId: string) {
            return Array.from(new Set(product.variants
                .filter((variant) =>
                    (variant.stockByBranch[branchId] ?? 0) > 0 &&
                    variant.attributes.every((attribute) =>
                        attribute.attributeId === attributeId ||
                        !selectedAttributes[attribute.attributeId] ||
                        selectedAttributes[attribute.attributeId] === attribute.attributeValueId,
                    ),
                )
                .flatMap((variant) => variant.attributes)
                .filter((attribute) => attribute.attributeId === attributeId)
                .map((attribute) => attribute.attributeValueId)));
        }

        const cartTotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
        const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

        return (
            <Screen style={styles.screen}>
                {/* Header */}
                <View style={SharedStyles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                    >
                        <SymbolView
                            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                            size={24}
                            tintColor={Colors.text}
                        />
                    </Pressable>

                    <View style={styles.titleBox}>
                        <Text style={styles.headerTitle}>Catálogo de Productos</Text>
                        <Text style={styles.headerSubtitle}>
                            Sucursal: {activeBranch?.name ?? 'Sucursal Central'}
                        </Text>
                    </View>

                    <View style={SharedStyles.headerSpacer} />
                </View>

                {/* Buscador */}
                <View style={styles.searchBox}>
                    <AppInput
                        placeholder="Buscar producto por nombre o SKU..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <EmptyState
                            title="No se encontraron productos"
                            description="Intenta buscar por otro nombre o SKU."
                        />
                    }
                    renderItem={({ item: product }) => {
                        const selectedVariant = getSelectedVariant(product);
                        const availableStock = selectedVariant?.stockByBranch[branchId] ?? 0;
                        const cartItem = selectedVariant && items.find((i) => i.productId === product.id && i.variantId === selectedVariant.id);
                        const qtyInCart = cartItem ? cartItem.quantity : 0;
                        const isOutOfStock = availableStock <= 0;
                        const isMaxStockReached = qtyInCart >= availableStock;
                        const priceFrom = Math.min(...product.variants
                            .filter((variant) => (variant.stockByBranch[branchId] ?? 0) > 0)
                            .map((variant) => variant.price));
                        const attributeIds = Array.from(new Set(product.variants.flatMap((variant) => variant.attributes.map((attribute) => attribute.attributeId))));
                        const isExpanded = selectedProductId === product.id;

                        return (
                            <View style={styles.productCard}>
                                <View style={styles.productMain}>
                                    <Text style={styles.productName}>{product.name}</Text>
                                    <Text style={styles.productSku}>{product.variants.length} {product.variants.length === 1 ? 'variante' : 'variantes'}</Text>
                                    <View style={styles.productMeta}>
                                        <Text style={styles.productPrice}>
                                            Desde ${priceFrom.toLocaleString('es-AR')}
                                        </Text>
                                    </View>
                                    {isExpanded && product.variants.length > 1 && <View style={styles.attributeSelection}>
                                        {attributeIds.map((attributeId) => <View key={attributeId}>
                                            <Text style={styles.smallLabel}>{attributes.find((attribute) => attribute.id === attributeId)?.name ?? 'Atributo'}</Text>
                                            <View style={styles.optionRow}>{attributeOptions(product, attributeId).map((valueId) => <Pressable key={valueId} style={[styles.optionButton, selectedAttributes[attributeId] === valueId && styles.optionButtonSelected]} onPress={() => setSelectedAttributes((current) => ({ ...current, [attributeId]: valueId }))}><Text style={[styles.optionText, selectedAttributes[attributeId] === valueId && styles.optionTextSelected]}>{attributeValues.find((value) => value.id === valueId)?.name ?? valueId}</Text></Pressable>)}</View>
                                        </View>)}
                                        {selectedVariant && <View style={styles.selectedVariantBox}><Text style={styles.productSku}>{variantLabel(product, selectedVariant)} · SKU: {selectedVariant.sku}</Text><Text style={styles.productPrice}>Precio: ${selectedVariant.price.toLocaleString('es-AR')}</Text><Text style={styles.productSku}>Stock disponible: {availableStock}</Text></View>}
                                    </View>}
                                </View>

                                <View style={styles.cartActionContainer}>
                                    {product.variants.length > 1 && !selectedVariant ? (
                                        <Pressable style={[styles.addButton, isExpanded && styles.btnDisabled]} onPress={() => { if (!isExpanded) { setSelectedProductId(product.id); setSelectedAttributes({}); } }} disabled={isExpanded}><Text style={styles.addButtonText}>{isExpanded ? 'Elegí atributos' : 'Seleccionar'}</Text></Pressable>
                                    ) : qtyInCart > 0 && selectedVariant ? (
                                        <View style={styles.qtyControls}>
                                            <Pressable
                                                style={styles.qtyBtn}
                                                onPress={() => updateItemQuantity(product.id, selectedVariant.id, qtyInCart - 1, availableStock)}
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
                                                onPress={() => addItem(product, availableStock, selectedVariant.id)}
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
                                            style={[
                                                styles.addButton,
                                                isOutOfStock && styles.btnDisabled,
                                            ]}
                                            onPress={() => selectedVariant && addItem(product, availableStock, selectedVariant.id)}
                                            disabled={isOutOfStock}
                                        >
                                            <SymbolView
                                                name={{ ios: 'plus', android: 'add', web: 'add' }}
                                                size={16}
                                                tintColor={isOutOfStock ? Colors.textSecondary : Colors.white}
                                            />
                                            <Text style={[styles.addButtonText, isOutOfStock && styles.addButtonTextDisabled]}>
                                                Agregar
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                />

                {/* Barra flotante inferior de resumen del carrito */}
                {cartItemsCount > 0 && (
                    <View style={styles.stickyCartBar}>
                        <View>
                            <Text style={styles.stickyCartCount}>
                                {cartItemsCount} {cartItemsCount === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}
                            </Text>
                            <Text style={styles.stickyCartTotal}>
                                Total: ${cartTotalAmount.toLocaleString('es-AR')}
                            </Text>
                        </View>

                        <Pressable
                            style={({ pressed }) => [styles.confirmCartBtn, pressed && SharedStyles.pressed]}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.confirmCartBtnText}>Ver resumen</Text>
                            <SymbolView
                                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                                size={16}
                                tintColor={Colors.white}
                            />
                        </Pressable>
                    </View>
                )}
            </Screen>
        );
    }

    const styles = StyleSheet.create({
        smallLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.xs },
        attributeSelection: { marginTop: Spacing.sm },
        optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
        optionButton: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
        optionButtonSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
        optionText: { fontSize: 13, color: Colors.text },
        optionTextSelected: { color: Colors.white },
        selectedVariantBox: { marginTop: Spacing.sm, gap: 2 },
        screen: {
            padding: 0,
            backgroundColor: Colors.background,
        },
        titleBox: {
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: 17,
            fontWeight: '700',
            color: Colors.text,
        },
        headerSubtitle: {
            fontSize: 12,
            color: Colors.textSecondary,
            marginTop: 1,
        },
        searchBox: {
            padding: Spacing.lg,
            paddingBottom: Spacing.sm,
        },
        listContainer: {
            paddingHorizontal: Spacing.lg,
            paddingBottom: Spacing.xxl * 3,
        },
        productCard: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: Colors.surface,
            borderRadius: 12,
            padding: Spacing.md,
            borderWidth: 1,
            borderColor: Colors.border,
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
        stockBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        stockAvailable: {
            backgroundColor: '#E0F2FE',
        },
        stockAvailableText: {
            color: '#0369A1',
        },
        stockOut: {
            backgroundColor: '#FEE2E2',
        },
        stockOutText: {
            color: Colors.error,
        },
        stockBadgeText: {
            fontSize: 11,
            fontWeight: '600',
        },
        cartActionContainer: {
            justifyContent: 'center',
        },
        addButton: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.primary,
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.xs + 2,
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
            backgroundColor: '#E2E8F0',
        },
        qtyControls: {
            flexDirection: 'row',
            alignItems: 'center',
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
        },
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
        confirmCartBtnText: {
            color: Colors.white,
            fontSize: 14,
            fontWeight: '600',
        },
    });
