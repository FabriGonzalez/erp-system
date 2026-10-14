import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ReactElement, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { RegisterCustomerPaymentModal } from '@/components/customers/RegisterCustomerPaymentModal';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import {
    useCancelPayment,
    useCustomerAccountSummaryQuery,
    useCustomerAccountTransactions,
    useCustomerPayments,
    useCustomerPendingOrders,
} from '@/hooks/use-customer-account-queries';
import { useCustomer } from '@/hooks/use-customer-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { AccountTransaction, CustomerPendingOrder } from '@/types/customer-account';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/order';
import { Payment } from '@/types/payment';
import { confirmAction } from '@/utils/confirm';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { hasPermission } from '@/utils/permissions';

type Section = 'pending' | 'payments' | 'transactions';

// Texto si el movimiento no trae descripción; el signo distingue cargo de reversión.
const TRANSACTION_FALLBACK: Record<AccountTransaction['type'], [string, string]> = {
    ORDER_CHARGE: ['Cargo por pedido', 'Reversión de pedido'],
    PAYMENT: ['Anulación de pago', 'Pago recibido'],
    REFUND: ['Devolución', 'Devolución'],
};

export default function CustomerDebtsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const canRegisterPayments = hasPermission(user, 'REGISTRAR_PAGOS');
    // Mismos permisos que GET /payments en el backend.
    const canViewPayments = canRegisterPayments
        || hasPermission(user, 'VER_PEDIDOS')
        || hasPermission(user, 'VER_REPORTES');

    const [section, setSection] = useState<Section>('pending');
    const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);

    const { customer } = useCustomer(id);
    const { summary } = useCustomerAccountSummaryQuery(id);
    const pendingOrders = useCustomerPendingOrders(id);
    const payments = useCustomerPayments(id, canViewPayments);
    const transactions = useCustomerAccountTransactions(id);

    const pendingCount = summary?.pendingOrders ?? pendingOrders.totalElements;

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
                    <Text style={styles.screenTitle} numberOfLines={1}>
                        {customer?.name ?? 'Cliente'}
                    </Text>

                    <Text style={styles.screenSubtitle}>
                        {pendingCount}{' '}
                        {pendingCount === 1
                            ? 'pedido con saldo pendiente'
                            : 'pedidos con saldo pendiente'}
                    </Text>
                </View>

                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.sections}>
                <FilterChip label="Pendientes" selected={section === 'pending'} onPress={() => setSection('pending')} />
                {canViewPayments && (
                    <FilterChip label="Pagos" selected={section === 'payments'} onPress={() => setSection('payments')} />
                )}
                <FilterChip
                    label="Movimientos"
                    selected={section === 'transactions'}
                    onPress={() => setSection('transactions')}
                />
            </View>

            <View style={styles.content}>
                {section === 'pending' && <PendingOrdersList list={pendingOrders} />}
                {section === 'payments' && canViewPayments && (
                    <PaymentsList list={payments} customerId={id} canCancel={canRegisterPayments} />
                )}
                {section === 'transactions' && <TransactionsList list={transactions} />}
            </View>

            <View style={styles.accountFooter}>
                {summary && summary.debt > 0 && (
                    <View style={styles.totalBanner}>
                        <Text style={styles.totalBannerLabel}>Deuda total</Text>
                        <Text style={styles.totalBannerAmount}>{formatCurrency(summary.debt)}</Text>
                    </View>
                )}

                {summary && summary.credit > 0 && (
                    <View style={styles.creditBanner}>
                        <Text style={styles.creditLabel}>Saldo a favor</Text>
                        <Text style={styles.creditAmount}>{formatCurrency(summary.credit)}</Text>
                    </View>
                )}

                {canRegisterPayments && (
                    <View style={styles.paymentButtonContainer}>
                        <AppButton title="Registrar pago" onPress={() => setPaymentModalVisible(true)} />
                    </View>
                )}
            </View>

            {canRegisterPayments && (
                <RegisterCustomerPaymentModal
                    visible={isPaymentModalVisible}
                    customerId={id}
                    onClose={() => setPaymentModalVisible(false)}
                />
            )}
        </Screen>
    );
}

type PagedList<T> = {
    items: T[];
    isInitialLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore: boolean;
    error: string | null;
    loadMore: () => void;
    refresh: () => void;
};

/** Carga inicial, error, vacío y scroll infinito, igual para las tres secciones. */
function SectionList<T>({
    list,
    keyOf,
    renderItem,
    empty,
}: {
    list: PagedList<T>;
    keyOf: (item: T) => string;
    renderItem: (item: T) => ReactElement;
    empty: { title: string; description: string };
}) {
    if (list.isInitialLoading) {
        return <LoadingState />;
    }

    if (list.error && list.items.length === 0) {
        return <ErrorState message={list.error} onRetry={list.refresh} />;
    }

    return (
        <FlatList
            data={list.items}
            keyExtractor={keyOf}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => renderItem(item)}
            onEndReached={list.loadMore}
            onEndReachedThreshold={0.4}
            refreshControl={
                <RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={<EmptyState title={empty.title} description={empty.description} />}
            ListFooterComponent={list.isLoadingMore ? <LoadingState label="Cargando más..." /> : null}
        />
    );
}

function PendingOrdersList({ list }: { list: PagedList<CustomerPendingOrder> }) {
    return (
        <SectionList
            list={list}
            keyOf={(order) => order.orderId}
            empty={{ title: 'Sin deudas pendientes', description: 'Este cliente no tiene pedidos con saldo pendiente.' }}
            renderItem={(order) => (
                <View style={styles.card}>
                    <View style={styles.cardTopRow}>
                        <View>
                            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                            <Text style={styles.secondaryText}>{formatDate(order.createdAt)}</Text>
                        </View>
                        <Text style={styles.secondaryText}>{ORDER_STATUS_LABELS[order.status]}</Text>
                    </View>

                    <Text style={styles.secondaryText}>Sucursal: {order.branchName}</Text>

                    <View style={styles.amountsRow}>
                        <Amount label="Total" value={order.total} />
                        <Amount label="Entregó" value={order.amountPaid} color={Colors.success} />
                        <Amount label="Debe" value={order.balance} color={Colors.error} />
                    </View>
                </View>
            )}
        />
    );
}

function PaymentsList({
    list,
    customerId,
    canCancel,
}: {
    list: PagedList<Payment>;
    customerId: string;
    canCancel: boolean;
}) {
    const cancelPayment = useCancelPayment(customerId);
    const [cancelError, setCancelError] = useState<string | null>(null);

    async function handleCancel(payment: Payment) {
        if (cancelPayment.isPending) return;

        const confirmed = await confirmAction({
            title: 'Anular pago',
            message:
                `Se anula el pago de ${formatCurrency(payment.amount)} del ${formatDate(payment.createdAt)}. ` +
                'Los pedidos a los que se aplicó vuelven a quedar con ese saldo pendiente.',
            confirmLabel: 'Anular pago',
            destructive: true,
        });
        if (!confirmed) return;

        setCancelError(null);
        try {
            await cancelPayment.mutateAsync(payment);
        } catch (error) {
            setCancelError(error instanceof Error ? error.message : 'No se pudo anular el pago.');
        }
    }

    return (
        <>
            {cancelError && <Text style={styles.errorText}>{cancelError}</Text>}
            <SectionList
                list={list}
                keyOf={(payment) => payment.id}
                empty={{ title: 'Sin pagos', description: 'Este cliente todavía no registró pagos.' }}
                renderItem={(payment) => {
                    const isCancelled = payment.status === 'CANCELLED';
                    return (
                        <View style={[styles.card, isCancelled && styles.cancelledCard]}>
                            <View style={styles.cardTopRow}>
                                <View>
                                    <Text style={[styles.paymentAmount, isCancelled && styles.cancelledAmount]}>
                                        {formatCurrency(payment.amount)}
                                    </Text>
                                    <Text style={styles.secondaryText}>
                                        {formatDateTime(payment.createdAt)} · {PAYMENT_METHOD_LABELS[payment.method]}
                                    </Text>
                                </View>
                                {isCancelled ? (
                                    <View style={styles.cancelledBadge}>
                                        <Text style={styles.cancelledBadgeText}>Anulado</Text>
                                    </View>
                                ) : canCancel ? (
                                    <Pressable
                                        onPress={() => void handleCancel(payment)}
                                        disabled={cancelPayment.isPending}
                                        style={({ pressed }) => [pressed && SharedStyles.pressed]}
                                    >
                                        <Text style={styles.cancelLink}>Anular</Text>
                                    </Pressable>
                                ) : null}
                            </View>

                            <Text style={styles.secondaryText}>
                                {[payment.branchName, payment.createdByUsername].filter(Boolean).join(' · ')}
                            </Text>

                            {isCancelled ? (
                                <Text style={styles.secondaryText}>
                                    Anulado el {payment.cancelledAt ? formatDateTime(payment.cancelledAt) : '—'}
                                    {payment.cancelledByUsername ? ` por ${payment.cancelledByUsername}` : ''}
                                </Text>
                            ) : (
                                <View style={styles.allocations}>
                                    {payment.allocations.map((allocation) => (
                                        <View key={allocation.orderId} style={styles.allocationRow}>
                                            <Text style={styles.allocationText}>{allocation.orderNumber}</Text>
                                            <Text style={styles.allocationText}>{formatCurrency(allocation.amount)}</Text>
                                        </View>
                                    ))}
                                    {payment.unallocatedAmount > 0 && (
                                        <View style={styles.allocationRow}>
                                            <Text style={styles.allocationText}>Saldo a favor</Text>
                                            <Text style={styles.allocationText}>
                                                {formatCurrency(payment.unallocatedAmount)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                }}
            />
        </>
    );
}

function TransactionsList({ list }: { list: PagedList<AccountTransaction> }) {
    return (
        <SectionList
            list={list}
            keyOf={(transaction) => transaction.id}
            empty={{ title: 'Sin movimientos', description: 'La cuenta de este cliente todavía no tiene movimientos.' }}
            renderItem={(transaction) => {
                // Positivo: el cliente debe más (cargo, anulación de pago, devolución).
                const increasesDebt = transaction.amount > 0;
                const [chargeLabel, creditLabel] = TRANSACTION_FALLBACK[transaction.type];
                return (
                    <View style={styles.transactionRow}>
                        <View style={styles.transactionInfo}>
                            <Text style={styles.transactionTitle}>
                                {transaction.description ?? (increasesDebt ? chargeLabel : creditLabel)}
                            </Text>
                            <Text style={styles.secondaryText}>
                                {[formatDateTime(transaction.createdAt), transaction.branchName]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.transactionAmount,
                                { color: increasesDebt ? Colors.error : Colors.success },
                            ]}
                        >
                            {increasesDebt ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount))}
                        </Text>
                    </View>
                );
            }}
        />
    );
}

function Amount({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>{label}</Text>
            <Text style={[styles.amountValue, color ? { color } : null]}>{formatCurrency(value)}</Text>
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

    sections: {
        flexDirection: 'row',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },

    content: {
        flex: 1,
    },

    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
        paddingBottom: Spacing.lg,
    },

    errorText: {
        color: Colors.error,
        fontSize: 13,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
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
        color: Colors.white,
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
        gap: Spacing.sm,
    },

    cancelledCard: {
        opacity: 0.7,
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

    secondaryText: {
        fontSize: 13,
        color: Colors.textSecondary,
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

    paymentAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },

    cancelledAmount: {
        textDecorationLine: 'line-through',
    },

    cancelledBadge: {
        backgroundColor: Colors.muted,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 20,
    },

    cancelledBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },

    cancelLink: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.error,
    },

    allocations: {
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
        paddingTop: Spacing.xs,
        gap: 2,
    },

    allocationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    allocationText: {
        fontSize: 13,
        color: Colors.text,
    },

    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    transactionInfo: {
        flex: 1,
        gap: 2,
    },

    transactionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },

    transactionAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
});
