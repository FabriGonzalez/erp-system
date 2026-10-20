import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useCategories } from '@/hooks/use-category-queries';
import { useProducts } from '@/hooks/use-product-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { StatusFilter, StockFilter } from '@/types/product';
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
    });

    function resetFilters() {
        setSearchQuery('');
        setStockFilter('ALL');
        setStatusFilter('ALL');
        setSelectedCategory(null);
    }

    // El backend usa el mismo permiso para crear, editar y activar/desactivar productos.
    const canCreate = hasPermission(user, 'ADMINISTRAR_PRODUCTOS');
    const canEdit = canCreate;

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
                        accessibilityLabel="Crear producto"
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
                        <Text style={SharedStyles.addButtonText}>Crear producto</Text>
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
                            stock={productStock(item, branchId)}
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
