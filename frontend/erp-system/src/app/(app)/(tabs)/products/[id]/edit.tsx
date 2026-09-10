import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';
import { ProductFormData } from '@/types/product';

export default function EditProductScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { products, categories, attributes, attributeValues, updateProduct } = useProductStore();
    const user = useAuthStore((state) => state.user);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const product = products.find((p) => p.id === id);

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

    function handleSubmit(formData: ProductFormData) {
        if (!product) return;
        setIsSubmitting(true);

        setTimeout(() => {
            const category = categories.find((c) => c.id === formData.categoryId);
            updateProduct(product.id, {
                name: formData.name,
                categoryId: formData.categoryId,
                categoryName: category?.name,
                description: formData.description,
                active: formData.active,
                variants: formData.variants.map((variant, index) => ({
                    id: variant.id ?? `variant-${Date.now()}-${index}`,
                    sku: variant.sku,
                    price: parseFloat(variant.price.replace(',', '.')),
                    attributes: variant.attributes,
                    stockByBranch: variant.stockByBranch,
                })),
            });

            setIsSubmitting(false);
            setSuccessMessage('¡Cambios guardados con éxito!');

            setTimeout(() => {
                router.back();
            }, 600);
        }, 500);
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
                attributes={attributes}
                attributeValues={attributeValues}
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
        backgroundColor: Colors.background,
    },
});