import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CartSummaryBar } from '@/components/products/CartSummaryBar';
import { VariantCatalog } from '@/components/products/VariantCatalog';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';

export default function SelectProductsScreen() {
    const activeBranch = useActiveBranch();
    const originalItems = useOrderDraftStore((state) => state.originalItems);
    const items = useOrderDraftStore((state) => state.items);
    const addItem = useOrderDraftStore((state) => state.addItem);
    const updateItemQuantity = useOrderDraftStore((state) => state.updateItemQuantity);

    const cartTotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

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

            <VariantCatalog
                branchId={activeBranch?.id ?? ''}
                getSelectedQuantity={(productId, variantId) =>
                    items.find((item) => item.productId === productId && item.variantId === variantId)?.quantity ?? 0
                }
                // Al editar un envío, lo que ya tenía está descontado del stock: se suma.
                getReservedQuantity={(variantId) => originalItems[variantId]?.quantity ?? 0}
                onAddItem={addItem}
                onUpdateItemQuantity={updateItemQuantity}
                noBranchDescription="Seleccioná una sucursal para ver su stock disponible."
            />

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
});
