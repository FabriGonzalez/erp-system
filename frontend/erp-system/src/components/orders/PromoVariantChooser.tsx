import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { ModalScreen } from '@/components/ui/ModalScreen';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useProduct } from '@/hooks/use-product-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { OrderPromoComponent } from '@/types/order';
import { ProductVariant } from '@/types/product';
import { Promotion, PromotionItem } from '@/types/promotion';
import { draftUnitsByVariant } from '@/utils/draft-stock';
import { formatCurrency } from '@/utils/format';

type PromoVariantChooserProps = {
    promotion: Promotion;
    /** Sucursal del pedido: su stock limita qué variantes se pueden elegir. */
    branchId: string;
    onClose: () => void;
    onConfirm: (components: OrderPromoComponent[]) => void;
};

/** Variante elegida para cada unidad, por producto de la promo. */
type Selections = Record<string, (ProductVariant | null)[]>;

function variantLabel(variant: ProductVariant) {
    return variant.attributes.map((attribute) => attribute.valueName).filter(Boolean).join(' · ') || 'Única';
}

/**
 * Elige la variante de cada unidad de una promo (2 remeras: una M y una L, o las dos M). Una
 * variante se puede elegir mientras quede stock en la sucursal después de lo que ya usa el
 * borrador y lo elegido en este mismo selector.
 */
export function PromoVariantChooser({ promotion, branchId, onClose, onConfirm }: PromoVariantChooserProps) {
    const [selections, setSelections] = useState<Selections>(() =>
        Object.fromEntries(promotion.items.map((item) => [item.productId, Array(item.quantity).fill(null)])));

    const chosen = Object.values(selections).flat();
    const isComplete = chosen.every((variant) => variant !== null);
    const chosenTotal = chosen.reduce((sum, variant) => sum + (variant?.price ?? 0), 0);

    function countChosen(variantId: string) {
        return chosen.filter((variant) => variant?.id === variantId).length;
    }

    function select(productId: string, unit: number, variant: ProductVariant) {
        setSelections((current) => ({
            ...current,
            [productId]: current[productId].map((selected, index) => index === unit ? variant : selected),
        }));
    }

    function handleConfirm() {
        const units = new Map<string, OrderPromoComponent>();
        promotion.items.forEach((item) => {
            for (const variant of selections[item.productId]) {
                if (!variant) continue;
                const existing = units.get(variant.id);
                units.set(variant.id, existing
                    ? { ...existing, quantity: existing.quantity + 1 }
                    : {
                        productId: item.productId,
                        productName: item.productName,
                        variantId: variant.id,
                        sku: variant.sku,
                        variantName: variant.attributes.map((attribute) => attribute.valueName).filter(Boolean).join(' · '),
                        quantity: 1,
                    });
            }
        });
        onConfirm([...units.values()]);
    }

    return (
        <ModalScreen
            title={promotion.name}
            eyebrow={`Promo · ${formatCurrency(promotion.price)}`}
            onClose={onClose}
            closeLabel="Cancelar"
        >
            <ScrollView contentContainerStyle={styles.content}>
                {promotion.items.map((item) => (
                    <ProductUnits
                        key={item.productId}
                        item={item}
                        branchId={branchId}
                        selected={selections[item.productId]}
                        countChosen={countChosen}
                        onSelect={(unit, variant) => select(item.productId, unit, variant)}
                    />
                ))}
            </ScrollView>

            <View style={styles.footer}>
                {isComplete ? (
                    <Text style={styles.summary}>
                        Sueltos: {formatCurrency(chosenTotal)} · Promo: {formatCurrency(promotion.price)}
                        {chosenTotal > promotion.price ? ` · Ahorra ${formatCurrency(chosenTotal - promotion.price)}` : ''}
                    </Text>
                ) : (
                    <Text style={styles.summary}>Elegí la variante de cada unidad.</Text>
                )}
                <AppButton title="Agregar al pedido" onPress={handleConfirm} disabled={!isComplete} />
            </View>
        </ModalScreen>
    );
}

type ProductUnitsProps = {
    item: PromotionItem;
    branchId: string;
    selected: (ProductVariant | null)[];
    countChosen: (variantId: string) => number;
    onSelect: (unit: number, variant: ProductVariant) => void;
};

/** Las unidades de un producto de la promo, cada una con sus variantes para elegir. */
function ProductUnits({ item, branchId, selected, countChosen, onSelect }: ProductUnitsProps) {
    // Las variantes y su stock por sucursal vienen en el producto.
    const { product, isLoading, loadError } = useProduct(item.productId);
    const items = useOrderDraftStore((state) => state.items);
    const promos = useOrderDraftStore((state) => state.promos);
    const originalUnits = useOrderDraftStore((state) => state.originalUnits);
    const draftUnits = draftUnitsByVariant(items, promos);

    const variants = (product?.variants ?? []).filter((variant) => variant.active !== false);

    // Lo que queda de la variante para una unidad más: el stock de la sucursal, más lo que el
    // pedido en edición ya tenía descontado, menos lo que usa el borrador y lo ya elegido acá.
    function remaining(variant: ProductVariant) {
        return (variant.stockByBranch[branchId] ?? 0) + (originalUnits[variant.id] ?? 0)
            - (draftUnits[variant.id] ?? 0) - countChosen(variant.id);
    }

    return (
        <View style={styles.card}>
            <Text style={styles.productName}>{item.productName}</Text>
            {isLoading ? (
                <Text style={styles.hint}>Cargando variantes...</Text>
            ) : loadError || variants.length === 0 ? (
                <Text style={styles.errorText}>{loadError ?? 'El producto no tiene variantes activas.'}</Text>
            ) : (
                selected.map((current, unit) => (
                    <View key={unit} style={styles.unit}>
                        {selected.length > 1 ? (
                            <Text style={styles.hint}>Unidad {unit + 1} de {selected.length}</Text>
                        ) : null}
                        <View style={styles.chips}>
                            {variants.map((variant) => {
                                const isSelected = current?.id === variant.id;
                                const isAvailable = isSelected || remaining(variant) > 0;
                                return (
                                    <Pressable
                                        key={variant.id}
                                        style={[styles.chip, isSelected && styles.chipSelected, !isAvailable && styles.chipDisabled]}
                                        onPress={() => onSelect(unit, variant)}
                                        disabled={!isAvailable}
                                    >
                                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                            {variantLabel(variant)}
                                        </Text>
                                        <Text style={[styles.chipDetail, isSelected && styles.chipTextSelected]}>
                                            {isAvailable ? formatCurrency(variant.price) : 'Sin stock'}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.md,
    },
    productName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    unit: {
        gap: Spacing.xs,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    // Botones de buen tamaño: se eligen rápido, con el cliente esperando.
    chip: {
        minWidth: 64,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },
    chipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipDisabled: {
        opacity: 0.4,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    chipDetail: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    chipTextSelected: {
        color: Colors.white,
    },
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    errorText: {
        fontSize: 13,
        color: Colors.error,
    },
    footer: {
        padding: Spacing.lg,
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    summary: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
});
