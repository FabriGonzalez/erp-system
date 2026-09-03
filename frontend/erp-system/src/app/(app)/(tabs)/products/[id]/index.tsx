import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { useBranchStore } from '@/stores/branch-store';
import { useProductStore } from '@/stores/product-store';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const { products, toggleProductActive } = useProductStore();

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
                    description="El producto que buscás no existe o fue eliminado."
                    actionLabel="Volver a productos"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    const currentProduct = product;

    const branchId = activeBranch?.id ?? '1';
    const currentStock = currentProduct.stockByBranch[branchId] ?? 0;

    function handleEdit() {
        router.push(`/(app)/(tabs)/products/${currentProduct.id}/edit`);
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

                <Pressable
                    style={({ pressed }) => [styles.editButton, pressed && SharedStyles.pressed]}
                    onPress={handleEdit}
                >
                    <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <ProductCard
                    product={currentProduct}
                    stock={currentStock}
                    canEdit
                    onPress={handleEdit}
                    onToggleActive={() => toggleProductActive(currentProduct.id)}
                />

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
                        onPress={() => toggleProductActive(currentProduct.id)}
                    >
                        <Text style={styles.actionButtonSecondaryText}>
                            {currentProduct.active ? 'Desactivar' : 'Activar'}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
        backgroundColor: Colors.background,
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
        color: '#FFFFFF',
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