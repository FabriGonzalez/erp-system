import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useCategories } from '@/hooks/use-category-queries';
import { useCreateProduct } from '@/hooks/use-product-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { ProductFormData } from '@/types/product';
import { hasPermission } from '@/utils/permissions';

export default function NewProductScreen() {
    const canAccess = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRODUCTOS'));
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
                description="Tu usuario no tiene permiso para crear productos."
            />
        );
    }

    return (
        <Screen style={styles.container}>
            {/* Header con botón Back */}
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
                <Text style={SharedStyles.headerTitle}>Nuevo Producto</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

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
