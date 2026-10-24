import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PromotionStatusBadge } from '@/components/promotions/PromotionStatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { usePromotions } from '@/hooks/use-promotion-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { Promotion, PROMOTION_STATUS_LABELS, PromotionStatus } from '@/types/promotion';
import { formatCurrency, formatDay } from '@/utils/format';
import { hasPermission } from '@/utils/permissions';

const STATUS_FILTERS: (PromotionStatus | undefined)[] = [undefined, 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'INACTIVE'];

export default function PromotionsScreen() {
    const canManage = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRECIOS'));
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<PromotionStatus | undefined>(undefined);
    const list = usePromotions({ q: query, status }, { enabled: canManage });

    if (!canManage) {
        return (
            <NotFound
                headerTitle="Promociones"
                title="Sin permisos"
                description='Administrar promos requiere el permiso "Administrar precios".'
            />
        );
    }

    function renderItem({ item }: { item: Promotion }) {
        // El ahorro depende de las variantes que se elijan: se muestra el mínimo.
        const savings = item.regularPriceMin - item.price;
        const unitsLabel = item.items
            .map((component) => `${component.quantity}× ${component.productName}`)
            .join(' + ');

        return (
            <Pressable
                style={({ pressed }) => [styles.card, item.status !== 'ACTIVE' && styles.dimmedCard, pressed && SharedStyles.pressed]}
                onPress={() => router.push({ pathname: '/promotions/[id]', params: { id: item.id } })}
            >
                <View style={styles.cardTopRow}>
                    <Text style={styles.promoName} numberOfLines={1}>{item.name}</Text>
                    <PromotionStatusBadge status={item.status} />
                </View>
                <Text style={styles.secondaryText} numberOfLines={2}>{unitsLabel}</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                    {savings > 0 ? (
                        <Text style={styles.savings}>Ahorro desde {formatCurrency(savings)}</Text>
                    ) : null}
                </View>
                <Text style={styles.secondaryText}>
                    Del {formatDay(item.startDate)} al {formatDay(item.endDate)}
                </Text>
            </Pressable>
        );
    }

    return (
        <Screen style={styles.screen}>
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
                    <Text style={styles.screenTitle}>Promociones</Text>
                    <Text style={styles.screenSubtitle}>
                        {list.isInitialLoading
                            ? 'Cargando...'
                            : `${list.totalElements} ${list.totalElements === 1 ? 'promo' : 'promos'}`}
                    </Text>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.createButton, pressed && SharedStyles.pressed]}
                    onPress={() => router.push('/promotions/new')}
                >
                    <SymbolView
                        name={{ ios: 'plus', android: 'add', web: 'add' }}
                        size={18}
                        tintColor={Colors.white}
                    />
                    <Text style={styles.createButtonText}>Nueva</Text>
                </Pressable>
            </View>

            <View style={styles.filters}>
                <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar promo por nombre..." />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {STATUS_FILTERS.map((option) => (
                        <FilterChip
                            key={option ?? 'ALL'}
                            label={option ? PROMOTION_STATUS_LABELS[option] : 'Todas'}
                            selected={status === option}
                            onPress={() => setStatus(option)}
                        />
                    ))}
                </ScrollView>
            </View>

            {list.isInitialLoading ? (
                <LoadingState label="Cargando promos..." />
            ) : list.error && list.items.length === 0 ? (
                <ErrorState message={list.error} onRetry={list.refresh} />
            ) : (
                <FlatList
                    data={list.items}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={list.items.length === 0 ? SharedStyles.listEmpty : styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onEndReached={list.loadMore}
                    onEndReachedThreshold={0.4}
                    refreshControl={
                        <RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="Sin promos"
                            description={query.trim() || status
                                ? 'No hay promos con ese filtro.'
                                : 'Armá una promo con varios productos a un precio fijo y vendela desde Ventas o Envíos.'}
                        />
                    }
                    ListFooterComponent={list.isLoadingMore ? <LoadingState label="Cargando más..." /> : null}
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
        fontSize: 20,
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
    filters: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    chips: {
        gap: Spacing.xs,
    },
    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    dimmedCard: {
        opacity: 0.75,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    promoName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.primary,
    },
    savings: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.successDark,
    },
    secondaryText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
