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
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { getBalanceDue, Order } from '@/types/order';
import { formatDate } from '@/utils/format';

export default function CustomerDebtsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const orders = useOrderStore((state) => state.orders);

    const pendingOrders = useMemo(
        () =>
            orders.filter(
                (o) =>
                    o.customerId === id &&
                    o.status !== 'CANCELLED' &&
                    getBalanceDue(o) > 0,
            ),
        [orders, id],
    );

    const customerName =
        pendingOrders[0]?.customerName ?? 'Cliente';

    const totalDebt = useMemo(
        () => pendingOrders.reduce((sum, o) => sum + getBalanceDue(o), 0),
        [pendingOrders],
    );

    function handleViewOrder(orderId: string) {
        router.push({
            pathname: '/orders/[id]',
            params: { id: orderId },
        });
    }

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
                        ${totalDebt.toLocaleString('es-AR')}
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
                    renderItem={({ item }) => (
                        <DebtOrderCard order={item} onPress={() => handleViewOrder(item.id)} />
                    )}
                />
            )}
        </Screen>
    );
}

function DebtOrderCard({
    order,
    onPress,
}: {
    order: Order;
    onPress: () => void;
}) {
    const balance = getBalanceDue(order);

    return (
        <View style={styles.card}>
            <View style={styles.cardTopRow}>
                <View>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                </View>
                <Pressable
                    style={({ pressed }) => [
                        styles.viewBtn,
                        pressed && styles.viewBtnPressed,
                    ]}
                    onPress={onPress}
                >
                    <Text style={styles.viewBtnText}>Ver pedido</Text>
                </Pressable>
            </View>

            <View style={styles.amountsRow}>
                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Total</Text>
                    <Text style={styles.amountValue}>
                        ${order.total.toLocaleString('es-AR')}
                    </Text>
                </View>
                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Entregó</Text>
                    <Text style={[styles.amountValue, { color: Colors.success }]}>
                        ${order.amountPaid.toLocaleString('es-AR')}
                    </Text>
                </View>
                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Debe</Text>
                    <Text style={[styles.amountValue, { color: Colors.error }]}>
                        ${balance.toLocaleString('es-AR')}
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
    viewBtn: {
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: 8,
    },
    viewBtnPressed: {
        opacity: 0.7,
    },
    viewBtnText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '600',
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
