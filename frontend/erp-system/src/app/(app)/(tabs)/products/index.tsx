import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { CategoryPills } from '@/components/products/CategoryPills';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductsFilterChips } from '@/components/products/ProductsFilterChips';
import { ProductsSearchBar } from '@/components/products/ProductsSearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useProductStore } from '@/stores/product-store';

export default function ProductsScreen() {
    const user = useAuthStore((state) => state.user);
    const activeBranch = useBranchStore((state) => state.activeBranch);

    const {
        products,
        categories,
        searchQuery,
        stockFilter,
        statusFilter,
        selectedCategoryId,
        isLoading,
        isError,
        errorMessage,
        setSearchQuery,
        setStockFilter,
        setStatusFilter,
        setSelectedCategory,
        resetFilters,
        reloadProducts,
        toggleProductActive,
    } = useProductStore();

    const canCreate =
        user?.role === 'ADMINISTRATOR' ||
        Boolean(user?.permissions?.includes('PRODUCTS_CREATE'));

    const canEdit =
        user?.role === 'ADMINISTRATOR' ||
        Boolean(user?.permissions?.includes('PRODUCTS_UPDATE'));

    const filteredProducts = useMemo(() => {
        const branchId = activeBranch?.id ?? '1';

        return products.filter((product) => {
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesName = product.name.toLowerCase().includes(query);
                const matchesSku = product.variants.some((variant) => variant.sku.toLowerCase().includes(query));
                if (!matchesName && !matchesSku) return false;
            }

            if (selectedCategoryId && product.categoryId !== selectedCategoryId) {
                return false;
            }

            if (statusFilter === 'ACTIVE' && !product.active) return false;
            if (statusFilter === 'INACTIVE' && product.active) return false;

            const currentStock = product.variants.reduce((sum, variant) => sum + (variant.stockByBranch[branchId] ?? 0), 0);
            if (stockFilter === 'IN_STOCK' && currentStock <= 0) return false;
            if (stockFilter === 'OUT_OF_STOCK' && currentStock > 0) return false;

            return true;
        });
    }, [products, searchQuery, selectedCategoryId, statusFilter, stockFilter, activeBranch]);

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
        selectedCategoryId !== null;

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.topBar}>
                <View>
                    <Text style={SharedStyles.screenTitle}>Productos</Text>
                    <Text style={SharedStyles.screenSubtitle}>
                        {activeBranch ? `Stock: ${activeBranch.name}` : 'Catálogo general'}
                    </Text>
                </View>

                {canCreate && (
                    <Pressable
                        onPress={handleCreateProduct}
                        accessibilityRole="button"
                        accessibilityLabel="Crear nuevo procuto"
                        hitSlop={6}
                        style={({ pressed }) => [
                            SharedStyles.addButton,
                            pressed && SharedStyles.pressed,
                        ]}
                    >
                        <View style={SharedStyles.addIconContainer}>
                            <SymbolView name={{
                                ios: 'plus',
                                android: 'add',
                                web: 'add',
                            }}
                                size={24}
                                tintColor={Colors.white}
                            />
                        </View>
                        <Text style={SharedStyles.addButtonText}>Nuevo producto</Text>
                    </Pressable>
                )}
            </View>

            <ProductsSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            <ProductsFilterChips
                stockFilter={stockFilter}
                statusFilter={statusFilter}
                onStockChange={setStockFilter}
                onStatusChange={setStatusFilter}
            />

            <CategoryPills
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategory}
            />

            <View style={styles.resultsBar}>
                <Text style={styles.resultsCount}>
                    {filteredProducts.length}{' '}
                    {filteredProducts.length === 1 ? 'producto' : 'productos'} encontrados
                </Text>
                {hasActiveFilters && (
                    <Pressable onPress={resetFilters} style={styles.resetFiltersButton}>
                        <Text style={styles.resetFiltersText}>Limpiar filtros</Text>
                    </Pressable>
                )}
            </View>

            {isLoading && (
                <LoadingState label="Cargando productos..." />
            )}

            {!isLoading && isError && (
                <ErrorState
                    message={errorMessage}
                    onRetry={reloadProducts}
                />
            )}

            {!isLoading && !isError && (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={reloadProducts}
                            tintColor={Colors.primary}
                        />
                    }
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
                    renderItem={({ item }) => {
                        const branchId = activeBranch?.id ?? '1';
                        const currentStock = item.variants.reduce((sum, variant) => sum + (variant.stockByBranch[branchId] ?? 0), 0);

                        return (
                            <ProductCard
                                product={item}
                                stock={currentStock}
                                canEdit={canEdit}
                                onPress={() => handleEditProduct(item.id)}
                                onToggleActive={() => toggleProductActive(item.id)}
                            />
                        );
                    }}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
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
