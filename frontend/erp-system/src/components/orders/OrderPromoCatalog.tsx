import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { PromoVariantChooser } from '@/components/orders/PromoVariantChooser';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
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
            <View style={[SharedStyles.rowCard, styles.card, !isSellable && styles.dimmed]}>
                <View style={styles.main}>
                    <Text style={styles.name}>{promotion.name}</Text>
                    {promotion.items.map((item) => (
                        <Text key={item.id} style={styles.component} numberOfLines={1}>
                            {item.quantity}× {item.productName}
                        </Text>
                    ))}
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatCurrency(promotion.price)}</Text>
                        {savings > 0 ? <Text style={styles.savings}>Ahorrás desde {formatCurrency(savings)}</Text> : null}
                    </View>
                    {!isSellable ? (
                        <Text style={[styles.stockText, styles.stockTextLow]}>Tiene un producto desactivado</Text>
                    ) : inCart > 0 ? (
                        <Text style={styles.stockText}>{inCart} en el carrito</Text>
                    ) : null}
                </View>

                <Pressable
                    style={[styles.addButton, !isSellable && styles.btnDisabled]}
                    onPress={() => setChoosing(promotion)}
                    disabled={!isSellable}
                >
                    <SymbolView
                        name={{ ios: 'plus', android: 'add', web: 'add' }}
                        size={16}
                        tintColor={isSellable ? Colors.white : Colors.textSecondary}
                    />
                    <Text style={[styles.addButtonText, !isSellable && styles.addButtonTextDisabled]}>Agregar</Text>
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
    },
    card: {
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    dimmed: {
        opacity: 0.6,
    },
    main: {
        flex: 1,
        paddingRight: Spacing.sm,
        gap: 2,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    component: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: 4,
    },
    price: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
    },
    savings: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.successDark,
    },
    stockText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    stockTextLow: {
        color: Colors.warningDark,
        fontWeight: '600',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 96,
        minHeight: 36,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        borderRadius: 8,
        gap: 4,
    },
    addButtonText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '600',
    },
    addButtonTextDisabled: {
        color: Colors.textSecondary,
    },
    btnDisabled: {
        opacity: 0.4,
        backgroundColor: Colors.border,
    },
});
