import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';
import { ProductFormData } from '@/types/product';

export default function NewProductScreen() {
    const { products, categories, attributes, attributeValues, addProduct } = useProductStore();
    const user = useAuthStore((state) => state.user);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    function handleSubmit(formData: ProductFormData) {
        setIsSubmitting(true);

        // Simulate network / create operation
        setTimeout(() => {
            const category = categories.find((c) => c.id === formData.categoryId);
            addProduct({
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
            setSuccessMessage('¡Producto creado exitosamente!');

            // Return to products list after brief feedback
            setTimeout(() => {
                router.back();
            }, 600);
        }, 500);
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

            {/* Formulario */}
            <ProductForm
                categories={categories}
                attributes={attributes}
                attributeValues={attributeValues}
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
        backgroundColor: Colors.background,
    },
});
