import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

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
import { STOCK_MOVEMENT_READ_PERMISSIONS, hasAnyPermission } from '@/utils/permissions';

export default function InventoryScreen() {
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const fetchUserBranches = useBranchStore((state) => state.fetchUserBranches);
    const hasFetchedUserBranches = useBranchStore((state) => state.hasFetchedUserBranches);
    // El modal de ajuste del detalle usa el catálogo y las sucursales cargados acá.
    const fetchProducts = useProductStore((state) => state.fetchProducts);
    const { stocks, isLoading, error, fetchStocksByBranch } = useStockStore();
    // Se entra con cualquier permiso de lectura de stock; el detalle (historial y ajuste)
    // pide los permisos de movimientos, que incluyen AJUSTAR_STOCK.
    const canOpenDetail = hasAnyPermission(user, STOCK_MOVEMENT_READ_PERMISSIONS);
    const [query, setQuery] = useState('');
    const activeBranchId = activeBranch?.id ?? null;

    useEffect(() => {
        if (!token) return;
        void fetchProducts(token);
        if (user && !hasFetchedUserBranches) {
            void fetchUserBranches(user.id, token);
        }
    }, [fetchProducts, fetchUserBranches, hasFetchedUserBranches, token, user]);

    const loadStocks = useCallback(() => {
        if (!token || !activeBranchId) return;
        // El error queda en el store y se muestra abajo.
        fetchStocksByBranch(activeBranchId, token).catch(() => undefined);
    }, [activeBranchId, fetchStocksByBranch, token]);

    useEffect(() => {
        loadStocks();
    }, [loadStocks]);

    const filteredStocks = useMemo(() => {
        // Si la sucursal activa cambió con una carga anterior en curso, su respuesta no se muestra.
        const branchStocks = stocks.filter((stock) => stock.branchId === activeBranchId);
        const normalized = query.trim().toLowerCase();
        if (!normalized) return branchStocks;
        return branchStocks.filter((stock) =>
            stock.productName.toLowerCase().includes(normalized)
            || stock.productVariantSku.toLowerCase().includes(normalized)
        );
    }, [activeBranchId, query, stocks]);

    function renderItem({ item }: { item: Stock }) {
        return (
            <Pressable
                style={({ pressed }) => [styles.card, canOpenDetail && pressed && SharedStyles.pressed]}
                onPress={() => router.push({ pathname: '/inventory/[stockId]', params: { stockId: item.id } })}
                disabled={!canOpenDetail}
            >
                <View style={styles.cardMain}>
                    <Text style={styles.productName}>{item.productName}</Text>
                    <Text style={styles.detail}>SKU: {item.productVariantSku}</Text>
                </View>
                <View style={styles.quantityContainer}>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Text style={styles.quantityLabel}>unidades</Text>
                </View>
            </Pressable>
        );
    }

    function renderBody() {
        if (!activeBranch) {
            return (
                <EmptyState
                    title="Sin sucursal activa"
                    description="El inventario muestra el stock de la sucursal activa. Elegila en Más → Sucursal activa."
                />
            );
        }
        if (isLoading && filteredStocks.length === 0) return <LoadingState label="Cargando stock..." />;
        if (error) {
            return (
                <EmptyState
                    title="No se pudo cargar el inventario"
                    description={error}
                    actionLabel="Reintentar"
                    onAction={loadStocks}
                />
            );
        }
        return (
            <FlatList
                data={filteredStocks}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={loadStocks} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <EmptyState
                        title="Sin stock registrado"
                        description={query.trim()
                            ? 'Ningún producto coincide con la búsqueda.'
                            : `${activeBranch.name} no tiene registros de stock.`}
                    />
                }
            />
        );
    }

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

            {activeBranch ? (
                <View style={styles.toolbar}>
                    <Text style={styles.branchLabel}>Sucursal: {activeBranch.name}</Text>
                    <AppInput value={query} onChangeText={setQuery} placeholder="Buscar producto o SKU" />
                </View>
            ) : null}

            {renderBody()}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 0 },
    toolbar: { padding: Spacing.lg, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    branchLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
    list: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1 },
    card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: Spacing.lg },
    cardMain: { flex: 1 },
    productName: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    detail: { color: Colors.textSecondary, fontSize: 13, marginTop: 3 },
    quantityContainer: { alignItems: 'flex-end', marginLeft: Spacing.md },
    quantity: { color: Colors.primary, fontSize: 24, fontWeight: '700' },
    quantityLabel: { color: Colors.textSecondary, fontSize: 11 },
});
