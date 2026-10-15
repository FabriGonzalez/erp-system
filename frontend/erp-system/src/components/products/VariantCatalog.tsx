import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ProductSelectionCard } from '@/components/products/ProductSelectionCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useProductAttributeStore } from '@/stores/product-attribute-store';
import { Product } from '@/types/product';

type VariantCatalogProps = {
    /** Sucursal cuyo stock se muestra y limita las cantidades. */
    branchId: string;
    products: Product[];
    isLoading: boolean;
    /** Error de carga; solo se muestra si todavía no hay productos. */
    errorMessage: string | null;
    onRefresh: () => void;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    /** Unidades ya elegidas de esa variante. */
    getSelectedQuantity: (productId: string, variantId: string) => number;
    onAddItem: (product: Product, stock: number, variantId: string) => void;
    onUpdateItemQuantity: (productId: string, variantId: string, quantity: number, stock: number) => void;
    showPrice?: boolean;
    selectedLabel?: string;
    noBranchDescription: string;
    /** Espacio al final de la lista para la barra fija de la pantalla. */
    listPaddingBottom?: number;
};

/**
 * Buscador y lista de productos activos con stock en una sucursal, con elección de
 * variante por atributos. Lo usan el catálogo de pedidos y el alta de transferencias.
 */
export function VariantCatalog({
    branchId,
    products,
    isLoading,
    errorMessage,
    onRefresh,
    searchQuery,
    onSearchQueryChange,
    getSelectedQuantity,
    onAddItem,
    onUpdateItemQuantity,
    showPrice,
    selectedLabel,
    noBranchDescription,
    listPaddingBottom = Spacing.xxl * 3,
}: VariantCatalogProps) {
    const token = useAuthStore((state) => state.token);
    const attributes = useProductAttributeStore((state) => state.attributes);
    const attributeValues = useProductAttributeStore((state) => state.attributeValues);
    const fetchAttributes = useProductAttributeStore((state) => state.fetchAttributes);
    const hasAttributes = attributes.length > 0;

    useEffect(() => {
        if (token && !hasAttributes) {
            fetchAttributes(token).catch(() => {});
        }
    }, [token, hasAttributes, fetchAttributes]);

    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!branchId) return [];

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

    return (
        <>
            <View style={styles.searchBox}>
                <AppInput
                    placeholder="Buscar producto por nombre o SKU..."
                    value={searchQuery}
                    onChangeText={onSearchQueryChange}
                />
            </View>

            {isLoading && products.length === 0 ? (
                <LoadingState label="Cargando productos..." />
            ) : errorMessage && products.length === 0 ? (
                <ErrorState message={errorMessage} onRetry={onRefresh} />
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: listPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        !branchId ? (
                            <EmptyState title="Sin sucursal activa" description={noBranchDescription} />
                        ) : (
                            <EmptyState
                                title="No se encontraron productos"
                                description="No hay productos con stock en esta sucursal para esa búsqueda."
                            />
                        )
                    }
                    renderItem={({ item: product }) => {
                        const selectedVariant = getSelectedVariant(product);
                        const availableStock = selectedVariant?.stockByBranch[branchId] ?? 0;
                        const qtyInCart = selectedVariant ? getSelectedQuantity(product.id, selectedVariant.id) : 0;
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
                                isOutOfStock={availableStock <= 0}
                                isMaxStockReached={qtyInCart >= availableStock}
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
                                onAddItem={onAddItem}
                                onUpdateItemQuantity={onUpdateItemQuantity}
                                showPrice={showPrice}
                                selectedLabel={selectedLabel}
                            />
                        );
                    }}
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
});
