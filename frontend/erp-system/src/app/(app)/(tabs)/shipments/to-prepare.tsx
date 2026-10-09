import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect } from 'react';
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

export default function ShipmentsToPrepareScreen() {
    const token = useAuthStore((state) => state.token);
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const orders = useOrderStore((state) => state.orders);
    const totalElements = useOrderStore((state) => state.totalElements);
    const isLoading = useOrderStore((state) => state.isLoading);
    const isLoadingMore = useOrderStore((state) => state.isLoadingMore);
    const isError = useOrderStore((state) => state.isError);
    const errorMessage = useOrderStore((state) => state.errorMessage);
    const fetchOrders = useOrderStore((state) => state.fetchOrders);

    const activeBranchId = activeBranch?.id;

    // Una orden despachada o cancelada deja de estar en TO_PREPARE aunque el
    // store la conserve de una carga anterior.
    const shipments = orders.filter(
        (order) =>
            order.deliveryType === 'SHIPPING' &&
            order.status === 'TO_PREPARE' &&
            (!activeBranchId || order.branchId === activeBranchId),
    );

    const loadShipments = useCallback(() => {
        if (!token) return;

        fetchOrders(
            {
                status: 'TO_PREPARE',
                deliveryType: 'SHIPPING',
                branchId: activeBranchId,
            },
            token,
        ).catch(() => {});
    }, [token, fetchOrders, activeBranchId]);

    useEffect(() => {
        loadShipments();
    }, [loadShipments]);

    function handleLoadMore() {
        if (!token) return;

        fetchOrders(
            {
                status: 'TO_PREPARE',
                deliveryType: 'SHIPPING',
                branchId: activeBranchId,
            },
            token,
            { append: true },
        ).catch(() => {});
    }

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        SharedStyles.backButton,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <SymbolView
                        name={{
                            ios: 'chevron.left',
                            android: 'arrow_back',
                            web: 'arrow_back',
                        }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>

                <Text style={SharedStyles.headerTitle}>
                    Envíos a preparar
                </Text>

                <View style={SharedStyles.headerSpacer} />
            </View>

            <View style={SharedStyles.content}>
                {isLoading && shipments.length === 0 ? (
                    <LoadingState />
                ) : isError && shipments.length === 0 ? (
                    <ErrorState
                        message={errorMessage ?? 'No se pudieron cargar los envíos.'}
                        onRetry={loadShipments}
                    />
                ) : (
                    <>
                        <Text style={styles.resultsText}>
                            {totalElements}{' '}
                            {totalElements === 1
                                ? 'envío pendiente'
                                : 'envíos pendientes'}
                        </Text>

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
                            contentContainerStyle={
                                shipments.length === 0
                                    ? SharedStyles.listEmpty
                                    : styles.list
                            }
                            ListEmptyComponent={
                                <EmptyState
                                    title="No hay envíos a preparar"
                                    description="Los envíos pendientes de preparación aparecerán aquí."
                                />
                            }
                            ListFooterComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
                            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadShipments} />}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.4}
                            showsVerticalScrollIndicator={false}
                        />
                    </>
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },

    resultsText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
        marginBottom: Spacing.sm,
    },

    list: {
        gap: Spacing.sm,
        paddingBottom: Spacing.lg,
    },
});
