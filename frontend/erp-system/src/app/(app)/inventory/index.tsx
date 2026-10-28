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

import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useBranchStocks } from '@/hooks/use-stock-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { Stock } from '@/types/stock';
import { STOCK_MOVEMENT_READ_PERMISSIONS, hasAnyPermission } from '@/utils/permissions';
import { stockPill } from '@/utils/status';

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
        const pill = stockPill(item.quantity);
        return (
            <Pressable
                style={({ pressed }) => [
                    SharedStyles.card,
                    SharedStyles.listItem,
                    canOpenDetail && pressed && SharedStyles.listItemPressed,
                ]}
                onPress={() => router.push({ pathname: '/inventory/[stockId]', params: { stockId: item.id } })}
                disabled={!canOpenDetail}
                accessibilityRole={canOpenDetail ? 'button' : undefined}
            >
                <IconBadge
                    icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
                    tone="teal"
                    size={44}
                />
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle} numberOfLines={2}>{item.productName}</Text>
                    <Text style={SharedStyles.listItemMeta} numberOfLines={1}>SKU {item.productVariantSku}</Text>
                </View>
                <StatusPill label={pill.label} tone={pill.tone} />
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
                contentContainerStyle={SharedStyles.pageList}
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
            <PageHeader
                onBack={() => router.back()}
                eyebrow={activeBranch ? activeBranch.name : undefined}
                title="Inventario"
            />

            {activeBranch ? (
                <View style={SharedStyles.pageToolbar}>
                    <AppInput value={query} onChangeText={setQuery} placeholder="Buscar producto, SKU o código" />
                </View>
            ) : null}

            {renderBody()}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 0 },
});
