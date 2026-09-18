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

import { CartSummaryBar } from '@/components/products/CartSummaryBar';
import { ProductSelectionCard } from '@/components/products/ProductSelectionCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useProductAttributeStore } from '@/stores/product-attribute-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';
import { Product } from '@/types/product';

    export default function SelectProductsScreen() {
        const activeBranch = useBranchStore((state) => state.activeBranch);
        const { products, searchQuery, setSearchQuery } = useProductStore();
        const attributes = useProductAttributeStore((state) => state.attributes);
        const attributeValues = useProductAttributeStore((state) => state.attributeValues);

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

        function getSelectedVariant(product: Product) {
            if (product.variants.length === 1 && (product.variants[0].stockByBranch[branchId] ?? 0) > 0) return product.variants[0];
            if (selectedProductId !== product.id) return undefined;
            return product.variants.find((variant) =>
                (variant.stockByBranch[branchId] ?? 0) > 0 &&
                Object.entries(selectedAttributes).every(([attributeId, valueId]) =>
                    variant.attributes.some((attribute) =>
                        attribute.attributeId === attributeId && attribute.attributeValueId === valueId,
                    ),
                ) &&
                variant.attributes.every((attribute) => selectedAttributes[attribute.attributeId] === attribute.attributeValueId),
            );
        }

        function attributeOptions(product: Product, attributeId: string) {
            const variantValueIds = product.variants
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
                .map((attribute) => attribute.attributeValueId);
            return Array.from(new Set<string>(variantValueIds));
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
                        const attributeIds = Array.from(new Set([
                            ...product.variants
                                .filter((variant) => (variant.stockByBranch[branchId] ?? 0) > 0)
                                .flatMap((variant) => variant.attributes.map((attribute) => attribute.attributeId)),
                        ]));
                        const isExpanded = selectedProductId === product.id;

                        return (
                            <ProductSelectionCard
                                product={product}
                                selectedVariant={selectedVariant}
                                availableStock={availableStock}
                                qtyInCart={qtyInCart}
                                isOutOfStock={isOutOfStock}
                                isMaxStockReached={isMaxStockReached}
                                attributeIds={attributeIds}
                                isExpanded={isExpanded}
                                attributes={attributes}
                                attributeValues={attributeValues}
                                selectedAttributes={selectedAttributes}
                                branchId={branchId}
                                attributeOptions={attributeOptions}
                                onSelectAttribute={(attributeId, valueId) =>
                                    setSelectedAttributes((current) => {
                                        if (current[attributeId] === valueId) {
                                            const next = { ...current };
                                            delete next[attributeId];
                                            return next;
                                        }

                                        return {
                                            ...current,
                                            [attributeId]: valueId,
                                        };
                                    })
                                }
                                onSelectProduct={() => {
                                    if (isExpanded) {
                                        setSelectedProductId(null);
                                        return;
                                    }

                                    setSelectedProductId(product.id);
                                    setSelectedAttributes({});
                                }}
                                onAddItem={addItem}
                                onUpdateItemQuantity={updateItemQuantity}
                            />
                        );
                    }}
                />

                <CartSummaryBar
                    itemsCount={cartItemsCount}
                    totalAmount={cartTotalAmount}
                    onPress={() => router.back()}
                />
            </Screen>
        );
    }

    const styles = StyleSheet.create({
        screen: {
            padding: 0,
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
    });
