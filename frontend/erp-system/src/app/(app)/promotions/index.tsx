import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PromotionStatusBadge } from '@/components/promotions/PromotionStatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
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
                style={({ pressed }) => [
                    SharedStyles.card,
                    SharedStyles.listItem,
                    item.status !== 'ACTIVE' && SharedStyles.listItemInactive,
                    pressed && SharedStyles.listItemPressed,
                ]}
                onPress={() => router.push({ pathname: '/promotions/[id]', params: { id: item.id } })}
                accessibilityRole="button"
            >
                <IconBadge
                    icon={{ ios: 'tag', android: 'sell', web: 'sell' }}
                    tone="rose"
                    size={44}
                />
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={SharedStyles.listItemMeta} numberOfLines={2}>{unitsLabel}</Text>
                    <Text style={SharedStyles.listItemMeta}>
                        Del {formatDay(item.startDate)} al {formatDay(item.endDate)}
                    </Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                        {savings > 0 ? (
                            <Text style={styles.savings}>Ahorro desde {formatCurrency(savings)}</Text>
                        ) : null}
                    </View>
                </View>
                <View style={styles.status}>
                    <PromotionStatusBadge status={item.status} />
                </View>
            </Pressable>
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={list.isInitialLoading
                    ? 'Cargando...'
                    : `${list.totalElements} ${list.totalElements === 1 ? 'promo' : 'promos'}`}
                title="Promociones"
                right={<HeaderButton label="Nueva" accessibilityLabel="Nueva promo" onPress={() => router.push('/promotions/new')} />}
            />

            <View style={SharedStyles.pageToolbar}>
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
                    contentContainerStyle={SharedStyles.pageList}
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
    chips: {
        gap: Spacing.xs,
    },
    status: {
        alignSelf: 'flex-start',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: Spacing.sm,
    },
    price: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.text,
    },
    savings: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.successDark,
    },
});
