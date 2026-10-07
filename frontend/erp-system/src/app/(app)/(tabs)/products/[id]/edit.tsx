import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';
import { useCategoryStore } from '@/stores/category-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';
import { ProductFormData } from '@/types/product';

export default function EditProductScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const {
        products,
        errorMessage,
        isError,
        isLoading,
        fetchProductById,
        updateProductFromApi,
    } = useProductStore();
    const { categories, fetchCategories } = useCategoryStore();
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchCategories(token).catch(() => {});
            if (!products.some((item) => item.id === id)) {
                fetchProductById(id, token).catch(() => {});
            }
        }
    }, [fetchCategories, fetchProductById, id, products, token]);

    const product = products.find((p) => p.id === id);

    if (isLoading && !product) {
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
                    description="El producto que intentas editar no existe o fue removido."
                    actionLabel="Volver a productos"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    async function handleSubmit(formData: ProductFormData) {
        if (!product) return;
        if (!token) return;
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

            await updateProductFromApi(product.id, productRequest, token);

            setSuccessMessage('¡Cambios guardados con éxito!');
            router.back();
        } catch (error: unknown) {
            setSubmissionError(
                error instanceof Error ? error.message : 'No se pudo actualizar el producto.'
            );
        } finally {
            setIsSubmitting(false);
        }
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
            {(submissionError || (isError && errorMessage)) && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>
                        {submissionError || errorMessage}
                    </Text>
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
                        attributes: variant.attributes,
                        stockByBranch: variant.stockByBranch,
                    })),
                }}
                categories={categories}
                branches={user?.branches ?? []}
                existingProducts={products}
                currentProductId={product.id}
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