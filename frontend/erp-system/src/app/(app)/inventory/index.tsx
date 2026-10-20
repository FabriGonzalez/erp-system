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

import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useBranchStocks } from '@/hooks/use-stock-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { Stock } from '@/types/stock';
import { STOCK_MOVEMENT_READ_PERMISSIONS, hasAnyPermission } from '@/utils/permissions';

export default function InventoryScreen() {
    const user = useAuthStore((state) => state.user);
    const activeBranch = useActiveBranch();
    // Se entra con cualquier permiso de lectura de stock; el detalle (historial y ajuste)
    // pide los permisos de movimientos, que incluyen AJUSTAR_STOCK.
    const canOpenDetail = hasAnyPermission(user, STOCK_MOVEMENT_READ_PERMISSIONS);
    const [query, setQuery] = useState('');
    // Cada sucursal y búsqueda tiene su caché: una respuesta de la sucursal anterior no se mezcla.
    const {
        items: stocks,
        isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = useBranchStocks({ branchId: activeBranch?.id, q: query });

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
        if (isInitialLoading) return <LoadingState label="Cargando stock..." />;
        if (error && stocks.length === 0) {
            return (
                <EmptyState
                    title="No se pudo cargar el inventario"
                    description={error}
                    actionLabel="Reintentar"
                    onAction={refresh}
                />
            );
        }
        return (
            <FlatList
                data={stocks}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                ListFooterComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
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
                {isRefreshing ? <ActivityIndicator color={Colors.primary} /> : null}
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
