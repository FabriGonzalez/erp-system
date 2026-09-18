import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '@/components/products/ProductCard';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useProductAttributeStore } from '@/stores/product-attribute-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const { products, toggleProductActive } = useProductStore();
    const attributeValues = useProductAttributeStore((state) => state.attributeValues);

    const product = products.find((p) => p.id === id);

    if (!product) {
        return (
            <NotFound
                headerTitle="Producto"
                title="Producto no encontrado"
                description="El producto que buscás no existe o fue eliminado."
                actionLabel="Volver a productos"
            />
        );
    }

    const currentProduct = product;

    const branchId = activeBranch?.id ?? '1';
    const currentStock = currentProduct.variants.reduce((sum, variant) => sum + (variant.stockByBranch[branchId] ?? 0), 0);

    function handleEdit() {
        router.push(`/(app)/(tabs)/products/${currentProduct.id}/edit`);
    }

    return (
        <Screen style={styles.container}>
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
                <Text style={SharedStyles.headerTitle}>Detalle Producto</Text>

                <Pressable
                    style={({ pressed }) => [styles.editButton, pressed && SharedStyles.pressed]}
                    onPress={handleEdit}
                >
                    <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <ProductCard
                    product={currentProduct}
                    stock={currentStock}
                    canEdit
                    onPress={handleEdit}
                    onToggleActive={() => toggleProductActive(currentProduct.id)}
                />

                <View style={styles.variantsCard}>
                    <Text style={styles.actionsTitle}>Variantes ({currentProduct.variants.length})</Text>
                    {currentProduct.variants.map((variant) => (
                        <View key={variant.id} style={styles.variantRow}>
                            <View style={styles.variantInfo}>
                                <Text style={styles.variantAttributes}>
                                    {variant.attributes.length
                                        ? variant.attributes
                                            .map((attribute) => attributeValues.find((value) => value.id === attribute.attributeValueId)?.name)
                                            .filter(Boolean)
                                            .join(' / ')
                                        : 'Variante única'}
                                </Text>
                                <Text style={styles.variantSku}>SKU: {variant.sku}</Text>
                            </View>
                            <View>
                                <Text style={styles.variantPrice}>${variant.price.toLocaleString('es-AR')}</Text>
                                <Text style={styles.variantSku}>Stock: {variant.stockByBranch[branchId] ?? 0}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.actionsCard}>
                    <Text style={styles.actionsTitle}>Acciones</Text>

                    <Pressable
                        style={({ pressed }) => [styles.actionButton, pressed && SharedStyles.pressed]}
                        onPress={handleEdit}
                    >
                        <Text style={styles.actionButtonText}>Editar Producto</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.actionButtonSecondary, pressed && SharedStyles.pressed]}
                        onPress={() => toggleProductActive(currentProduct.id)}
                    >
                        <Text style={styles.actionButtonSecondaryText}>
                            {currentProduct.active ? 'Desactivar' : 'Activar'}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },

    editButton: {
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: 8,
    },

    editButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },

    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
        gap: Spacing.md,
    },

    actionsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    variantsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    variantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
    },

    variantInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },

    variantAttributes: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },

    variantSku: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },

    variantPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },

    actionsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },

    actionButton: {
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        marginBottom: Spacing.sm,
    },

    actionButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },

    actionButtonSecondary: {
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },

    actionButtonSecondaryText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
});