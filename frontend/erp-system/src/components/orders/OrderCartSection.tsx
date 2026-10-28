import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconName } from '@/components/ui/icon-name';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { OrderItem, OrderPromo } from '@/types/order';
import { formatCurrency } from '@/utils/format';

export type CatalogTab = 'PRODUCTS' | 'PROMOS';

type OrderCartSectionProps = {
    items: OrderItem[];
    promos: OrderPromo[];
    onAddProducts: (tab: CatalogTab) => void;
    onUpdateQuantity: (productId: string, variantId: string, newQuantity: number) => void;
    onUpdatePromoQuantity: (lineId: string, newQuantity: number) => void;
};

const MINUS: IconName = { ios: 'minus', android: 'remove', web: 'remove' };
const TRASH: IconName = { ios: 'trash', android: 'delete', web: 'delete' };
const PLUS: IconName = { ios: 'plus', android: 'add', web: 'add' };

/** Botones para agregar productos o promos y el ticket con cantidades y subtotales. */
export function OrderCartSection({
    items,
    promos,
    onAddProducts,
    onUpdateQuantity,
    onUpdatePromoQuantity,
}: OrderCartSectionProps) {
    const isEmpty = items.length === 0 && promos.length === 0;

    return (
        <View style={styles.container}>
            <View style={styles.actions}>
                <Pressable
                    style={({ pressed }) => [styles.action, styles.actionWide, pressed && SharedStyles.listItemPressed]}
                    onPress={() => onAddProducts('PRODUCTS')}
                >
                    <SymbolView
                        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                        size={18}
                        tintColor={Colors.primary}
                    />
                    <Text style={styles.actionText}>Agregar producto</Text>
                </Pressable>
                <Pressable
                    style={({ pressed }) => [styles.action, pressed && SharedStyles.listItemPressed]}
                    onPress={() => onAddProducts('PROMOS')}
                >
                    <SymbolView name={{ ios: 'tag', android: 'sell', web: 'sell' }} size={16} tintColor={Colors.rose} />
                    <Text style={[styles.actionText, styles.promoActionText]}>Promo</Text>
                </Pressable>
            </View>

            {isEmpty ? (
                <View style={[SharedStyles.card, styles.empty]}>
                    <Text style={styles.emptyTitle}>Todavía no hay productos</Text>
                    <Text style={styles.emptyText}>Agregá productos o promos para armar la venta.</Text>
                </View>
            ) : (
                <View style={[SharedStyles.card, styles.ticket]}>
                    {items.map((item, index) => (
                        <TicketLine
                            key={item.id}
                            first={index === 0}
                            title={item.productName}
                            details={[`${item.productSku} · ${formatCurrency(item.unitPrice)} c/u`]}
                            quantity={item.quantity}
                            subtotal={item.subtotal}
                            onChange={(quantity) => onUpdateQuantity(item.productId, item.variantId, quantity)}
                        />
                    ))}
                    {promos.map((promo, index) => (
                        <TicketLine
                            key={promo.id}
                            first={items.length === 0 && index === 0}
                            isPromo
                            title={promo.name}
                            details={promo.components.map((component) =>
                                `${component.quantity}× ${component.productName}${component.variantName ? ` (${component.variantName})` : ''}`)}
                            quantity={promo.quantity}
                            subtotal={promo.subtotal}
                            onChange={(quantity) => onUpdatePromoQuantity(promo.id, quantity)}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

type TicketLineProps = {
    first: boolean;
    isPromo?: boolean;
    title: string;
    details: string[];
    quantity: number;
    subtotal: number;
    /** Con 0 el store saca la línea. */
    onChange: (quantity: number) => void;
};

function TicketLine({ first, isPromo = false, title, details, quantity, subtotal, onChange }: TicketLineProps) {
    const isLast = quantity <= 1;

    return (
        <View style={[styles.line, !first && styles.lineDivider]}>
            <View style={styles.lineTexts}>
                <View style={styles.lineTitleRow}>
                    {isPromo ? <Text style={styles.promoTag}>PROMO</Text> : null}
                    <Text style={styles.lineTitle} numberOfLines={2}>{title}</Text>
                </View>
                {details.map((detail) => (
                    <Text key={detail} style={styles.lineDetail} numberOfLines={1}>{detail}</Text>
                ))}
            </View>

            <View style={styles.stepper}>
                <Pressable
                    style={styles.stepperButton}
                    onPress={() => onChange(quantity - 1)}
                    accessibilityLabel={isLast ? `Quitar ${title}` : `Una menos de ${title}`}
                >
                    <SymbolView name={isLast ? TRASH : MINUS} size={16} tintColor={isLast ? Colors.errorDark : Colors.text} />
                </Pressable>
                <Text style={styles.stepperText}>{quantity}</Text>
                <Pressable
                    style={styles.stepperButton}
                    onPress={() => onChange(quantity + 1)}
                    accessibilityLabel={`Una más de ${title}`}
                >
                    <SymbolView name={PLUS} size={16} tintColor={Colors.text} />
                </Pressable>
            </View>

            <Text style={styles.subtotal}>{formatCurrency(subtotal)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.md,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        minHeight: 48,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    actionWide: {
        flex: 1,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    promoActionText: {
        color: Colors.rose,
    },
    empty: {
        alignItems: 'center',
        gap: 4,
        paddingVertical: Spacing.xl,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    emptyText: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    ticket: {
        padding: 0,
    },
    line: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
    },
    lineDivider: {
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
    },
    lineTexts: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    lineTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    lineTitle: {
        flexShrink: 1,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    lineDetail: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    promoTag: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.rose,
        backgroundColor: Colors.roseLight,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        overflow: 'hidden',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.sm,
        backgroundColor: Colors.muted,
    },
    stepperButton: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperText: {
        minWidth: 20,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '800',
        color: Colors.text,
    },
    subtotal: {
        minWidth: 72,
        textAlign: 'right',
        fontSize: 14,
        fontWeight: '800',
        color: Colors.text,
    },
});
