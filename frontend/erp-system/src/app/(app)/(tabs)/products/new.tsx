import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';
import { useCategoryStore } from '@/stores/category-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';
import { ProductFormData } from '@/types/product';

export default function NewProductScreen() {
    const { products, createProduct } = useProductStore();
    const { categories, fetchCategories } = useCategoryStore();
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchCategories(token).catch(() => {});
        }
    }, [fetchCategories, token]);

    async function handleSubmit(formData: ProductFormData) {
        if (!token) return;
        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await createProduct(toProductRequest(formData), token);
            setSuccessMessage('¡Producto creado exitosamente!');
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

            {/* Banner de Éxito */}
            {successMessage && (
                <View style={SharedStyles.successBanner}>
                    <SymbolView
                        name={{
                            ios: 'checkmark.circle.fill',
                            android: 'check_circle',
                            web: 'check_circle',
                        }}
                        size={20}
                        tintColor={Colors.success}
                    />
                    <Text style={SharedStyles.successText}>{successMessage}</Text>
                </View>
            )}
            {errorMessage && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            )}

            {/* Formulario */}
            <ProductForm
                categories={categories}
                branches={user?.branches ?? []}
                existingProducts={products}
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
