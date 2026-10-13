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

import { CustomerCard } from '@/components/customers/CustomerCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterChip } from '@/components/ui/FilterChip';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { CustomerStatusFilter, useCustomerList } from '@/hooks/use-customer-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { hasPermission } from '@/utils/permissions';

const STATUS_FILTERS: { value: CustomerStatusFilter; label: string }[] = [
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'all', label: 'Todos' },
];

export default function CustomersScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState<CustomerStatusFilter>('active');
    // El backend deja crear clientes a quien los administra o crea pedidos.
    const canCreate = useAuthStore((state) =>
        hasPermission(state.user, 'ADMINISTRAR_CLIENTES') || hasPermission(state.user, 'CREAR_PEDIDOS'));
    const {
        customers,
        totalElements,
        isRefreshing,
        isInitialLoading,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = useCustomerList({ query: searchQuery, status });
    const isError = Boolean(error) && customers.length === 0;
    const isFiltered = Boolean(searchQuery.trim()) || status !== 'active';

    function handleCreateCustomer() {
        router.push('/customers/new');
    }

    function handleViewCustomer(id: string) {
        router.push({
            pathname: '/customers/[id]',
            params: { id },
        });
    }

    return (
        <Screen style={styles.screen}>
            {/* Header / Top Bar */}
            <View style={[SharedStyles.topBar, SharedStyles.topBarElevated]}>
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

                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle}>Clientes</Text>
                    <Text style={styles.screenSubtitle}>
                        {isInitialLoading
                            ? 'Cargando...'
                            : `${totalElements} ${totalElements === 1 ? 'cliente' : 'clientes'}${isFiltered ? ' encontrados' : ''}`}
                    </Text>
                </View>

                {canCreate ? (
                    <Pressable
                        style={({ pressed }) => [
                            styles.createButton,
                            pressed && SharedStyles.pressed,
                        ]}
                        onPress={handleCreateCustomer}
                    >
                        <SymbolView
                            name={{ ios: 'plus', android: 'add', web: 'add' }}
                            size={18}
                            tintColor={Colors.white}
                        />
                        <Text style={styles.createButtonText}>Nuevo</Text>
                    </Pressable>
                ) : null}
            </View>

            {/* Búsqueda */}
            <View style={styles.searchContainer}>
                <AppInput
                    placeholder="Buscar por nombre, teléfono, email o documento..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <View style={styles.filters}>
                    {STATUS_FILTERS.map((filter) => (
                        <FilterChip
                            key={filter.value}
                            label={filter.label}
                            selected={status === filter.value}
                            onPress={() => setStatus(filter.value)}
                        />
                    ))}
                </View>
            </View>

            {isInitialLoading && (
                <LoadingState label="Cargando clientes..." />
            )}

            {!isInitialLoading && isError && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retryButton} onPress={refresh}>
                        <Text style={styles.retryButtonText}>Reintentar</Text>
                    </Pressable>
                </View>
            )}

            {!isInitialLoading && !isError && (
                <FlatList
                    data={customers}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isLoadingMore ? (
                            <ActivityIndicator style={styles.footerLoader} color={Colors.primary} />
                        ) : null
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={refresh}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        isFiltered ? (
                            <EmptyState
                                title="No se encontraron clientes"
                                description="Probá con otro término o con otro filtro."
                                iconName={{ ios: 'person.2', android: 'group', web: 'group' }}
                                actionLabel="Limpiar filtros"
                                onAction={() => {
                                    setSearchQuery('');
                                    setStatus('active');
                                }}
                            />
                        ) : (
                            <EmptyState
                                title="No hay clientes registrados"
                                description="Creá tu primer cliente para comenzar a registrar sus datos y direcciones."
                                iconName={{ ios: 'person.2', android: 'group', web: 'group' }}
                                actionLabel={canCreate ? 'Nuevo cliente' : undefined}
                                onAction={canCreate ? handleCreateCustomer : undefined}
                            />
                        )
                    }
                    renderItem={({ item }) => (
                        <CustomerCard
                            customer={item}
                            onPress={() => handleViewCustomer(item.id)}
                        />
                    )}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
        marginRight: Spacing.xs,
    },
    titleContainer: {
        flex: 1,
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
    },
    screenSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        gap: 6,
    },
    createButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    searchContainer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    listContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    footerLoader: {
        paddingVertical: Spacing.md,
    },
    filters: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    errorContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    errorText: {
        color: Colors.error,
        fontSize: 14,
        marginBottom: Spacing.md,
    },
    retryButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
    },
    retryButtonText: {
        color: Colors.white,
        fontWeight: '600',
    },
});
