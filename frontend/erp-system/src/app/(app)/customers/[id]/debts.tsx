import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { RegisterCustomerPaymentModal } from '@/components/customers/RegisterCustomerPaymentModal';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useCustomerAccountStore } from '@/stores/customer-account-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { Order } from '@/types/order';
import {
    calculateCustomerCredit,
    calculateOrderBalanceDue,
    calculateOrderPaidAmount,
    sortOrdersFifo,
} from '@/utils/customer-account';
import { formatCurrency, formatDate } from '@/utils/format';

export default function CustomerDebtsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const orders = useOrderStore((state) => state.orders);
    const activeBranch = useBranchStore((state) => state.activeBranch);

    const allocations = useCustomerAccountStore(
        (state) => state.allocations,
    );

    const payments = useCustomerAccountStore(
        (state) => state.payments,
    );

    const [isPaymentModalVisible, setPaymentModalVisible] =
        useState(false);

    const pendingOrders = useMemo(
        () =>
            orders.filter(
                (order) =>
                    order.customerId === id &&
                    order.status !== 'CANCELLED' &&
                    order.status !== 'DRAFT' &&
                    calculateOrderBalanceDue(
                        order,
                        allocations,
                    ) > 0,
            ),
        [orders, id, allocations],
    );

    const sortedPendingOrders = useMemo(
        () => sortOrdersFifo(pendingOrders),
        [pendingOrders],
    );

    const customerName =
        orders.find(
            (order) => order.customerId === id,
        )?.customerName ?? 'Cliente';

    const totalDebt = useMemo(() => {
        let total = 0;

        for (const order of pendingOrders) {
            total += calculateOrderBalanceDue(
                order,
                allocations,
            );
        }

        return total;
    }, [pendingOrders, allocations]);

    const customerCredit = useMemo(
        () =>
            calculateCustomerCredit(
                id,
                payments,
                allocations,
            ),
        [id, payments, allocations],
    );

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={[SharedStyles.topBar, SharedStyles.topBarElevated]}>
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
                    <Text
                        style={styles.screenTitle}
                        numberOfLines={1}
                    >
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

            {/* Orders */}
            <View style={styles.ordersContainer}>
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
                        data={sortedPendingOrders}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={
                            styles.listContainer
                        }
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <DebtOrderCard
                                order={item}
                                allocations={allocations}
                            />
                        )}
                    />
                )}
            </View>

            {/* Account footer */}
            <View style={styles.accountFooter}>
                {totalDebt > 0 && (
                    <View style={styles.totalBanner}>
                        <Text style={styles.totalBannerLabel}>
                            Deuda total
                        </Text>

                        <Text
                            style={styles.totalBannerAmount}
                        >
                            {formatCurrency(totalDebt)}
                        </Text>
                    </View>
                )}

                {customerCredit > 0 && (
                    <View style={styles.creditBanner}>
                        <Text style={styles.creditLabel}>
                            Saldo a favor
                        </Text>

                        <Text style={styles.creditAmount}>
                            {formatCurrency(customerCredit)}
                        </Text>
                    </View>
                )}

                <View style={styles.paymentButtonContainer}>
                    <AppButton
                        title="Registrar pago"
                        onPress={() =>
                            setPaymentModalVisible(true)
                        }
                    />
                </View>
            </View>

            <RegisterCustomerPaymentModal
                visible={isPaymentModalVisible}
                customerId={id}
                orders={orders}
                branchId={activeBranch?.id}
                onClose={() =>
                    setPaymentModalVisible(false)
                }
            />
        </Screen>
    );
}

function DebtOrderCard({
    order,
    allocations,
}: {
    order: Order;
    allocations: Parameters<
        typeof calculateOrderBalanceDue
    >[1];
}) {
    const balance = calculateOrderBalanceDue(
        order,
        allocations,
    );

    const amountPaid = calculateOrderPaidAmount(
        order.id,
        allocations,
    );

    return (
        <View style={styles.card}>
            <View style={styles.cardTopRow}>
                <View>
                    <Text style={styles.orderNumber}>
                        {order.orderNumber}
                    </Text>

                    <Text style={styles.orderDate}>
                        {formatDate(order.createdAt)}
                    </Text>
                </View>
            </View>

            <Text style={styles.itemName}>
                Sucursal: {order.branchName}
            </Text>

            <View style={styles.itemsList}>
                {order.items.map((item) => (
                    <View
                        key={item.id}
                        style={styles.itemRow}
                    >
                        <Text
                            style={styles.itemName}
                            numberOfLines={1}
                        >
                            {item.productName}
                            {item.quantity > 1
                                ? `  x${item.quantity} `
                                : ''}
                        </Text>

                        <Text style={styles.itemPrice}>
                            {formatCurrency(item.subtotal)}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.amountsRow}>
                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>
                        Total
                    </Text>

                    <Text style={styles.amountValue}>
                        {formatCurrency(order.total)}
                    </Text>
                </View>

                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>
                        Entregó
                    </Text>

                    <Text
                        style={[
                            styles.amountValue,
                            {
                                color: Colors.success,
                            },
                        ]}
                    >
                        {formatCurrency(amountPaid)}
                    </Text>
                </View>

                <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>
                        Debe
                    </Text>

                    <Text
                        style={[
                            styles.amountValue,
                            {
                                color: Colors.error,
                            },
                        ]}
                    >
                        {formatCurrency(balance)}
                    </Text>
                </View>
            </View>
        </View>
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

    ordersContainer: {
        flex: 1,
    },

    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
        paddingBottom: Spacing.lg,
    },

    accountFooter: {
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
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
        fontSize: 22,
        fontWeight: '600',
        color: Colors.white
    },

    totalBannerAmount: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.white,
    },

    creditBanner: {
        backgroundColor: Colors.successLight,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    creditLabel: {
        fontSize: 22,
        color: Colors.successDark,
        fontWeight: '600',
    },

    creditAmount: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.successDark,
    },

    paymentButtonContainer: {
        padding: Spacing.lg,
        paddingTop: Spacing.sm,
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
});