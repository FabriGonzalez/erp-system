import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useProductStore } from '@/stores/product-store';
import { ProductFormData } from '@/types/product';

export default function NewProductScreen() {
    const { categories, addProduct } = useProductStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    function handleSubmit(formData: ProductFormData) {
        setIsSubmitting(true);

        // Simulate network / create operation
        setTimeout(() => {
            const category = categories.find((c) => c.id === formData.categoryId);
            const numPrice = parseFloat(formData.price.replace(',', '.'));

            addProduct({
                name: formData.name,
                sku: formData.sku,
                price: numPrice,
                categoryId: formData.categoryId,
                categoryName: category?.name,
                description: formData.description,
                active: formData.active,
                stockByBranch: {},
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
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                    disabled={isSubmitting}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={styles.headerTitle}>Nuevo Producto</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Banner de Éxito */}
            {successMessage && (
                <View style={styles.successBanner}>
                    <SymbolView
                        name={{
                            ios: 'checkmark.circle.fill',
                            android: 'check_circle',
                            web: 'check_circle',
                        }}
                        size={20}
                        tintColor={Colors.success}
                    />
                    <Text style={styles.successText}>{successMessage}</Text>
                </View>
            )}

            {/* Formulario */}
            <ProductForm
                categories={categories}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
    },
    pressed: {
        opacity: 0.7,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSpacer: {
        width: 32,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#BBF7D0',
    },
    successText: {
        color: '#166534',
        fontSize: 14,
        fontWeight: '600',
    },
});
