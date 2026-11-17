import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { AttributeFilterModal } from '@/components/products/AttributeFilterModal';
import { CategoryPills } from '@/components/products/CategoryPills';
import { ProductSelectionCard } from '@/components/products/ProductSelectionCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCategories } from '@/hooks/use-category-queries';
import { useProducts } from '@/hooks/use-product-queries';
import { Product, ProductVariant } from '@/types/product';
import {
    AttributeFilter,
    attributeFilterValueIds,
    singleValueAttributes,
    variantMatchesFilter,
} from '@/utils/attribute-filter';

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
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [attributeFilter, setAttributeFilter] = useState<AttributeFilter>({});
    const [isAttributeFilterOpen, setAttributeFilterOpen] = useState(false);
    const attributeValueIds = attributeFilterValueIds(attributeFilter);
    // Solo se vende de categorías activas; la elegida sigue a la vista aunque la desactiven.
    const { categories } = useCategories();
    const selectableCategories = categories.filter((category) => category.active || category.id === selectedCategoryId);

    // Activos con stock en la sucursal, filtrados en el backend (con atributos, el stock es el
    // de las variantes que coinciden). Se vuelven a pedir cada vez que se abre el catálogo: las
    // cantidades se limitan con este stock.
    const {
        items: products,
        isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = useProducts(
        {
            q: searchQuery,
            categoryId: selectedCategoryId ?? undefined,
            active: true,
            // Solo cuenta el stock de variantes activas: si todas las que tienen stock están
            // desactivadas, el producto no aparece.
            stock: 'SELLABLE',
            branchId,
            attributeValueIds: attributeValueIds.length ? attributeValueIds : undefined,
        },
        { enabled: Boolean(branchId), staleTime: 0 },
    );

    // Se elige entre las variantes activas con stock que coinciden con el filtro de atributos.
    // Una desactivada puede seguir teniendo stock: no se ofrece.
    function isSelectable(variant: ProductVariant) {
        return variant.active !== false
            && (variant.stockByBranch[branchId] ?? 0) > 0
            && variantMatchesFilter(variant, attributeFilter);
    }

    function getSelectedVariant(product: Product) {
        if (product.variants.length === 1 && isSelectable(product.variants[0])) return product.variants[0];
        if (selectedProductId !== product.id) return undefined;
        return product.variants.find((variant) =>
            isSelectable(variant) &&
            Object.entries(selectedAttributes).every(([attributeId, valueId]) =>
                variant.attributes.some((attribute) =>
                    attribute.attributeId === attributeId && attribute.attributeValueId === valueId,
                ),
            ) &&
            variant.attributes.every((attribute) => selectedAttributes[attribute.attributeId] === attribute.attributeValueId),
        );
    }

    function resetSelection() {
        // La variante a medio elegir puede no coincidir con el filtro nuevo.
        setSelectedProductId(null);
        setSelectedAttributes({});
    }

    function attributeOptions(product: Product, attributeId: string) {
        const variantValueIds = product.variants
            .filter((variant) =>
                isSelectable(variant) &&
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
                <View style={styles.filters}>
                    <FilterChip
                        label={attributeValueIds.length ? `Atributos · ${attributeValueIds.length}` : 'Atributos'}
                        selected={attributeValueIds.length > 0}
                        onPress={() => setAttributeFilterOpen(true)}
                    />
                </View>
            </View>

            {isAttributeFilterOpen ? (
                <AttributeFilterModal
                    value={attributeFilter}
                    onApply={(filter) => {
                        setAttributeFilter(filter);
                        setAttributeFilterOpen(false);
                        resetSelection();
                    }}
                    onClose={() => setAttributeFilterOpen(false)}
                    categoryId={selectedCategoryId}
                />
            ) : null}

            <CategoryPills
                categories={selectableCategories}
                selectedCategoryId={selectedCategoryId}
                onSelect={(categoryId) => {
                    setSelectedCategoryId(categoryId);
                    resetSelection();
                }}
            />

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
                                .filter(isSelectable)
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
                                    // Lo que el filtro ya define (un solo valor) arranca elegido.
                                    setSelectedAttributes(singleValueAttributes(attributeFilter));
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
    filters: {
        flexDirection: 'row',
        marginTop: Spacing.sm,
    },
    listContainer: {
        paddingHorizontal: Spacing.lg,
    },
});
