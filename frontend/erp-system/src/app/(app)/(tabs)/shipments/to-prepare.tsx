import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useOrders } from '@/hooks/use-order-queries';
import { SharedStyles } from '@/styles/shared';

export default function ShipmentsToPrepareScreen() {
    const activeBranchId = useActiveBranch()?.id;
    const {
        items: shipments,
        totalElements,
        isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = useOrders({ status: 'TO_PREPARE', deliveryType: 'SHIPPING', branchId: activeBranchId });

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={isInitialLoading
                    ? 'Cargando...'
                    : `${totalElements} ${totalElements === 1 ? 'envío pendiente' : 'envíos pendientes'}`}
                title="A preparar"
            />

            {isInitialLoading ? (
                <LoadingState />
            ) : error && shipments.length === 0 ? (
                <ErrorState message={error} onRetry={refresh} />
            ) : (
                <FlatList
                    data={shipments}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            onPress={() =>
                                router.push({
                                    pathname: '/shipments/[id]',
                                    params: { id: item.id },
                                })
                            }
                        />
                    )}
                    contentContainerStyle={SharedStyles.pageList}
                    ListEmptyComponent={
                        <EmptyState
                            title="No hay envíos a preparar"
                            description="Los envíos pendientes de preparación aparecerán aquí."
                        />
                    }
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
    screen: {
        padding: 0,
    },
});
