import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconBadge } from '@/components/ui/IconBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Product } from '@/types/product';
import { formatCurrency } from '@/utils/format';
import { stockPill } from '@/utils/status';

type ProductCardProps = {
    product: Product;
    stock: number;
    canEdit?: boolean;
    onPress?: () => void;
};

export function ProductCard({ product, stock, canEdit = false, onPress }: ProductCardProps) {
    const pill = stockPill(stock);
    const prices = product.variants.map((variant) => variant.price).filter(Number.isFinite);
    const lowestPrice = prices.length ? Math.min(...prices) : 0;
    const highestPrice = prices.length ? Math.max(...prices) : 0;
    const priceLabel = lowestPrice === highestPrice
        ? formatCurrency(lowestPrice)
        : `${formatCurrency(lowestPrice)} – ${formatCurrency(highestPrice)}`;
    const variantsLabel = product.variants.length === 1
        ? product.variants[0]?.sku ?? 'Sin variantes'
        : `${product.variants.length} variantes`;
    const meta = product.categoryName ? `${product.categoryName} · ${variantsLabel}` : variantsLabel;

    return (
        <Pressable
            style={({ pressed }) => [
                SharedStyles.card,
                styles.card,
                !product.active && styles.inactive,
                pressed && canEdit && styles.pressed,
            ]}
            onPress={canEdit ? onPress : undefined}
            disabled={!canEdit}
            accessibilityRole={canEdit ? 'button' : undefined}
        >
            <IconBadge
                icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
                tone="neutral"
                size={52}
            />
            <View style={styles.texts}>
                <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
                {product.description ? (
                    <Text style={styles.meta} numberOfLines={1}>{product.description}</Text>
                ) : null}
                <Text style={styles.price}>{priceLabel}</Text>
            </View>
            <View style={styles.pills}>
                <StatusPill label={pill.label} tone={pill.tone} />
                {!product.active ? <StatusPill label="Inactivo" tone="neutral" /> : null}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        marginBottom: Spacing.sm,
    },
    inactive: {
        opacity: 0.7,
    },
    pressed: {
        backgroundColor: Colors.muted,
    },
    texts: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    meta: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    price: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    pills: {
        alignItems: 'flex-end',
        gap: Spacing.xs,
    },
});
