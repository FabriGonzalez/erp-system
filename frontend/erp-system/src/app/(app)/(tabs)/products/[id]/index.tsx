import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '@/components/products/ProductCard';
import { NotFound } from '@/components/ui/NotFound';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useProduct, useSetProductActive } from '@/hooks/use-product-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showErrorToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { hasPermission } from '@/utils/permissions';
import { productStock, variantStock } from '@/utils/product-stock';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const activeBranch = useActiveBranch();
    const canEdit = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRODUCTOS'));
    const { product, isLoading, loadError, reload } = useProduct(id);
    const setProductActive = useSetProductActive();
    const [isToggling, setIsToggling] = useState(false);

    if (isLoading) {
        return <LoadingState />;
    }

    if (loadError && !product) {
        return <ErrorState message={loadError} onRetry={reload} />;
    }

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

    // Sin sucursal activa, el total de todas las sucursales.
    const branchId = activeBranch?.id;
    const currentStock = productStock(currentProduct, branchId);

    function handleEdit() {
        router.push(`/(app)/(tabs)/products/${currentProduct.id}/edit`);
    }

    async function handleToggleActive() {
        if (isToggling) return;
        setIsToggling(true);
        try {
            await setProductActive.mutateAsync({ id: currentProduct.id, active: !currentProduct.active });
        } catch (error: unknown) {
            showErrorToast(error, 'No se pudo cambiar el estado del producto.');
        } finally {
            setIsToggling(false);
        }
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

                {canEdit && (
                    <Pressable
                        style={({ pressed }) => [styles.editButton, pressed && SharedStyles.pressed]}
                        onPress={handleEdit}
                    >
                        <Text style={styles.editButtonText}>Editar</Text>
                    </Pressable>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <ProductCard
                    product={currentProduct}
                    stock={currentStock}
                    canEdit={canEdit}
                    onPress={handleEdit}
                    onToggleActive={handleToggleActive}
                />

                <View style={styles.variantsCard}>
                    <Text style={styles.actionsTitle}>Variantes ({currentProduct.variants.length})</Text>
                    {currentProduct.variants.map((variant) => (
                        <View key={variant.id} style={styles.variantRow}>
                            <View style={styles.variantInfo}>
                                <Text style={styles.variantAttributes}>
                                    {variant.attributes.length
                                        ? variant.attributes
                                            .map((attribute) => attribute.valueName)
                                            .filter(Boolean)
                                            .join(' / ')
                                        : 'Variante única'}
                                </Text>
                                <Text style={styles.variantSku}>SKU: {variant.sku}</Text>
                                {variant.barcode ? (
                                    <Text style={styles.variantSku}>Código de barras: {variant.barcode}</Text>
                                ) : null}
                            </View>
                            <View>
                                <Text style={styles.variantPrice}>${variant.price.toLocaleString('es-AR')}</Text>
                                <Text style={styles.variantSku}>Stock: {variantStock(variant, branchId)}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {canEdit && (
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
                            onPress={handleToggleActive}
                            disabled={isToggling}
                        >
                            <Text style={styles.actionButtonSecondaryText}>
                                {isToggling ? 'Guardando...' : currentProduct.active ? 'Desactivar' : 'Activar'}
                            </Text>
                        </Pressable>
                    </View>
                )}
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