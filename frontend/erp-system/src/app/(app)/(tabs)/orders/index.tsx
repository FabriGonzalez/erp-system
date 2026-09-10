import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { OrderCard } from '@/components/orders/OrderCard';
import { OrdersErrorState } from '@/components/orders/OrdersErrorState';
import { OrdersFilterList } from '@/components/orders/OrdersFilterList';
import { OrdersSearchBar } from '@/components/orders/OrdersSearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderStore } from '@/stores/order-store';


export default function OrdersScreen() {
    const user = useAuthStore((state) => state.user);

    const activeBranch = useBranchStore((state) => state.activeBranch);

    const orders = useOrderStore((state) => state.orders);
    const searchQuery = useOrderStore((state) => state.searchQuery);
    const statusFilter = useOrderStore((state) => state.statusFilter);
    const deliveryTypeFilter = useOrderStore((state) => state.deliveryTypeFilter);

    const isLoading = useOrderStore((state) => state.isLoading);
    const isError = useOrderStore((state) => state.isError);
    const errorMessage = useOrderStore((state) => state.errorMessage);

    const setSearchQuery = useOrderStore((state) => state.setSearchQuery);
    const setStatusFilter = useOrderStore((state) => state.setStatusFilter);
    const setDeliveryTypeFilter = useOrderStore((state) => state.setDeliveryTypeFilter);
    const resetFilters = useOrderStore((state) => state.resetFilters);
    const reloadOrders = useOrderStore((state) => state.reloadOrders);

    const canCreate =
        user?.role === 'ADMINISTRATOR' ||
        Boolean(user?.permissions?.includes('ORDERS_CREATE'));

    const filteredOrders = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return orders.filter((order) => {
            if (normalizedQuery) {
                const matchesOrderNumber = order.orderNumber.toLowerCase().includes(normalizedQuery);
                const matchesCustomer = order.customerName.toLowerCase().includes(normalizedQuery);

                if (!matchesOrderNumber && !matchesCustomer) {
                    return false;
                }
            }

            if (statusFilter !== 'ALL' && order.status !== statusFilter) {
                return false;
            }

            if (deliveryTypeFilter !== 'ALL' && order.deliveryType !== deliveryTypeFilter) {
                return false;
            }

            if (activeBranch && order.branchId !== activeBranch.id) {
                return false;
            }

            return true;
        });
    }, [orders, searchQuery, statusFilter, deliveryTypeFilter, activeBranch]);

    const hasActiveFilters =
        Boolean(searchQuery.trim()) ||
        statusFilter !== 'ALL' ||
        deliveryTypeFilter !== 'ALL';

    function handleCreateOrder() {
        router.push({ pathname: '/orders/new' });
    }

    function handleViewOrder(id: string) {
        router.push({
            pathname: '/orders/[id]',
            params: { id },
        });
    }

    function handleClearFilters() {
        resetFilters();
    }

    function handleRetry() {
        reloadOrders();
    }

    return (
        <Screen>
            <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Pedidos</Text>

                    <Text style={styles.subtitle}>
                        {activeBranch
                            ? `Sucursal: ${activeBranch.name}`
                            : 'Todos los pedidos'}
                    </Text>
                </View>

                {canCreate && (
                    <Pressable
                        onPress={handleCreateOrder}
                        style={({ pressed }) => [
                            styles.addButton,
                            pressed && SharedStyles.pressed,
                        ]}
                    >
                        <SymbolView
                            name={{
                                ios: 'plus',
                                android: 'add',
                                web: 'add',
                            }}
                            size={18}
                            tintColor={Colors.white}
                        />

                        <Text style={styles.addButtonText}>Nuevo</Text>
                    </Pressable>
                )}
            </View>

            <OrdersSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            <OrdersFilterList
                statusFilter={statusFilter}
                deliveryTypeFilter={deliveryTypeFilter}
                onStatusChange={setStatusFilter}
                onDeliveryChange={setDeliveryTypeFilter}
            />

            {isError && (
                <OrdersErrorState
                    errorMessage={errorMessage}
                    onRetry={handleRetry}
                />
            )}

            {isLoading ? (
                <LoadingState label="Cargando pedidos..." />
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            onPress={() => handleViewOrder(item.id)}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.listContent,
                        filteredOrders.length === 0 && styles.emptyListContent,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={reloadOrders}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title={
                                hasActiveFilters
                                    ? 'No encontramos pedidos'
                                    : 'No hay pedidos'
                            }
                            description={
                                hasActiveFilters
                                    ? 'Probá cambiar o limpiar los filtros para ver otros pedidos.'
                                    : canCreate
                                        ? 'Todavía no hay pedidos registrados. Creá el primero para comenzar.'
                                        : 'Todavía no hay pedidos registrados.'
                            }
                            actionLabel={
                                hasActiveFilters
                                    ? 'Limpiar filtros'
                                    : canCreate
                                        ? 'Crear pedido'
                                        : undefined
                            }
                            onAction={
                                hasActiveFilters
                                    ? handleClearFilters
                                    : canCreate
                                        ? handleCreateOrder
                                        : undefined
                            }
                        />
                    }
                />
            )}
        </Screen>
    );
}
const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },

    headerTextContainer: {
        flex: 1,
        marginRight: Spacing.md,
    },

    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
    },

    subtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginTop: 2,
    },

    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        gap: 6,
    },

    addButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },

    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        gap: Spacing.sm,
    },

    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
});