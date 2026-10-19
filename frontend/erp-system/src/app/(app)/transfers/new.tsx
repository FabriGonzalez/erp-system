import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartSummaryBar } from '@/components/products/CartSummaryBar';
import { VariantCatalog } from '@/components/products/VariantCatalog';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterChip } from '@/components/ui/FilterChip';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCreateTransfer } from '@/hooks/use-transfer-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';
import { Product } from '@/types/product';

type DraftItem = {
    productId: string;
    productName: string;
    variantId: string;
    sku: string;
    quantity: number;
};

type Draft = {
    originId: string;
    destinationId: string | null;
    items: DraftItem[];
};

function emptyDraft(originId: string): Draft {
    return { originId, destinationId: null, items: [] };
}

export default function NewTransferScreen() {
    const token = useAuthStore((state) => state.token);
    const origin = useBranchStore((state) => state.activeBranch);
    const allBranches = useBranchStore((state) => state.allBranches);
    const fetchAllBranches = useBranchStore((state) => state.fetchAllBranches);
    const products = useProductStore((state) => state.products);
    const fetchProducts = useProductStore((state) => state.fetchProducts);
    const isLoadingProducts = useProductStore((state) => state.isLoading);
    const isProductsError = useProductStore((state) => state.isError);
    const productsErrorMessage = useProductStore((state) => state.errorMessage);
    const createTransfer = useCreateTransfer();

    const originId = origin?.id ?? '';
    const [draft, setDraft] = useState<Draft>(() => emptyDraft(originId));
    const [isCatalogVisible, setCatalogVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Lo elegido vale para una sucursal de origen: si cambia la activa, se empieza de nuevo.
    const currentDraft = draft.originId === originId ? draft : emptyDraft(originId);
    const { destinationId, items } = currentDraft;

    function updateDraft(change: (current: Draft) => Draft) {
        setDraft((previous) => change(previous.originId === originId ? previous : emptyDraft(originId)));
    }

    function setItems(change: (current: DraftItem[]) => DraftItem[]) {
        updateDraft((current) => ({ ...current, items: change(current.items) }));
    }

    // El stock de origen tiene que estar al día para limitar las cantidades.
    const loadProducts = useCallback(() => {
        if (!token) return;
        fetchProducts(token).catch(() => {});
    }, [token, fetchProducts]);

    useEffect(() => {
        loadProducts();
        if (token) {
            fetchAllBranches(token).catch(() => {});
        }
    }, [loadProducts, token, fetchAllBranches]);

    const destinations = useMemo(
        () => allBranches.filter((branch) => branch.active !== false && branch.id !== originId),
        [allBranches, originId],
    );

    // Stock en origen y atributos ("Color: Rojo · Talle: M") por variante, según la última carga.
    // Los nombres vienen en el producto: no hace falta cargar el store de atributos.
    const { originStockByVariant, attributesByVariant } = useMemo(() => {
        const stock = new Map<string, number>();
        const labels = new Map<string, string>();

        for (const product of products) {
            for (const variant of product.variants) {
                stock.set(variant.id, variant.stockByBranch[originId] ?? 0);
                const label = variant.attributes
                    .map(({ attributeName, valueName }) =>
                        attributeName && valueName ? `${attributeName}: ${valueName}` : null)
                    .filter(Boolean)
                    .join(' · ');
                if (label) labels.set(variant.id, label);
            }
        }
        return { originStockByVariant: stock, attributesByVariant: labels };
    }, [products, originId]);

    const exceedsStock = (item: DraftItem) => item.quantity > (originStockByVariant.get(item.variantId) ?? 0);
    const hasStockProblems = items.some(exceedsStock);
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
    // Qué se eligió, para la barra del catálogo; el SKU distingue variantes del mismo producto.
    const selectionSummary = items
        .map((item) => {
            const repeated = items.some((other) => other !== item && other.productId === item.productId);
            return `${item.productName}${repeated ? ` (${item.sku})` : ''} ×${item.quantity}`;
        })
        .join(' · ');
    const canSubmit = Boolean(destinationId) && items.length > 0 && !hasStockProblems && !createTransfer.isPending;

    function setQuantity(variantId: string, quantity: number, stock: number) {
        setItems((current) => {
            const target = Math.min(quantity, stock);
            if (target <= 0) return current.filter((item) => item.variantId !== variantId);
            return current.map((item) => item.variantId === variantId ? { ...item, quantity: target } : item);
        });
    }

    function addItem(product: Product, stock: number, variantId: string) {
        setItems((current) => {
            const existing = current.find((item) => item.variantId === variantId);
            if (existing) {
                return current.map((item) =>
                    item.variantId === variantId ? { ...item, quantity: Math.min(item.quantity + 1, stock) } : item,
                );
            }

            const variant = product.variants.find((candidate) => candidate.id === variantId);
            if (!variant || stock <= 0) return current;
            return [...current, {
                productId: product.id,
                productName: product.name,
                variantId,
                sku: variant.sku,
                quantity: 1,
            }];
        });
    }

    async function handleSubmit() {
        if (!origin || !destinationId || !canSubmit) return;

        setSubmitError(null);
        try {
            const transfer = await createTransfer.mutateAsync({
                originBranchId: origin.id,
                destinationBranchId: destinationId,
                items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
            });
            router.replace({ pathname: '/transfers/[id]', params: { id: transfer.id } });
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'No se pudo crear la transferencia.');
        }
    }

    const header = (
        <View style={[SharedStyles.topBar, SharedStyles.topBarElevated]}>
            <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && SharedStyles.pressed]}
            >
                <SymbolView
                    name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                    size={24}
                    tintColor={Colors.text}
                />
            </Pressable>
            <Text style={styles.screenTitle}>Nueva transferencia</Text>
        </View>
    );

    if (!origin) {
        return (
            <Screen style={styles.screen}>
                {header}
                <EmptyState
                    title="Sin sucursal activa"
                    description="La transferencia sale de la sucursal activa. Elegila en Más → Sucursal activa."
                />
            </Screen>
        );
    }

    return (
        <Screen style={styles.screen}>
            {header}

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.label}>Origen</Text>
                    <Text style={styles.originName}>{origin.name}</Text>
                    <Text style={styles.hint}>Es la sucursal activa.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Destino</Text>
                    {destinations.length === 0 ? (
                        <Text style={styles.hint}>No hay otras sucursales activas.</Text>
                    ) : (
                        <View style={styles.chips}>
                            {destinations.map((branch) => (
                                <FilterChip
                                    key={branch.id}
                                    label={branch.name}
                                    selected={destinationId === branch.id}
                                    onPress={() => updateDraft((current) => ({ ...current, destinationId: branch.id }))}
                                />
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <View style={styles.cardTopRow}>
                        <Text style={styles.label}>Productos</Text>
                        <Pressable
                            onPress={() => setCatalogVisible(true)}
                            style={({ pressed }) => [pressed && SharedStyles.pressed]}
                        >
                            <Text style={styles.link}>Agregar</Text>
                        </Pressable>
                    </View>

                    {items.length === 0 ? (
                        <Text style={styles.hint}>Agregá los productos que salen de {origin.name}.</Text>
                    ) : (
                        items.map((item) => {
                            const stock = originStockByVariant.get(item.variantId) ?? 0;
                            const overStock = exceedsStock(item);
                            return (
                                <View key={item.variantId} style={styles.itemRow}>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.productName}</Text>
                                        <Text style={[styles.hint, overStock && styles.errorInline]}>
                                            {[`Stock en origen: ${stock}`, attributesByVariant.get(item.variantId)]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Text>
                                    </View>
                                    <View style={styles.qtyControls}>
                                        <Pressable
                                            style={styles.qtyButton}
                                            onPress={() => setQuantity(item.variantId, item.quantity - 1, stock)}
                                        >
                                            <SymbolView
                                                name={{ ios: 'minus', android: 'remove', web: 'remove' }}
                                                size={16}
                                                tintColor={Colors.text}
                                            />
                                        </Pressable>
                                        <Text style={styles.qtyText}>{item.quantity}</Text>
                                        <Pressable
                                            style={[styles.qtyButton, item.quantity >= stock && styles.qtyButtonDisabled]}
                                            disabled={item.quantity >= stock}
                                            onPress={() => setQuantity(item.variantId, item.quantity + 1, stock)}
                                        >
                                            <SymbolView
                                                name={{ ios: 'plus', android: 'add', web: 'add' }}
                                                size={16}
                                                tintColor={item.quantity >= stock ? Colors.textSecondary : Colors.text}
                                            />
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })
                    )}

                    {hasStockProblems && (
                        <Text style={styles.errorText}>
                            El stock en origen cambió: bajá las cantidades marcadas para poder transferir.
                        </Text>
                    )}
                </View>

                {submitError && <Text style={styles.errorText}>{submitError}</Text>}
            </ScrollView>

            <View style={styles.footer}>
                <AppButton
                    title={createTransfer.isPending
                        ? 'Transfiriendo...'
                        : `Transferir${totalUnits > 0 ? ` ${totalUnits} ${totalUnits === 1 ? 'unidad' : 'unidades'}` : ''}`}
                    onPress={() => void handleSubmit()}
                    disabled={!canSubmit}
                />
            </View>

            <Modal
                visible={isCatalogVisible}
                animationType="slide"
                onRequestClose={() => setCatalogVisible(false)}
            >
                <SafeAreaView style={styles.modal}>
                    <View style={SharedStyles.header}>
                        <View style={SharedStyles.headerSpacer} />
                        <View style={styles.modalTitleBox}>
                            <Text style={styles.modalTitle}>Productos</Text>
                            <Text style={styles.hint}>Stock de {origin.name}</Text>
                        </View>
                        <Pressable
                            onPress={() => setCatalogVisible(false)}
                            style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                        >
                            <Text style={styles.link}>Listo</Text>
                        </Pressable>
                    </View>

                    <View style={styles.modalBody}>
                        <VariantCatalog
                            branchId={originId}
                            products={products}
                            isLoading={isLoadingProducts}
                            errorMessage={isProductsError ? productsErrorMessage ?? 'No se pudieron cargar los productos.' : null}
                            onRefresh={loadProducts}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            getSelectedQuantity={(_productId, variantId) =>
                                items.find((item) => item.variantId === variantId)?.quantity ?? 0
                            }
                            onAddItem={addItem}
                            onUpdateItemQuantity={(_productId, variantId, quantity, stock) =>
                                setQuantity(variantId, quantity, stock)
                            }
                            showPrice={false}
                            selectedLabel="a transferir"
                            noBranchDescription="Seleccioná una sucursal activa."
                        />

                        <CartSummaryBar
                            itemsCount={totalUnits}
                            detail={selectionSummary}
                            actionLabel="Listo"
                            onPress={() => setCatalogVisible(false)}
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
        marginRight: Spacing.xs,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    originName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
    },
    hint: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    link: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
        paddingTop: Spacing.sm,
    },
    itemInfo: {
        flex: 1,
        gap: 2,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    qtyButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyButtonDisabled: {
        opacity: 0.4,
    },
    qtyText: {
        minWidth: 24,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    errorInline: {
        color: Colors.error,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    modal: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    // La barra de resumen va con position absolute: se apoya en este contenedor y no en el área segura.
    modalBody: {
        flex: 1,
    },
    modalTitleBox: {
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
    },
});
