import { router } from 'expo-router';
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
import { useCustomerAccountStore } from '@/stores/customer-account-store';
import { useCustomerStore } from '@/stores/customer-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import { Order } from '@/types/order';
import {
    calculateCustomerCredit,
    calculateOrderBalanceDue,
} from '@/utils/customer-account';
import { formatCurrency } from '@/utils/format';

type CustomerAccountSummary = {
    customerId: string;
    customerName: string;
    totalDebt: number;
    availableCredit: number;
    pendingOrdersCount: number;
    originBranchNames: string[];
};

export default function CustomerAccountsScreen() {
    const orders = useOrderStore((state) => state.orders);
    const customers = useCustomerStore((state) => state.customers);

    const accounts = useCustomerAccountStore(
        (state) => state.accounts,
    );

    const payments = useCustomerAccountStore(
        (state) => state.payments,
    );

    const allocations = useCustomerAccountStore(
        (state) => state.allocations,
    );

    const accountsInActivity = useMemo(
        (): CustomerAccountSummary[] => {
            const customerIds = new Set<string>();

            // Clientes que tienen una cuenta corriente.
            for (const account of accounts) {
                if (account.customerId !== CUSTOMER_ANONYMOUS.id) {
                    customerIds.add(account.customerId);
                }
            }

            // Clientes que realizaron pagos.
            for (const payment of payments) {
                if (payment.customerId !== CUSTOMER_ANONYMOUS.id) {
                    customerIds.add(payment.customerId);
                }
            }

            // Clientes que tienen órdenes identificadas.
            for (const order of orders) {
                if (
                    order.customerId === CUSTOMER_ANONYMOUS.id ||
                    order.status === 'CANCELLED' ||
                    order.status === 'DRAFT'
                ) {
                    continue;
                }

                customerIds.add(order.customerId);
            }

            const summaries: CustomerAccountSummary[] = [];

            for (const customerId of customerIds) {
                const customerOrders: Order[] = [];
                const pendingOrders: Order[] = [];

                let totalDebt = 0;

                const branchNames = new Set<string>();

                // Buscamos las órdenes del cliente y calculamos
                // la deuda pendiente.
                for (const order of orders) {
                    if (order.customerId !== customerId) {
                        continue;
                    }

                    if (
                        order.status === 'CANCELLED' ||
                        order.status === 'DRAFT'
                    ) {
                        continue;
                    }

                    customerOrders.push(order);

                    const balance = calculateOrderBalanceDue(
                        order,
                        allocations,
                    );

                    if (balance <= 0) {
                        continue;
                    }

                    pendingOrders.push(order);
                    totalDebt += balance;

                    if (order.branchName) {
                        branchNames.add(order.branchName);
                    }
                }

                const availableCredit = calculateCustomerCredit(
                    customerId,
                    payments,
                    allocations,
                );

                const customer = customers.find(
                    (item) => item.id === customerId,
                );

                const customerName =
                    customer?.name ??
                    customerOrders[0]?.customerName ??
                    'Cliente';

                summaries.push({
                    customerId,
                    customerName,
                    totalDebt,
                    availableCredit,
                    pendingOrdersCount: pendingOrders.length,
                    originBranchNames: Array.from(branchNames),
                });
            }

            // Primero los clientes con mayor actividad económica.
            // La deuda y el crédito se mantienen separados visualmente.
            summaries.sort((left, right) => {
                const leftActivity =
                    left.totalDebt + left.availableCredit;

                const rightActivity =
                    right.totalDebt + right.availableCredit;

                return (
                    rightActivity - leftActivity ||
                    left.customerName.localeCompare(
                        right.customerName,
                    )
                );
            });

            return summaries;
        },
        [accounts, customers, orders, payments, allocations],
    );

    return (
        <Screen style={styles.screen}>
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
                    <Text style={styles.screenTitle}>
                        Cuentas corrientes
                    </Text>

                    <Text style={styles.screenSubtitle}>
                        {accountsInActivity.length}{' '}
                        {accountsInActivity.length === 1
                            ? 'cliente con actividad'
                            : 'clientes con actividad'}
                    </Text>
                </View>

                <View style={styles.headerSpacer} />
            </View>

            {accountsInActivity.length === 0 ? (
                <EmptyState
                    title="Sin actividad en cuentas corrientes"
                    description="Todavía no hay deudas, saldos a favor ni pagos registrados."
                    iconName={{
                        ios: 'checkmark.seal.fill',
                        android: 'verified',
                        web: 'verified',
                    }}
                />
            ) : (
                <FlatList
                    data={accountsInActivity}
                    keyExtractor={(item) => item.customerId}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <Pressable
                            style={({ pressed }) => [
                                styles.card,
                                pressed && styles.cardPressed,
                            ]}
                            onPress={() =>
                                router.push({
                                    pathname: '/customers/[id]/debts',
                                    params: {
                                        id: item.customerId,
                                    },
                                })
                            }
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.cardInfo}>
                                    <Text
                                        style={styles.customerName}
                                    >
                                        {item.customerName}
                                    </Text>

                                    <Text style={styles.ordersCount}>
                                        {item.pendingOrdersCount}{' '}
                                        {item.pendingOrdersCount === 1
                                            ? 'pedido pendiente'
                                            : 'pedidos pendientes'}
                                    </Text>
                                </View>

                                <SymbolView
                                    name={{
                                        ios: 'chevron.right',
                                        android: 'chevron_right',
                                        web: 'chevron_right',
                                    }}
                                    size={16}
                                    tintColor={
                                        Colors.textSecondary
                                    }
                                />
                            </View>

                            <View style={styles.accountValues}>
                                <View
                                    style={[
                                        styles.valueRow,
                                        styles.debtRow,
                                    ]}
                                >
                                    <Text
                                        style={styles.debtLabel}
                                    >
                                        Deuda
                                    </Text>

                                    <Text
                                        style={styles.debtAmount}
                                    >
                                        {formatCurrency(
                                            item.totalDebt,
                                        )}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.valueRow,
                                        styles.creditRow,
                                    ]}
                                >
                                    <Text
                                        style={styles.creditLabel}
                                    >
                                        Saldo a favor
                                    </Text>

                                    <Text
                                        style={styles.creditAmount}
                                    >
                                        {formatCurrency(
                                            item.availableCredit,
                                        )}
                                    </Text>
                                </View>
                            </View>

                            {item.originBranchNames.length > 0 && (
                                <Text style={styles.branches}>
                                    Sucursales:{' '}
                                    {item.originBranchNames.join(
                                        ', ',
                                    )}
                                </Text>
                            )}
                        </Pressable>
                    )}
                />
            )}
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
    },
    cardPressed: {
        opacity: 0.75,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    cardInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    ordersCount: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    accountValues: {
        gap: Spacing.xs,
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    debtRow: {
        backgroundColor: Colors.errorLight,
    },
    debtLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.error,
    },
    debtAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.error,
    },
    creditRow: {
        backgroundColor: Colors.successLight,
    },
    creditLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.successDark,
    },
    creditAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.successDark,
    },
    branches: {
        marginTop: Spacing.sm,
        fontSize: 12,
        color: Colors.textSecondary,
    },
});
