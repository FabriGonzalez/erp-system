import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CatalogTab } from '@/components/orders/OrderCartSection';
import { OrderPromoCatalog } from '@/components/orders/OrderPromoCatalog';
import { CartSummaryBar } from '@/components/products/CartSummaryBar';
import { VariantCatalog } from '@/components/products/VariantCatalog';
import { FilterChip } from '@/components/ui/FilterChip';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { promoUnitsByVariant } from '@/utils/draft-stock';

export default function SelectProductsScreen() {
    const activeBranch = useActiveBranch();
    // El botón "Promo" del pedido abre directo en la pestaña de promos.
    const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
    const [tab, setTab] = useState<CatalogTab>(initialTab === 'PROMOS' ? 'PROMOS' : 'PRODUCTS');
    const originalUnits = useOrderDraftStore((state) => state.originalUnits);
    const items = useOrderDraftStore((state) => state.items);
    const promos = useOrderDraftStore((state) => state.promos);
    const addItem = useOrderDraftStore((state) => state.addItem);
    const updateItemQuantity = useOrderDraftStore((state) => state.updateItemQuantity);

    const promoUnits = promoUnitsByVariant(promos);
    const cartTotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)
        + promos.reduce((sum, promo) => sum + promo.subtotal, 0);
    const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0)
        + promos.reduce((sum, promo) => sum + promo.quantity, 0);

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={activeBranch ? `Stock de ${activeBranch.name}` : 'Sin sucursal activa'}
                title="Agregar productos"
            />

            <View style={styles.tabs}>
                <FilterChip label="Productos" selected={tab === 'PRODUCTS'} onPress={() => setTab('PRODUCTS')} />
                <FilterChip
                    label={promos.length > 0 ? `Promos (${promos.length})` : 'Promos'}
                    selected={tab === 'PROMOS'}
                    onPress={() => setTab('PROMOS')}
                />
            </View>

            {tab === 'PRODUCTS' ? (
                <VariantCatalog
                    branchId={activeBranch?.id ?? ''}
                    getSelectedQuantity={(productId, variantId) =>
                        items.find((item) => item.productId === productId && item.variantId === variantId)?.quantity ?? 0
                    }
                    // Al editar, lo que el pedido ya tenía está descontado del stock: se suma. Lo que
                    // llevan las promos del borrador no se puede vender suelto: se resta.
                    getReservedQuantity={(variantId) => (originalUnits[variantId] ?? 0) - (promoUnits[variantId] ?? 0)}
                    onAddItem={addItem}
                    onUpdateItemQuantity={updateItemQuantity}
                    noBranchDescription="Seleccioná una sucursal para ver su stock disponible."
                />
            ) : (
                <OrderPromoCatalog branchId={activeBranch?.id ?? ''} />
            )}

            <CartSummaryBar
                itemsCount={cartItemsCount}
                totalAmount={cartTotalAmount}
                onPress={() => router.back()}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    tabs: {
        flexDirection: 'row',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
    },
});
