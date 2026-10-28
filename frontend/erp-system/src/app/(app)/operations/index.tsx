import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useOrders } from '@/hooks/use-order-queries';
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
    const activeBranch = useActiveBranch();
    const [filter, setFilter] = useState<OperationsFilter>('ALL');
    const {
        items: orders,
        isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = useOrders({ branchId: activeBranch?.id, deliveryType: DELIVERY_TYPE_BY_FILTER[filter] });

    function handleOpen(order: Order) {
        router.push({ pathname: '/operations/[id]', params: { id: order.id } });
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={activeBranch?.name}
                title="Operaciones"
            />

            <View style={[SharedStyles.pageToolbar, styles.filters]}>
                {FILTERS.map((item) => (
                    <FilterChip
                        key={item.value}
                        label={item.label}
                        selected={filter === item.value}
                        onPress={() => setFilter(item.value)}
                    />
                ))}
            </View>

            {isInitialLoading ? (
                <LoadingState />
            ) : error && orders.length === 0 ? (
                <ErrorState message={error} onRetry={refresh} />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <OrderCard order={item} onPress={() => handleOpen(item)} />}
                    contentContainerStyle={SharedStyles.pageList}
                    ListEmptyComponent={<EmptyState title="No hay operaciones" description="No encontramos ventas ni envíos para este filtro." />}
                    ListFooterComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0 },
    filters: { flexDirection: 'row', gap: Spacing.xs },
});
