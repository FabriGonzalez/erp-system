import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { PromoVariantChooser } from '@/components/orders/PromoVariantChooser';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { usePromotions } from '@/hooks/use-promotion-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { Promotion } from '@/types/promotion';
import { formatCurrency } from '@/utils/format';

type OrderPromoCatalogProps = {
    /** Sucursal del pedido: su stock limita qué variantes se pueden elegir. */
    branchId: string;
    /** Espacio al final de la lista para la barra fija de la pantalla. */
    listPaddingBottom?: number;
};

/**
 * Promos vigentes para sumar al borrador del pedido. Cada vez que se agrega una se eligen las
 * variantes de sus unidades (PromoVariantChooser); cada combinación queda como una línea.
 */
export function OrderPromoCatalog({ branchId, listPaddingBottom = Spacing.xxl * 3 }: OrderPromoCatalogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [choosing, setChoosing] = useState<Promotion | null>(null);
    const promos = useOrderDraftStore((state) => state.promos);
    const addPromoLine = useOrderDraftStore((state) => state.addPromoLine);

    // Se vuelven a pedir cada vez que se abre: la vigencia y el precio pueden haber cambiado.
    const {
        items: promotions,
        isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = usePromotions({ q: searchQuery, status: 'ACTIVE' }, { enabled: Boolean(branchId), staleTime: 0 });

    function renderItem({ item: promotion }: { item: Promotion }) {
        const inCart = promos
            .filter((promo) => promo.promotionId === promotion.id)
            .reduce((sum, promo) => sum + promo.quantity, 0);
        const isSellable = promotion.items.every((item) => item.available);
        const savings = promotion.regularPriceMin - promotion.price;

        return (
            <View style={[SharedStyles.card, SharedStyles.listItem, !isSellable && SharedStyles.listItemInactive]}>
                <IconBadge icon={{ ios: 'tag', android: 'sell', web: 'sell' }} tone="rose" size={44} />
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle} numberOfLines={2}>{promotion.name}</Text>
                    {promotion.items.map((item) => (
                        <Text key={item.id} style={SharedStyles.listItemMeta} numberOfLines={1}>
                            {item.quantity}× {item.productName}
                        </Text>
                    ))}
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatCurrency(promotion.price)}</Text>
                        {!isSellable ? (
                            <StatusPill label="Producto desactivado" tone="warning" />
                        ) : savings > 0 ? (
                            <StatusPill label={`Ahorrás desde ${formatCurrency(savings)}`} tone="success" />
                        ) : null}
                    </View>
                    {isSellable && inCart > 0 ? <Text style={styles.inCart}>{inCart} en el carrito</Text> : null}
                </View>

                <Pressable
                    style={[SharedStyles.addButton, !isSellable && SharedStyles.addButtonDisabled]}
                    onPress={() => setChoosing(promotion)}
                    disabled={!isSellable}
                >
                    <SymbolView
                        name={{ ios: 'plus', android: 'add', web: 'add' }}
                        size={16}
                        tintColor={isSellable ? Colors.white : Colors.textSecondary}
                    />
                    <Text style={[SharedStyles.addButtonText, !isSellable && SharedStyles.addButtonTextDisabled]}>
                        Agregar
                    </Text>
                </Pressable>
            </View>
        );
    }

    return (
        <>
            <View style={styles.searchBox}>
                <AppInput placeholder="Buscar promo por nombre..." value={searchQuery} onChangeText={setSearchQuery} />
            </View>

            {isInitialLoading ? (
                <LoadingState label="Cargando promos..." />
            ) : error && promotions.length === 0 ? (
                <ErrorState message={error} onRetry={refresh} />
            ) : (
                <FlatList
                    data={branchId ? promotions : []}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: listPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
                    ListEmptyComponent={
                        !branchId ? (
                            <EmptyState title="Sin sucursal activa" description="Seleccioná una sucursal para ver su stock disponible." />
                        ) : (
                            <EmptyState
                                title="No hay promos vigentes"
                                description={searchQuery.trim()
                                    ? 'Ninguna promo vigente coincide con la búsqueda.'
                                    : 'Las promos se arman en Más → Administración → Promociones.'}
                            />
                        )
                    }
                />
            )}

            {choosing ? (
                <PromoVariantChooser
                    // Un selector nuevo por promo: arranca sin nada elegido.
                    key={choosing.id}
                    promotion={choosing}
                    branchId={branchId}
                    onClose={() => setChoosing(null)}
                    onConfirm={(components) => {
                        addPromoLine(choosing, components);
                        setChoosing(null);
                    }}
                />
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    searchBox: {
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    listContainer: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: 2,
    },
    price: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    inCart: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
});
