import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { DeliveryType, Order } from '@/types/order';

type OperationsFilter = 'ALL' | 'SALES' | 'SHIPMENTS';

const FILTERS: { label: string; value: OperationsFilter }[] = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Ventas', value: 'SALES' },
    { label: 'Envíos', value: 'SHIPMENTS' },
];

const DELIVERY_TYPE_BY_FILTER: Record<OperationsFilter, DeliveryType | undefined> = {
    ALL: undefined,
    SALES: 'LOCAL_PICKUP',
    SHIPMENTS: 'SHIPPING',
};

export default function OperationsScreen() {
    const token = useAuthStore((state) => state.token);
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const orders = useOrderStore((state) => state.orders);
    const isLoading = useOrderStore((state) => state.isLoading);
    const isLoadingMore = useOrderStore((state) => state.isLoadingMore);
    const isError = useOrderStore((state) => state.isError);
    const errorMessage = useOrderStore((state) => state.errorMessage);
    const fetchOrders = useOrderStore((state) => state.fetchOrders);
    const [filter, setFilter] = useState<OperationsFilter>('ALL');

    const activeBranchId = activeBranch?.id;

    const loadOrders = useCallback(() => {
        if (!token) return;

        fetchOrders(
            {
                branchId: activeBranchId,
                deliveryType: DELIVERY_TYPE_BY_FILTER[filter],
            },
            token,
        ).catch(() => {});
    }, [token, fetchOrders, activeBranchId, filter]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    function handleLoadMore() {
        if (!token) return;

        fetchOrders(
            {
                branchId: activeBranchId,
                deliveryType: DELIVERY_TYPE_BY_FILTER[filter],
            },
            token,
            { append: true },
        ).catch(() => {});
    }

    function handleOpen(order: Order) {
        router.push({ pathname: '/operations/[id]', params: { id: order.id } });
    }

    return (
        <Screen style={styles.screen}>
            <View style={styles.topBar}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={styles.screenTitle}>Operaciones</Text>
            </View>

            <View style={SharedStyles.content}>
                <View style={styles.filters}>
                    {FILTERS.map((item) => (
                        <Pressable
                            key={item.value}
                            style={[styles.filter, filter === item.value && styles.filterActive]}
                            onPress={() => setFilter(item.value)}
                        >
                            <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {isLoading && orders.length === 0 ? (
                    <LoadingState />
                ) : isError && orders.length === 0 ? (
                    <ErrorState
                        message={errorMessage ?? 'No se pudieron cargar las operaciones.'}
                        onRetry={loadOrders}
                    />
                ) : (
                    <FlatList
                        data={orders}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <OrderCard order={item} onPress={() => handleOpen(item)} />}
                        contentContainerStyle={orders.length === 0 ? SharedStyles.listEmpty : styles.list}
                        ListEmptyComponent={<EmptyState title="No hay operaciones" description="No encontramos ventas ni envíos para este filtro." />}
                        ListFooterComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
                        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadOrders} />}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.4}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    backButton: { padding: Spacing.xs, borderRadius: 8, marginRight: Spacing.sm },
    screenTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
    filters: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    filter: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterText: { color: Colors.textSecondary, fontWeight: '600' },
    filterTextActive: { color: Colors.white },
    list: { gap: Spacing.sm, paddingBottom: Spacing.lg },
});
