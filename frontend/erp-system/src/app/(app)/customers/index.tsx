import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

import { CustomerCard } from '@/components/customers/CustomerCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
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
            <PageHeader
                onBack={() => router.back()}
                eyebrow={isInitialLoading
                    ? 'Cargando...'
                    : `${totalElements} ${totalElements === 1 ? 'cliente' : 'clientes'}${isFiltered ? ' encontrados' : ''}`}
                title="Clientes"
                right={canCreate ? (
                    <HeaderButton label="Nuevo" accessibilityLabel="Nuevo cliente" onPress={handleCreateCustomer} />
                ) : undefined}
            />

            {/* Búsqueda */}
            <View style={SharedStyles.pageToolbar}>
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
                <ErrorState message={error} onRetry={refresh} />
            )}

            {!isInitialLoading && !isError && (
                <FlatList
                    data={customers}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={SharedStyles.pageList}
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
    footerLoader: {
        paddingVertical: Spacing.md,
    },
    filters: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
});
