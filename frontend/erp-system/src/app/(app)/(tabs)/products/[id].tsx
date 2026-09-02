import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductForm } from '@/components/products/ProductForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useProductStore } from '@/stores/product-store';
import { ProductFormData } from '@/types/product';

export default function EditProductScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { products, categories, updateProduct, toggleProductActive } = useProductStore();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const product = products.find((p) => p.id === id);

    if (!product) {
        return (
            <Screen style={styles.container}>
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <SymbolView
                            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                            size={24}
                            tintColor={Colors.text}
                        />
                    </Pressable>
                    <Text style={styles.headerTitle}>Producto</Text>
                    <View style={styles.headerSpacer} />
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
            const numPrice = parseFloat(formData.price.replace(',', '.'));

            updateProduct(product.id, {
                name: formData.name,
                sku: formData.sku,
                price: numPrice,
                categoryId: formData.categoryId,
                categoryName: category?.name,
                description: formData.description,
                active: formData.active,
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
            {/* Header con botón Back y acción rápida de Estado */}
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

                <Text style={styles.headerTitle}>Editar Producto</Text>

                <Pressable
                    style={[
                        styles.quickStatusButton,
                        product.active ? styles.activeQuickButton : styles.inactiveQuickButton,
                    ]}
                    onPress={() => toggleProductActive(product.id)}
                    disabled={isSubmitting}
                >
                    <Text
                        style={[
                            styles.quickStatusText,
                            product.active ? styles.activeQuickText : styles.inactiveQuickText,
                        ]}
                    >
                        {product.active ? 'Activo' : 'Inactivo'}
                    </Text>
                </Pressable>
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
                initialValues={{
                    name: product.name,
                    sku: product.sku,
                    price: product.price.toString(),
                    categoryId: product.categoryId,
                    description: product.description,
                    active: product.active,
                }}
                categories={categories}
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
    quickStatusButton: {
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: 8,
    },
    activeQuickButton: {
        backgroundColor: '#DCFCE7',
    },
    inactiveQuickButton: {
        backgroundColor: '#F1F5F9',
    },
    quickStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeQuickText: {
        color: '#16A34A',
    },
    inactiveQuickText: {
        color: Colors.textSecondary,
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
