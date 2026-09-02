import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

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

    // Permissions check
    const canCreate =
        user?.role === 'ADMINISTRATOR' ||
        Boolean(user?.permissions?.includes('PRODUCTS_CREATE'));

    const canEdit =
        user?.role === 'ADMINISTRATOR' ||
        Boolean(user?.permissions?.includes('PRODUCTS_UPDATE'));

    // Filter products
    const filteredProducts = useMemo(() => {
        const branchId = activeBranch?.id ?? '1';

        return products.filter((product) => {
            // Search query filter (name or SKU)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesName = product.name.toLowerCase().includes(query);
                const matchesSku = product.sku.toLowerCase().includes(query);
                if (!matchesName && !matchesSku) return false;
            }

            // Category filter
            if (selectedCategoryId && product.categoryId !== selectedCategoryId) {
                return false;
            }

            // Status filter (Active / Inactive)
            if (statusFilter === 'ACTIVE' && !product.active) return false;
            if (statusFilter === 'INACTIVE' && product.active) return false;

            // Stock filter (calculated for activeBranch)
            const currentStock = product.stockByBranch[branchId] ?? 0;
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
            {/* Header de la pantalla con título y botón de acción */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.screenTitle}>Productos</Text>
                    <Text style={styles.screenSubtitle}>
                        {activeBranch ? `Stock: ${activeBranch.name}` : 'Catálogo general'}
                    </Text>
                </View>

                {canCreate && (
                    <Pressable
                        style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
                        onPress={handleCreateProduct}
                    >
                        <SymbolView
                            name={{ ios: 'plus', android: 'add', web: 'add' }}
                            size={18}
                            tintColor="#FFFFFF"
                        />
                        <Text style={styles.createButtonText}>Nuevo</Text>
                    </Pressable>
                )}
            </View>

            {/* Barra de Búsqueda */}
            <View style={styles.searchContainer}>
                <SymbolView
                    name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                    size={20}
                    tintColor={Colors.textSecondary}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre o SKU..."
                    placeholderTextColor={Colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <Pressable
                        onPress={() => setSearchQuery('')}
                        style={styles.clearSearchButton}
                    >
                        <SymbolView
                            name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                            size={18}
                            tintColor={Colors.textSecondary}
                        />
                    </Pressable>
                )}
            </View>

            {/* Filtros de Stock y Estado */}
            <View style={styles.filterSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                >
                    {/* Filtro de Stock */}
                    <View style={styles.filterGroup}>
                        <Pressable
                            style={[
                                styles.chip,
                                stockFilter === 'ALL' && styles.chipActive,
                            ]}
                            onPress={() => setStockFilter('ALL')}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    stockFilter === 'ALL' && styles.chipTextActive,
                                ]}
                            >
                                Stock: Todos
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.chip,
                                stockFilter === 'IN_STOCK' && styles.chipActive,
                            ]}
                            onPress={() => setStockFilter('IN_STOCK')}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    stockFilter === 'IN_STOCK' && styles.chipTextActive,
                                ]}
                            >
                                Con stock
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.chip,
                                stockFilter === 'OUT_OF_STOCK' && styles.chipActive,
                            ]}
                            onPress={() => setStockFilter('OUT_OF_STOCK')}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    stockFilter === 'OUT_OF_STOCK' && styles.chipTextActive,
                                ]}
                            >
                                Sin stock
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.filterDivider} />

                    {/* Filtro de Estado Activo/Inactivo */}
                    <View style={styles.filterGroup}>
                        <Pressable
                            style={[
                                styles.chip,
                                statusFilter === 'ALL' && styles.chipActive,
                            ]}
                            onPress={() => setStatusFilter('ALL')}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    statusFilter === 'ALL' && styles.chipTextActive,
                                ]}
                            >
                                Estado: Todos
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.chip,
                                statusFilter === 'ACTIVE' && styles.chipActive,
                            ]}
                            onPress={() => setStatusFilter('ACTIVE')}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    statusFilter === 'ACTIVE' && styles.chipTextActive,
                                ]}
                            >
                                Activos
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.chip,
                                statusFilter === 'INACTIVE' && styles.chipActive,
                            ]}
                            onPress={() => setStatusFilter('INACTIVE')}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    statusFilter === 'INACTIVE' && styles.chipTextActive,
                                ]}
                            >
                                Inactivos
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </View>

            {/* Filtro de Categorías */}
            <View style={styles.categorySection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                >
                    <Pressable
                        style={[
                            styles.categoryPill,
                            selectedCategoryId === null && styles.categoryPillActive,
                        ]}
                        onPress={() => setSelectedCategory(null)}
                    >
                        <Text
                            style={[
                                styles.categoryPillText,
                                selectedCategoryId === null && styles.categoryPillTextActive,
                            ]}
                        >
                            Todas las categorías
                        </Text>
                    </Pressable>

                    {categories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                            <Pressable
                                key={cat.id}
                                style={[
                                    styles.categoryPill,
                                    isSelected && styles.categoryPillActive,
                                ]}
                                onPress={() =>
                                    setSelectedCategory(isSelected ? null : cat.id)
                                }
                            >
                                <Text
                                    style={[
                                        styles.categoryPillText,
                                        isSelected && styles.categoryPillTextActive,
                                    ]}
                                >
                                    {cat.name}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Contador de resultados */}
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

            {/* Estado de Carga */}
            {isLoading && (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Cargando productos...</Text>
                </View>
            )}

            {/* Estado de Error */}
            {!isLoading && isError && (
                <View style={styles.centerContainer}>
                    <SymbolView
                        name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                        size={48}
                        tintColor={Colors.error}
                    />
                    <Text style={styles.errorTitle}>Ocurrió un error</Text>
                    <Text style={styles.errorDescription}>
                        {errorMessage ?? 'No se pudieron cargar los productos. Intenta nuevamente.'}
                    </Text>
                    <Pressable style={styles.retryButton} onPress={reloadProducts}>
                        <Text style={styles.retryButtonText}>Reintentar</Text>
                    </Pressable>
                </View>
            )}

            {/* Lista o Empty State */}
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
                        const currentStock = item.stockByBranch[branchId] ?? 0;

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
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
    },
    screenSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        gap: 6,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    pressed: {
        opacity: 0.8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        height: 44,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        height: '100%',
    },
    clearSearchButton: {
        padding: 4,
    },
    filterSection: {
        marginBottom: Spacing.xs,
    },
    filterScroll: {
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
    },
    filterGroup: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    filterDivider: {
        width: 1,
        height: 20,
        backgroundColor: Colors.border,
        marginHorizontal: Spacing.sm,
    },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    chipActive: {
        backgroundColor: '#EFF6FF',
        borderColor: Colors.primary,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    chipTextActive: {
        color: Colors.primary,
        fontWeight: '600',
    },
    categorySection: {
        marginBottom: Spacing.xs,
    },
    categoryScroll: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xs,
        paddingVertical: 4,
    },
    categoryPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    categoryPillActive: {
        backgroundColor: Colors.primary,
    },
    categoryPillText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    categoryPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
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
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginTop: Spacing.md,
    },
    errorDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    retryButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm + 2,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});