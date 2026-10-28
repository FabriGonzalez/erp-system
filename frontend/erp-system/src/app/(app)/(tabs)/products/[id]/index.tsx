import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useProduct, useSetProductActive } from '@/hooks/use-product-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showErrorToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { formatCurrency } from '@/utils/format';
import { hasPermission } from '@/utils/permissions';
import { productStock, variantStock } from '@/utils/product-stock';
import { stockPill } from '@/utils/status';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const activeBranch = useActiveBranch();
    const canEdit = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRODUCTOS'));
    const { product, isLoading, loadError, reload } = useProduct(id);
    const setProductActive = useSetProductActive();
    const [isToggling, setIsToggling] = useState(false);

    if (isLoading) {
        return <LoadingState />;
    }

    if (loadError && !product) {
        return <ErrorState message={loadError} onRetry={reload} />;
    }

    if (!product) {
        return (
            <NotFound
                headerTitle="Producto"
                title="Producto no encontrado"
                description="El producto que buscás no existe o fue eliminado."
                actionLabel="Volver a productos"
            />
        );
    }

    const currentProduct = product;

    // Sin sucursal activa, el total de todas las sucursales.
    const branchId = activeBranch?.id;
    const currentStock = productStock(currentProduct, branchId);

    function handleEdit() {
        router.push(`/(app)/(tabs)/products/${currentProduct.id}/edit`);
    }

    async function handleToggleActive() {
        if (isToggling) return;
        setIsToggling(true);
        try {
            await setProductActive.mutateAsync({ id: currentProduct.id, active: !currentProduct.active });
        } catch (error: unknown) {
            showErrorToast(error, 'No se pudo cambiar el estado del producto.');
        } finally {
            setIsToggling(false);
        }
    }

    const pill = stockPill(currentStock);
    const prices = currentProduct.variants.map((variant) => variant.price);
    const lowestPrice = prices.length ? Math.min(...prices) : 0;
    const highestPrice = prices.length ? Math.max(...prices) : 0;

    return (
        <Screen style={styles.container}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={currentProduct.categoryName ?? 'Producto'}
                title={currentProduct.name}
                right={canEdit ? (
                    <HeaderButton
                        label="Editar"
                        icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                        accessibilityLabel="Editar producto"
                        onPress={handleEdit}
                    />
                ) : undefined}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={SharedStyles.pageContent}
            >
                {!currentProduct.active || currentProduct.description ? (
                    <View style={styles.summary}>
                        {!currentProduct.active ? <StatusPill label="Inactivo" tone="neutral" /> : null}
                        {currentProduct.description ? (
                            <Text style={styles.description}>{currentProduct.description}</Text>
                        ) : null}
                    </View>
                ) : null}

                <View style={SharedStyles.statRow}>
                    <StatTile
                        label={activeBranch ? `Stock en ${activeBranch.name}` : 'Stock total'}
                        value={String(currentStock)}
                        icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
                        tone={pill.tone}
                    />
                    <StatTile
                        label={lowestPrice === highestPrice ? 'Precio' : 'Precios'}
                        value={lowestPrice === highestPrice
                            ? formatCurrency(lowestPrice)
                            : `${formatCurrency(lowestPrice)} – ${formatCurrency(highestPrice)}`}
                        icon={{ ios: 'dollarsign.circle', android: 'payments', web: 'payments' }}
                        tone="success"
                    />
                </View>

                <View style={SharedStyles.pageSection}>
                    <SectionHeader title={`Variantes (${currentProduct.variants.length})`} />
                    <ListGroup>
                        {currentProduct.variants.map((variant) => {
                            const variantPill = stockPill(variantStock(variant, branchId));
                            return (
                                <View key={variant.id} style={styles.variantRow}>
                                    <View style={SharedStyles.listItemTexts}>
                                        <Text style={styles.variantAttributes}>
                                            {variant.attributes.length
                                                ? variant.attributes
                                                    .map((attribute) => attribute.valueName)
                                                    .filter(Boolean)
                                                    .join(' / ')
                                                : 'Variante única'}
                                        </Text>
                                        <Text style={SharedStyles.listItemMeta}>SKU {variant.sku}</Text>
                                        {variant.barcode ? (
                                            <Text style={SharedStyles.listItemMeta}>Código de barras {variant.barcode}</Text>
                                        ) : null}
                                    </View>
                                    <View style={styles.variantRight}>
                                        <Text style={styles.variantPrice}>{formatCurrency(variant.price)}</Text>
                                        <StatusPill label={variantPill.label} tone={variantPill.tone} />
                                    </View>
                                </View>
                            );
                        })}
                    </ListGroup>
                </View>

                {canEdit && (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title="Acciones" />
                        <ListGroup>
                            <MenuListItem
                                title={isToggling
                                    ? 'Guardando...'
                                    : currentProduct.active ? 'Desactivar producto' : 'Activar producto'}
                                subtitle={currentProduct.active
                                    ? 'Deja de aparecer para vender'
                                    : 'Vuelve a aparecer para vender'}
                                iconName={currentProduct.active
                                    ? { ios: 'pause.circle', android: 'block', web: 'block' }
                                    : { ios: 'play.circle', android: 'check_circle', web: 'check_circle' }}
                                tone="success"
                                danger={currentProduct.active}
                                showChevron={false}
                                onPress={() => void handleToggleActive()}
                            />
                        </ListGroup>
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    summary: {
        gap: Spacing.sm,
    },
    description: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    variantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
        backgroundColor: Colors.surface,
    },
    variantAttributes: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    variantRight: {
        alignItems: 'flex-end',
        gap: Spacing.xs,
    },
    variantPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
});
