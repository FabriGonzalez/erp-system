import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CartSummaryBar } from '@/components/products/CartSummaryBar';
import { VariantCatalog } from '@/components/products/VariantCatalog';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';

export default function SelectProductsScreen() {
    const token = useAuthStore((state) => state.token);
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const {
        products,
        searchQuery,
        setSearchQuery,
        fetchProducts,
        isLoading,
        isError,
        errorMessage,
    } = useProductStore();

    // El catálogo no puede depender de que otra pantalla haya cargado los
    // productos: se piden al abrir para tener también el stock actualizado.
    const loadProducts = useCallback(() => {
        if (!token) return;
        fetchProducts(token).catch(() => {});
    }, [token, fetchProducts]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

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
                products={products}
                isLoading={isLoading}
                errorMessage={isError ? errorMessage ?? 'No se pudieron cargar los productos.' : null}
                onRefresh={loadProducts}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                getSelectedQuantity={(productId, variantId) =>
                    items.find((item) => item.productId === productId && item.variantId === variantId)?.quantity ?? 0
                }
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
