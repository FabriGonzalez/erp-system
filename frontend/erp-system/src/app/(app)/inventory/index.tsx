import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { StockAdjustModal } from '@/components/inventory/StockAdjustModal';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useProductStore } from '@/stores/product-store';
import { useStockStore } from '@/stores/stock-store';
import { SharedStyles } from '@/styles/shared';
import { Stock } from '@/types/stock';

export default function InventoryScreen() {
    const token = useAuthStore((state) => state.token);
    const { availableBranches, fetchUserBranches } = useBranchStore();
    const { products, fetchProducts } = useProductStore();
    const { stocks, isLoading, error, fetchStocks, fetchStocksByBranch } = useStockStore();
    const user = useAuthStore((state) => state.user);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [editingStock, setEditingStock] = useState<Stock | null>(null);

    useEffect(() => {
        if (!token) return;
        void fetchStocks(token);
        void fetchProducts(token);
        if (user) void fetchUserBranches(user.id, token);
    }, [fetchProducts, fetchStocks, fetchUserBranches, token, user]);

    async function selectBranch(branchId: string | null) {
        setSelectedBranchId(branchId);
        if (!token) return;
        if (branchId) {
            await fetchStocksByBranch(branchId, token).catch(() => {});
        } else {
            await fetchStocks(token).catch(() => {});
        }
    }

    const filteredStocks = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return stocks;
        return stocks.filter((stock) =>
            stock.productName.toLowerCase().includes(normalized)
            || stock.productVariantSku.toLowerCase().includes(normalized)
            || stock.branchName.toLowerCase().includes(normalized)
        );
    }, [query, stocks]);

    function renderItem({ item }: { item: Stock }) {
        return (
            <Pressable
                style={({ pressed }) => [styles.card, pressed && SharedStyles.pressed]}
                onPress={() => setEditingStock(item)}
            >
                <View style={styles.cardMain}>
                    <Text style={styles.productName}>{item.productName}</Text>
                    <Text style={styles.detail}>SKU: {item.productVariantSku}</Text>
                    <Text style={styles.detail}>Sucursal: {item.branchName}</Text>
                </View>
                <View style={styles.quantityContainer}>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Text style={styles.quantityLabel}>unidades</Text>
                </View>
            </Pressable>
        );
    }

    if (isLoading && stocks.length === 0) return <LoadingState label="Cargando stock..." />;

    return (
        <Screen style={styles.container}>
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
                <Text style={SharedStyles.headerTitle}>Inventario</Text>
                {isLoading ? <ActivityIndicator color={Colors.primary} /> : null}
            </View>

            <View style={styles.toolbar}>
                <AppInput value={query} onChangeText={setQuery} placeholder="Buscar producto, SKU o sucursal" />
                <FlatList
                    horizontal
                    data={[{ id: null, name: 'Todas' }, ...availableBranches]}
                    keyExtractor={(item) => item.id ?? 'all'}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.branchFilters}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => void selectBranch(item.id)}
                            style={[styles.filter, selectedBranchId === item.id && styles.selectedFilter]}
                        >
                            <Text style={[styles.filterText, selectedBranchId === item.id && styles.selectedFilterText]}>
                                {item.name}
                            </Text>
                        </Pressable>
                    )}
                />
            </View>

            {error ? (
                <EmptyState
                    title="No se pudo cargar el inventario"
                    description={error}
                    actionLabel="Reintentar"
                    onAction={() => token && void selectBranch(selectedBranchId)}
                />
            ) : (
                <FlatList
                    data={filteredStocks}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={() => token && void selectBranch(selectedBranchId)}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="Sin stock registrado"
                            description="No hay registros de stock para los filtros seleccionados."
                        />
                    }
                />
            )}

            <StockAdjustModal
                visible={Boolean(editingStock)}
                stock={editingStock}
                branches={availableBranches}
                products={products}
                token={token}
                onClose={() => setEditingStock(null)}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 0 },
    toolbar: { padding: Spacing.lg, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    branchFilters: { gap: Spacing.sm },
    filter: { borderWidth: 1, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    selectedFilter: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    filterText: { color: Colors.textSecondary, fontSize: 13 },
    selectedFilterText: { color: Colors.primary, fontWeight: '600' },
    list: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1 },
    card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: Spacing.lg },
    cardMain: { flex: 1 },
    productName: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    detail: { color: Colors.textSecondary, fontSize: 13, marginTop: 3 },
    quantityContainer: { alignItems: 'flex-end', marginLeft: Spacing.md },
    quantity: { color: Colors.primary, fontSize: 24, fontWeight: '700' },
    quantityLabel: { color: Colors.textSecondary, fontSize: 11 },
});
