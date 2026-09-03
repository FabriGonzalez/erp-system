import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { OrderItem } from '@/types/order';

type OrderCartSectionProps = {
    items: OrderItem[];
    onAddProducts: () => void;
    onUpdateQuantity: (productId: string, newQuantity: number) => void;
    onRemoveItem: (productId: string) => void;
};

export function OrderCartSection({
    items,
    onAddProducts,
    onUpdateQuantity,
    onRemoveItem,
}: OrderCartSectionProps) {
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Productos en el pedido ({items.length})</Text>
                <Pressable onPress={onAddProducts} style={styles.addBtnHeader}>
                    <SymbolView
                        name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                        size={16}
                        tintColor={Colors.primary}
                    />
                    <Text style={styles.addBtnHeaderText}>
                        {items.length === 0 ? 'Seleccionar' : 'Modificar'}
                    </Text>
                </Pressable>
            </View>

            {items.length === 0 ? (
                <Pressable
                    style={({ pressed }) => [styles.emptyCartBox, pressed && SharedStyles.pressed]}
                    onPress={onAddProducts}
                >
                    <SymbolView
                        name={{ ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' }}
                        size={32}
                        tintColor={Colors.textSecondary}
                    />
                    <Text style={styles.emptyCartTitle}>No agregaste productos aún</Text>
                    <Text style={styles.emptyCartSub}>
                        Tocá aquí para explorar el catálogo y agregar ítems al pedido
                    </Text>
                    <View style={styles.selectProductsButton}>
                        <Text style={styles.selectProductsButtonText}>+ Agregar productos</Text>
                    </View>
                </Pressable>
            ) : (
                <View style={styles.cartContainer}>
                    {items.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                            <View style={styles.itemMainInfo}>
                                <Text style={styles.itemName}>{item.productName}</Text>
                                <Text style={styles.itemSku}>SKU: {item.productSku}</Text>
                                <Text style={styles.itemUnitPrice}>
                                    ${item.unitPrice.toLocaleString('es-AR')} c/u
                                </Text>
                            </View>

                            <View style={styles.itemQuantityAndSubtotal}>
                                <View style={styles.quantityControls}>
                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                                    >
                                        <SymbolView
                                            name={{ ios: 'minus', android: 'remove', web: 'remove' }}
                                            size={14}
                                            tintColor={Colors.text}
                                        />
                                    </Pressable>

                                    <Text style={styles.qtyText}>{item.quantity}</Text>

                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                                    >
                                        <SymbolView
                                            name={{ ios: 'plus', android: 'add', web: 'add' }}
                                            size={14}
                                            tintColor={Colors.text}
                                        />
                                    </Pressable>
                                </View>

                                <Text style={styles.subtotalText}>
                                    ${item.subtotal.toLocaleString('es-AR')}
                                </Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.cartFooter}>
                        <Text style={styles.cartTotalLabel}>Subtotal pedido:</Text>
                        <Text style={styles.cartTotalValue}>
                            ${totalAmount.toLocaleString('es-AR')}
                        </Text>
                    </View>

                    <Pressable
                        style={({ pressed }) => [styles.addMoreBtn, pressed && SharedStyles.pressed]}
                        onPress={onAddProducts}
                    >
                        <SymbolView
                            name={{ ios: 'plus', android: 'add', web: 'add' }}
                            size={16}
                            tintColor={Colors.primary}
                        />
                        <Text style={styles.addMoreBtnText}>Agregar más productos</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs + 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    addBtnHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addBtnHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
    emptyCartBox: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.border,
    },
    emptyCartTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginTop: Spacing.sm,
    },
    emptyCartSub: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: Spacing.md,
    },
    selectProductsButton: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
    },
    selectProductsButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    cartContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    itemMainInfo: {
        flex: 1,
        paddingRight: Spacing.sm,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    itemSku: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    itemUnitPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    itemQuantityAndSubtotal: {
        alignItems: 'flex-end',
        gap: 6,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        paddingHorizontal: 8,
    },
    subtotalText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    cartFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    cartTotalLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    cartTotalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.primary,
    },
    addMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        paddingVertical: Spacing.sm,
        gap: 6,
        borderWidth: 1,
        borderColor: Colors.border,
        marginTop: Spacing.xs,
    },
    addMoreBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
});
