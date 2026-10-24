import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderPromoCatalog } from '@/components/orders/OrderPromoCatalog';
import { CartSummaryBar } from '@/components/products/CartSummaryBar';
import { VariantCatalog } from '@/components/products/VariantCatalog';
import { FilterChip } from '@/components/ui/FilterChip';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { promoUnitsByVariant } from '@/utils/draft-stock';

type CatalogTab = 'PRODUCTS' | 'PROMOS';

export default function SelectProductsScreen() {
    const activeBranch = useActiveBranch();
    const [tab, setTab] = useState<CatalogTab>('PRODUCTS');
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
            {/* Header */}
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>

                <View style={styles.titleBox}>
                    <Text style={styles.headerTitle}>Catálogo de Productos</Text>
                    <Text style={styles.headerSubtitle}>
                        Sucursal: {activeBranch?.name ?? 'Sin sucursal activa'}
                    </Text>
                </View>

                <View style={SharedStyles.headerSpacer} />
            </View>

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
    titleBox: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    tabs: {
        flexDirection: 'row',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
    },
});
