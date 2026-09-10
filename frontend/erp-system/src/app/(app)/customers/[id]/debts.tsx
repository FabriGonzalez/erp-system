import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { getBalanceDue, Order } from '@/types/order';
import { formatCurrency, formatDate } from '@/utils/format';

export default function CustomerDebtsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const orders = useOrderStore((state) => state.orders);
    const activeBranch = useBranchStore((state) => state.activeBranch);

    const pendingOrders = useMemo(
        () =>
            orders.filter(
                (o) =>
                    o.customerId === id &&
                    o.status !== 'CANCELLED' &&
                    o.status !== 'DRAFT' &&
                    (!activeBranch || o.branchId === activeBranch.id) &&
                    getBalanceDue(o) > 0,
            ),
        [orders, id, activeBranch],
    );

    const customerName =
        pendingOrders[0]?.customerName ?? 'Cliente';

    const totalDebt = useMemo(
        () => pendingOrders.reduce((sum, o) => sum + getBalanceDue(o), 0),
        [pendingOrders],
    );

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={styles.topBar}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        styles.backButton,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <SymbolView
                        name={{
                            ios: 'chevron.left',
                            android: 'arrow_back',
                            web: 'arrow_back',
                        }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>

                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle} numberOfLines={1}>
                        {customerName}
                    </Text>
                    <Text style={styles.screenSubtitle}>
                        {pendingOrders.length}{' '}
                        {pendingOrders.length === 1
                            ? 'pedido con saldo pendiente'
                            : 'pedidos con saldo pendiente'}
                    </Text>
                </View>

                <View style={styles.headerSpacer} />
            </View>

            {/* Total summary banner */}
            {pendingOrders.length > 0 && (
                <View style={styles.totalBanner}>
                    <Text style={styles.totalBannerLabel}>Deuda total</Text>
                    <Text style={styles.totalBannerAmount}>
                        {formatCurrency(totalDebt)}
                    </Text>
                </View>
            )}

            {pendingOrders.length === 0 ? (
                <EmptyState
                    title="Sin deudas pendientes"
                    description="Este cliente no tiene saldo pendiente."
                    iconName={{
                        ios: 'checkmark.seal.fill',
                        android: 'verified',
                        web: 'verified',
                    }}
                />
            ) : (
                <FlatList
                    data={pendingOrders}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => <DebtOrderCard order={item} />}
                />
            )}
        </Screen>
    );
}

function DebtOrderCard({ order }: { order: Order }) {
    const balance = getBalanceDue(order);

    return (
        <View style={styles.card}>
            <View style={styles.cardTopRow}>
                <View>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                </View>
            </View>

            {/* Productos pedidos */}
            <View style={styles.itemsList}>
                {order.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                        <Text style={styles.itemName} numberOfLines={1}>
                            {item.productName}
                            {item.quantity > 1 ? `  x${item.quantity}` : ''}
                        </Text>
                        <Text style={styles.itemPrice}>
                            {formatCurrency(item.subtotal)}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.amountsRow}>
                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Total</Text>
                    <Text style={styles.amountValue}>
                        {formatCurrency(order.total)}
                    </Text>
                </View>
                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Entregó</Text>
                    <Text style={[styles.amountValue, { color: Colors.success }]}>
                        {formatCurrency(order.amountPaid)}
                    </Text>
                </View>
                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Debe</Text>
                    <Text style={[styles.amountValue, { color: Colors.error }]}>
                        {formatCurrency(balance)}
                    </Text>
                </View>
            </View>

            {/* Registrar pago – acción visual, pendiente de implementación */}
            <Pressable style={styles.registerPaymentBtn} disabled>
                <SymbolView
                    name={{
                        ios: 'dollarsign.circle',
                        android: 'payments',
                        web: 'payments',
                    }}
                    size={16}
                    tintColor={Colors.primary}
                />
                <Text style={styles.registerPaymentText}>Registrar pago</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
        marginRight: Spacing.xs,
    },
    titleContainer: {
        flex: 1,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    screenSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    headerSpacer: {
        width: 40,
    },
    totalBanner: {
        backgroundColor: Colors.error,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalBannerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.white,
        opacity: 0.9,
    },
    totalBannerAmount: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.white,
    },
    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
        paddingBottom: Spacing.xxl * 2,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.md,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    orderDate: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    itemsList: {
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
        borderBottomWidth: 1,
        borderBottomColor: Colors.muted,
        paddingVertical: Spacing.xs,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        gap: Spacing.sm,
    },
    itemName: {
        flex: 1,
        fontSize: 13,
        color: Colors.text,
    },
    itemPrice: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    amountsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.muted,
        borderRadius: 10,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    amountCol: {
        flex: 1,
        alignItems: 'center',
    },
    amountLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    registerPaymentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingVertical: Spacing.sm,
        opacity: 0.5,
    },
    registerPaymentText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
});