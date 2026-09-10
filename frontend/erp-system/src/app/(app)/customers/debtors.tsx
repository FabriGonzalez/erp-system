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
import { useBranchStore } from '@/stores/branch-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { getBalanceDue } from '@/types/order';

type DebtorSummary = {
    customerId: string;
    customerName: string;
    totalDebt: number;
    pendingOrdersCount: number;
};

export default function DebtorsScreen() {
    const orders = useOrderStore((state) => state.orders);
    const activeBranch = useBranchStore((state) => state.activeBranch);

    const debtors = useMemo((): DebtorSummary[] => {
        const map = new Map<string, DebtorSummary>();

        for (const order of orders) {
            if (order.status === 'CANCELLED' || order.status === 'DRAFT') continue;
            if (activeBranch && order.branchId !== activeBranch.id) continue;

            const balance = getBalanceDue(order);
            if (balance <= 0) continue;

            const existing = map.get(order.customerId);
            if (existing) {
                existing.totalDebt += balance;
                existing.pendingOrdersCount += 1;
            } else {
                map.set(order.customerId, {
                    customerId: order.customerId,
                    customerName: order.customerName,
                    totalDebt: balance,
                    pendingOrdersCount: 1,
                });
            }
        }

        return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt);
    }, [orders, activeBranch]);

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={styles.topBar}>
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

                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle}>Clientes que deben</Text>
                    <Text style={styles.screenSubtitle}>
                        {debtors.length}{' '}
                        {debtors.length === 1 ? 'cliente con deuda' : 'clientes con deuda'}
                    </Text>
                </View>

                <View style={styles.headerSpacer} />
            </View>

            {debtors.length === 0 ? (
                <EmptyState
                    title="Sin deudas pendientes"
                    description="Todos los clientes tienen sus pedidos al día."
                    iconName={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                />
            ) : (
                <FlatList
                    data={debtors}
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
                                    params: { id: item.customerId },
                                })
                            }
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.customerName}>{item.customerName}</Text>
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
                                    tintColor={Colors.textSecondary}
                                />
                            </View>
                            <View style={styles.debtRow}>
                                <Text style={styles.debtLabel}>Debe</Text>
                                <Text style={styles.debtAmount}>
                                    ${item.totalDebt.toLocaleString('es-AR')}
                                </Text>
                            </View>
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
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.errorLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.error,
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
    debtRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.errorLight,
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
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
});
