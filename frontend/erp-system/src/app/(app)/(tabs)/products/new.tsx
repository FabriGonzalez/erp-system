import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useCategories } from '@/hooks/use-category-queries';
import { useCreateProduct } from '@/hooks/use-product-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { ProductFormData } from '@/types/product';
import { hasPermission } from '@/utils/permissions';

export default function NewProductScreen() {
    // Cada variante nueva fija un precio: crear exige también ADMINISTRAR_PRECIOS.
    const canAccess = useAuthStore((state) =>
        hasPermission(state.user, 'ADMINISTRAR_PRODUCTOS') && hasPermission(state.user, 'ADMINISTRAR_PRECIOS'));
    const createProduct = useCreateProduct();
    const { categories } = useCategories();
    const user = useAuthStore((state) => state.user);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleSubmit(formData: ProductFormData) {
        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await createProduct.mutateAsync(toProductRequest(formData));
            // El toast sigue visible después de volver al listado.
            showToast({ type: 'success', message: 'Producto creado.' });
            router.back();
        } catch (error: unknown) {
            setErrorMessage(
                error instanceof Error ? error.message : 'No se pudo crear el producto.'
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    function toProductRequest(formData: ProductFormData) {
        return {
            name: formData.name,
            description: formData.description || null,
            categoryId: Number(formData.categoryId),
            variants: formData.variants.map((variant) => ({
                sku: variant.sku,
                price: Number(variant.price.replace(',', '.')),
                barcode: variant.barcode || null,
                attributeValueIds: variant.attributes.map((attribute) =>
                    Number(attribute.attributeValueId)
                ),
                initialStock: Object.entries(variant.stockByBranch).map(
                    ([branchId, quantity]) => ({
                        branchId: Number(branchId),
                        quantity: Number(quantity),
                    })
                ),
            })),
        };
    }

    if (!canAccess) {
        return (
            <NotFound
                headerTitle="Nuevo producto"
                title="Sin permisos"
                description={'Crear productos requiere los permisos "Administrar productos" y "Administrar precios".'}
            />
        );
    }

    return (
        <Screen style={styles.container}>
            <PageHeader onBack={isSubmitting ? undefined : () => router.back()} eyebrow="Productos" title="Nuevo producto" />

            {errorMessage && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            )}

            {/* Formulario */}
            <ProductForm
                categories={categories}
                branches={user?.branches ?? []}
                onSubmit={handleSubmit}
                onCancel={() => router.back()}
                isSubmitting={isSubmitting}
                submitLabel="Crear Producto"
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
