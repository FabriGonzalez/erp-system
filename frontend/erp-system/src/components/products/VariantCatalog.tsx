import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ProductSelectionCard } from '@/components/products/ProductSelectionCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useProducts } from '@/hooks/use-product-queries';
import { Product } from '@/types/product';

type VariantCatalogProps = {
    /** Sucursal cuyo stock se muestra y limita las cantidades. */
    branchId: string;
    /** Unidades ya elegidas de esa variante. */
    getSelectedQuantity: (productId: string, variantId: string) => number;
    /**
     * Unidades de la variante que ya tiene reservadas el pedido que se edita: están
     * descontadas del stock de la sucursal y se suman al disponible.
     */
    getReservedQuantity?: (variantId: string) => number;
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
    getSelectedQuantity,
    getReservedQuantity,
    onAddItem,
    onUpdateItemQuantity,
    showPrice,
    selectedLabel,
    noBranchDescription,
    listPaddingBottom = Spacing.xxl * 3,
}: VariantCatalogProps) {
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
    // Propia de cada catálogo: no pisa la búsqueda del listado de Productos.
    const [searchQuery, setSearchQuery] = useState('');

    // Activos con stock en la sucursal, filtrados en el backend. Se vuelven a pedir cada vez
    // que se abre el catálogo: las cantidades se limitan con este stock.
    const {
        items: products,
        isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = useProducts(
        { q: searchQuery, active: true, stock: 'IN_STOCK', branchId },
        { enabled: Boolean(branchId), staleTime: 0 },
    );

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
                    data={branchId ? products : []}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: listPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
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
                        const branchStock = selectedVariant?.stockByBranch[branchId] ?? 0;
                        const reserved = selectedVariant ? getReservedQuantity?.(selectedVariant.id) ?? 0 : 0;
                        const availableStock = branchStock + reserved;
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
                                // Quien recibe la cantidad ya suma lo reservado: se le pasa el stock de la sucursal.
                                onAddItem={(item, _stock, variantId) => onAddItem(item, branchStock, variantId)}
                                onUpdateItemQuantity={(productId, variantId, quantity) =>
                                    onUpdateItemQuantity(productId, variantId, quantity, branchStock)
                                }
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
