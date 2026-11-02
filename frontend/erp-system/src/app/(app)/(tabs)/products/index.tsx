import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { AttributeFilterModal } from '@/components/products/AttributeFilterModal';
import { CategoryPills } from '@/components/products/CategoryPills';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductsFilterChips } from '@/components/products/ProductsFilterChips';
import { ProductsSearchBar } from '@/components/products/ProductsSearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { StatTile } from '@/components/ui/StatTile';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useCategories } from '@/hooks/use-category-queries';
import { useProducts } from '@/hooks/use-product-queries';
import { useDashboard } from '@/hooks/use-report-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { StatusFilter, StockFilter } from '@/types/product';
import { AttributeFilter, attributeFilterValueIds, variantMatchesFilter } from '@/utils/attribute-filter';
import { hasPermission } from '@/utils/permissions';
import { productStock } from '@/utils/product-stock';

export default function ProductsScreen() {
    const user = useAuthStore((state) => state.user);
    const activeBranch = useActiveBranch();
    const { categories } = useCategories();

    // Filtros propios de esta pantalla: los selectores de productos tienen su propia búsqueda.
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [selectedCategoryId, setSelectedCategory] = useState<string | null>(null);
    const [attributeFilter, setAttributeFilter] = useState<AttributeFilter>({});
    const [isAttributeFilterOpen, setAttributeFilterOpen] = useState(false);
    const attributeValueIds = attributeFilterValueIds(attributeFilter);
    const hasAttributeFilter = attributeValueIds.length > 0;

    // Sin sucursal activa, el stock (y su filtro) es el total de todas las sucursales.
    const branchId = activeBranch?.id;
    const {
        items: products,
        totalElements,
        isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = useProducts({
        q: searchQuery,
        categoryId: selectedCategoryId ?? undefined,
        active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        stock: stockFilter === 'ALL' ? undefined : stockFilter,
        branchId,
        attributeValueIds: hasAttributeFilter ? attributeValueIds : undefined,
    });

    // Los mismos filtros que deja "Sin stock" al tocarlo: comparten la caché.
    const outOfStock = useProducts({ stock: 'OUT_OF_STOCK', branchId });
    // El stock bajo sale de Reportes: sin VER_REPORTES no se pide ni se muestra.
    const lowStock = useDashboard('today', activeBranch?.id ?? null).dashboard?.lowStock;

    function showOutOfStock() {
        resetFilters();
        setStockFilter('OUT_OF_STOCK');
    }

    function resetFilters() {
        setSearchQuery('');
        setStockFilter('ALL');
        setStatusFilter('ALL');
        setSelectedCategory(null);
        setAttributeFilter({});
    }

    // Editar y activar/desactivar piden ADMINISTRAR_PRODUCTOS; crear, también
    // ADMINISTRAR_PRECIOS (cada variante nueva fija un precio).
    const canEdit = hasPermission(user, 'ADMINISTRAR_PRODUCTOS');
    const canCreate = canEdit && hasPermission(user, 'ADMINISTRAR_PRECIOS');

    function handleCreateProduct() {
        router.push('/products/new' as any);
    }

    function handleEditProduct(id: string) {
        router.push(`/products/${id}` as any);
    }

    const hasActiveFilters =
        Boolean(searchQuery) ||
        stockFilter !== 'ALL' ||
        statusFilter !== 'ALL' ||
        selectedCategoryId !== null ||
        hasAttributeFilter;

    return (
        <Screen style={styles.screen}>
            <PageHeader
                eyebrow={activeBranch ? `Stock de ${activeBranch.name}` : 'Stock de todas las sucursales'}
                title="Productos"
                right={canCreate ? (
                    <HeaderButton label="Nuevo" accessibilityLabel="Crear producto" onPress={handleCreateProduct} />
                ) : undefined}
            />

            <View style={[SharedStyles.statRow, styles.stats]}>
                <StatTile
                    label="Sin stock"
                    value={outOfStock.isInitialLoading ? '…' : String(outOfStock.totalElements)}
                    icon={{ ios: 'xmark.bin', android: 'remove_shopping_cart', web: 'remove_shopping_cart' }}
                    tone="danger"
                    onPress={showOutOfStock}
                />
                {lowStock ? (
                    <StatTile
                        label="Stock bajo"
                        value={String(lowStock.count)}
                        icon={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
                        tone="warning"
                    />
                ) : null}
            </View>

            <ProductsSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            <ProductsFilterChips
                stockFilter={stockFilter}
                statusFilter={statusFilter}
                attributeValueCount={attributeValueIds.length}
                onStockChange={setStockFilter}
                onStatusChange={setStatusFilter}
                onOpenAttributes={() => setAttributeFilterOpen(true)}
            />

            {isAttributeFilterOpen ? (
                <AttributeFilterModal
                    value={attributeFilter}
                    onApply={(filter) => {
                        setAttributeFilter(filter);
                        setAttributeFilterOpen(false);
                    }}
                    onClose={() => setAttributeFilterOpen(false)}
                    categoryId={selectedCategoryId}
                />
            ) : null}

            <CategoryPills
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategory}
            />

            <View style={styles.resultsBar}>
                <Text style={styles.resultsCount}>
                    {totalElements}{' '}
                    {totalElements === 1 ? 'producto' : 'productos'} encontrados
                </Text>
                {hasActiveFilters && (
                    <Pressable onPress={resetFilters} style={styles.resetFiltersButton}>
                        <Text style={styles.resetFiltersText}>Limpiar filtros</Text>
                    </Pressable>
                )}
            </View>

            {isInitialLoading ? (
                <LoadingState label="Cargando productos..." />
            ) : error && products.length === 0 ? (
                <ErrorState
                    message={error}
                    onRetry={refresh}
                />
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={refresh}
                            tintColor={Colors.primary}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
                    ListEmptyComponent={
                        <EmptyState
                            title={
                                hasActiveFilters
                                    ? 'No se encontraron resultados'
                                    : 'No hay productos disponibles'
                            }
                            description={
                                hasActiveFilters
                                    ? 'Prueba modificando la búsqueda o los filtros aplicados.'
                                    : 'Crea el primer producto para comenzar a gestionar tu catálogo.'
                            }
                            iconName={{ ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' }}
                            actionLabel={
                                hasActiveFilters
                                    ? 'Limpiar filtros'
                                    : canCreate
                                        ? 'Crear producto'
                                        : undefined
                            }
                            onAction={
                                hasActiveFilters
                                    ? resetFilters
                                    : canCreate
                                        ? handleCreateProduct
                                        : undefined
                            }
                        />
                    }
                    renderItem={({ item }) => (
                        <ProductCard
                            product={item}
                            stock={productStock(item, branchId, hasAttributeFilter ? attributeFilter : undefined)}
                            matchingVariants={hasAttributeFilter
                                ? item.variants.filter((variant) => variantMatchesFilter(variant, attributeFilter)).length
                                : undefined}
                            canEdit={canEdit}
                            onPress={() => handleEditProduct(item.id)}
                        />
                    )}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },

    stats: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
    },

    resultsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs + 2,
    },

    resultsCount: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
    },

    resetFiltersButton: {
        paddingVertical: 2,
    },

    resetFiltersText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },

    listContainer: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xxl * 2,
    },
});
