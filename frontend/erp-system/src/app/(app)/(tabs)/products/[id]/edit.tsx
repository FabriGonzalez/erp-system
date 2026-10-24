import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useCategories } from '@/hooks/use-category-queries';
import { useProduct, useUpdateProduct } from '@/hooks/use-product-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { ProductFormData } from '@/types/product';
import { hasPermission } from '@/utils/permissions';

export default function EditProductScreen() {
    const canAccess = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRODUCTOS'));
    const { id } = useLocalSearchParams<{ id: string }>();
    // fresh: la edición manda cantidades finales de stock, así que el formulario tiene que
    // partir del stock actual y no de la copia en caché (podría pisar una venta reciente).
    const { product, isLoading, loadError } = useProduct(id, { fresh: true });
    const updateProduct = useUpdateProduct();
    const { categories } = useCategories();
    const user = useAuthStore((state) => state.user);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    if (isLoading) {
        return <LoadingState />;
    }

    if (!product) {
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
                    <Text style={SharedStyles.headerTitle}>Producto</Text>
                    <View style={SharedStyles.headerSpacer} />
                </View>
                <EmptyState
                    title="Producto no encontrado"
                    description={loadError ?? 'El producto que intentas editar no existe o fue removido.'}
                    actionLabel="Volver a productos"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    async function handleSubmit(formData: ProductFormData) {
        if (!product) return;
        setIsSubmitting(true);
        setSubmissionError(null);
        try {
            const productRequest = {
                name: formData.name,
                categoryId: Number(formData.categoryId),
                description: formData.description || null,
                variants: formData.variants.map((variant) => ({
                    sku: variant.sku,
                    price: Number(variant.price.replace(',', '.')),
                    barcode: variant.barcode || null,
                    attributeValueIds: variant.attributes.map((attribute) =>
                        Number(attribute.attributeValueId)
                    ),
                    stock: Object.entries(variant.stockByBranch).map(
                        ([branchId, quantity]) => ({
                            branchId: Number(branchId),
                            quantity: Number(quantity),
                        })
                    ),
                })),
            };

            await updateProduct.mutateAsync({ id: product.id, data: productRequest });

            // El toast sigue visible después de volver al detalle.
            showToast({ type: 'success', message: 'Cambios guardados.' });
            router.back();
        } catch (error: unknown) {
            setSubmissionError(
                error instanceof Error ? error.message : 'No se pudo actualizar el producto.'
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!canAccess) {
        return (
            <NotFound
                headerTitle="Editar producto"
                title="Sin permisos"
                description="Tu usuario no tiene permiso para editar productos."
            />
        );
    }

    return (
        <Screen style={styles.container}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                    disabled={isSubmitting}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Editar Producto</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            {submissionError && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{submissionError}</Text>
                </View>
            )}

            <ProductForm
                initialValues={{
                    name: product.name,
                    categoryId: product.categoryId,
                    description: product.description,
                    active: product.active,
                    variants: product.variants.map((variant) => ({
                        id: variant.id,
                        sku: variant.sku,
                        price: variant.price.toString(),
                        barcode: variant.barcode ?? '',
                        attributes: variant.attributes,
                        stockByBranch: variant.stockByBranch,
                    })),
                }}
                categories={categories}
                branches={user?.branches ?? []}
                onSubmit={handleSubmit}
                onCancel={() => router.back()}
                isSubmitting={isSubmitting}
                submitLabel="Guardar Cambios"
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    errorBanner: {
        backgroundColor: Colors.errorLight,
        padding: 12,
    },
    errorText: {
        color: Colors.error,
        textAlign: 'center',
    },
});