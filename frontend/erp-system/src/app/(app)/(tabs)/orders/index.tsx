import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
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
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { OrderCard } from '@/components/OrderCard';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderStore } from '@/stores/order-store';

import {
    DELIVERY_TYPE_LABELS,
    ORDER_STATUS_LABELS,
    OrderDeliveryFilter,
    OrderStatusFilter,
} from '@/types/order';

const STATUS_FILTERS: {
    label: string;
    value: OrderStatusFilter;
}[] = [
        {
            label: 'Todos',
            value: 'ALL',
        },
        {
            label: ORDER_STATUS_LABELS.DRAFT,
            value: 'DRAFT',
        },
        {
            label: ORDER_STATUS_LABELS.CONFIRMED,
            value: 'CONFIRMED',
        },
        {
            label: ORDER_STATUS_LABELS.IN_PREPARATION,
            value: 'IN_PREPARATION',
        },
        {
            label: ORDER_STATUS_LABELS.READY_TO_SHIP,
            value: 'READY_TO_SHIP',
        },
        {
            label: ORDER_STATUS_LABELS.SHIPPED,
            value: 'SHIPPED',
        },
        {
            label: ORDER_STATUS_LABELS.DELIVERED,
            value: 'DELIVERED',
        },
        {
            label: ORDER_STATUS_LABELS.CANCELLED,
            value: 'CANCELLED',
        },
    ];

const DELIVERY_FILTERS: {
    label: string;
    value: OrderDeliveryFilter;
}[] = [
        {
            label: 'Todos',
            value: 'ALL',
        },
        {
            label: DELIVERY_TYPE_LABELS.LOCAL_PICKUP,
            value: 'LOCAL_PICKUP',
        },
        {
            label: DELIVERY_TYPE_LABELS.SHIPPING,
            value: 'SHIPPING',
        },
    ];

export default function OrdersScreen() {
    const user = useAuthStore((state) => state.user);

    const activeBranch = useBranchStore(
        (state) => state.activeBranch
    );

    const orders = useOrderStore((state) => state.orders);
    const searchQuery = useOrderStore(
        (state) => state.searchQuery
    );
    const statusFilter = useOrderStore(
        (state) => state.statusFilter
    );
    const deliveryTypeFilter = useOrderStore(
        (state) => state.deliveryTypeFilter
    );

    const isLoading = useOrderStore(
        (state) => state.isLoading
    );
    const isError = useOrderStore(
        (state) => state.isError
    );
    const errorMessage = useOrderStore(
        (state) => state.errorMessage
    );

    const setSearchQuery = useOrderStore(
        (state) => state.setSearchQuery
    );
    const setStatusFilter = useOrderStore(
        (state) => state.setStatusFilter
    );
    const setDeliveryTypeFilter = useOrderStore(
        (state) => state.setDeliveryTypeFilter
    );
    const resetFilters = useOrderStore(
        (state) => state.resetFilters
    );
    const reloadOrders = useOrderStore(
        (state) => state.reloadOrders
    );

    const canCreate =
        user?.role === 'ADMINISTRATOR' ||
        Boolean(
            user?.permissions?.includes('ORDERS_CREATE')
        );

    const filteredOrders = useMemo(() => {
        const normalizedQuery = searchQuery
            .trim()
            .toLowerCase();

        return orders.filter((order) => {
            if (normalizedQuery) {
                const matchesOrderNumber =
                    order.orderNumber
                        .toLowerCase()
                        .includes(normalizedQuery);

                const matchesCustomer =
                    order.customerName
                        .toLowerCase()
                        .includes(normalizedQuery);

                if (
                    !matchesOrderNumber &&
                    !matchesCustomer
                ) {
                    return false;
                }
            }

            if (
                statusFilter !== 'ALL' &&
                order.status !== statusFilter
            ) {
                return false;
            }

            if (
                deliveryTypeFilter !== 'ALL' &&
                order.deliveryType !== deliveryTypeFilter
            ) {
                return false;
            }

            return true;
        });
    }, [
        orders,
        searchQuery,
        statusFilter,
        deliveryTypeFilter,
    ]);

    const hasActiveFilters =
        Boolean(searchQuery.trim()) ||
        statusFilter !== 'ALL' ||
        deliveryTypeFilter !== 'ALL';

    function handleCreateOrder() {
        router.push({
            pathname: '/(app)/(tabs)/orders/new',
        });
    }

    function handleViewOrder(id: string) {
        router.push({
            pathname: '/(app)/(tabs)/orders/[id]',
            params: {
                id,
            },
        });
    }

    function handleClearFilters() {
        resetFilters();
    }

    function handleRetry() {
        reloadOrders();
    }

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>
                        Pedidos
                    </Text>

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
                            pressed && styles.pressed,
                        ]}
                    >
                        <SymbolView
                            name={{
                                ios: 'plus',
                                android: 'add',
                                web: 'add',
                            }}
                            size={22}
                            tintColor="#FFFFFF"
                        />
                    </Pressable>
                )}
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <SymbolView
                    name={{
                        ios: 'magnifyingglass',
                        android: 'search',
                        web: 'search',
                    }}
                    size={20}
                    tintColor={Colors.textSecondary}
                />

                <AppInput
                    style={styles.searchInput}
                    placeholder="Buscar por pedido o cliente"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />

                {searchQuery.length > 0 && (
                    <Pressable
                        onPress={() => setSearchQuery('')}
                        hitSlop={8}
                    >
                        <SymbolView
                            name={{
                                ios: 'xmark.circle.fill',
                                android: 'cancel',
                                web: 'cancel',
                            }}
                            size={18}
                            tintColor={Colors.textSecondary}
                        />
                    </Pressable>
                )}
            </View>

            {/* Status Filters */}
            <View style={styles.filtersSection}>
                <Text style={styles.filterTitle}>
                    Estado
                </Text>

                <FlatList
                    horizontal
                    data={STATUS_FILTERS}
                    keyExtractor={(item) => item.value}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                        styles.filtersContent
                    }
                    renderItem={({ item }) => {
                        const selected =
                            statusFilter === item.value;

                        return (
                            <Pressable
                                onPress={() =>
                                    setStatusFilter(
                                        item.value
                                    )
                                }
                                style={({ pressed }) => [
                                    styles.filterChip,
                                    selected &&
                                    styles.filterChipSelected,
                                    pressed &&
                                    styles.pressed,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        selected &&
                                        styles.filterChipTextSelected,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>

            {/* Delivery Filters */}
            <View style={styles.filtersSection}>
                <Text style={styles.filterTitle}>
                    Entrega
                </Text>

                <FlatList
                    horizontal
                    data={DELIVERY_FILTERS}
                    keyExtractor={(item) => item.value}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                        styles.filtersContent
                    }
                    renderItem={({ item }) => {
                        const selected =
                            deliveryTypeFilter ===
                            item.value;

                        return (
                            <Pressable
                                onPress={() =>
                                    setDeliveryTypeFilter(
                                        item.value
                                    )
                                }
                                style={({ pressed }) => [
                                    styles.filterChip,
                                    selected &&
                                    styles.filterChipSelected,
                                    pressed &&
                                    styles.pressed,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        selected &&
                                        styles.filterChipTextSelected,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>

            {/* Error */}
            {isError && (
                <View style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                        <SymbolView
                            name={{
                                ios: 'exclamationmark.triangle.fill',
                                android: 'warning',
                                web: 'warning',
                            }}
                            size={20}
                            tintColor={Colors.error}
                        />
                    </View>

                    <View style={styles.errorContent}>
                        <Text style={styles.errorTitle}>
                            No pudimos cargar los pedidos
                        </Text>

                        {errorMessage && (
                            <Text style={styles.errorMessage}>
                                {errorMessage}
                            </Text>
                        )}
                    </View>

                    <Pressable
                        onPress={handleRetry}
                        style={({ pressed }) => [
                            styles.retryButton,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text style={styles.retryText}>
                            Reintentar
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* Loading */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size="large"
                        color={Colors.primary}
                    />

                    <Text style={styles.loadingText}>
                        Cargando pedidos...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            onPress={() =>
                                handleViewOrder(item.id)
                            }
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.listContent,
                        filteredOrders.length === 0 &&
                        styles.emptyListContent,
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
    screen: {
        flex: 1,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },

    headerTextContainer: {
        flex: 1,
        marginRight: Spacing.md,
    },

    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },

    subtitle: {
        marginTop: 4,
        fontSize: 14,
        color: Colors.textSecondary,
    },

    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    searchInput: {
        flex: 1,
        justifyContent: 'center',
        marginLeft: Spacing.sm,
        minHeight: 46,
    },

    searchPlaceholder: {
        fontSize: 15,
        color: Colors.textSecondary,
    },

    searchText: {
        color: Colors.text,
    },

    filtersSection: {
        marginTop: Spacing.md,
    },

    filterTitle: {
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.xs,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },

    filtersContent: {
        paddingHorizontal: Spacing.md,
        gap: Spacing.xs,
    },

    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    filterChipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },

    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
    },

    filterChipTextSelected: {
        color: '#FFFFFF',
    },

    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },

    errorIcon: {
        marginRight: Spacing.sm,
    },

    errorContent: {
        flex: 1,
    },

    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.error,
    },

    errorMessage: {
        marginTop: 2,
        fontSize: 12,
        color: Colors.textSecondary,
    },

    retryButton: {
        marginLeft: Spacing.sm,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },

    retryText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },

    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },

    loadingText: {
        marginTop: Spacing.sm,
        fontSize: 14,
        color: Colors.textSecondary,
    },

    listContent: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xl,
        gap: Spacing.sm,
    },

    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },

    pressed: {
        opacity: 0.7,
    },
});
