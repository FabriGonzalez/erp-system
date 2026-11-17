import { router, useLocalSearchParams } from 'expo-router';
import { ReactElement, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { RegisterCustomerPaymentModal } from '@/components/customers/RegisterCustomerPaymentModal';
import { ActionChip } from '@/components/ui/ActionChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { StatTile } from '@/components/ui/StatTile';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
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
import { orderStatusTone } from '@/utils/status';

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
            <PageHeader
                onBack={() => router.back()}
                eyebrow={`Cuenta corriente · ${pendingCount} ${pendingCount === 1 ? 'pedido pendiente' : 'pedidos pendientes'}`}
                title={customer?.name ?? 'Cliente'}
                right={canRegisterPayments ? (
                    <HeaderButton label="Pago" accessibilityLabel="Registrar pago" onPress={() => setPaymentModalVisible(true)} />
                ) : undefined}
            />

            {summary && (summary.debt > 0 || summary.credit > 0) ? (
                <View style={[SharedStyles.statRow, styles.stats]}>
                    {summary.debt > 0 ? (
                        <StatTile
                            label="Debe"
                            value={formatCurrency(summary.debt)}
                            icon={{ ios: 'exclamationmark.circle', android: 'error', web: 'error' }}
                            tone="danger"
                        />
                    ) : null}
                    {summary.credit > 0 ? (
                        <StatTile
                            label="Saldo a favor"
                            value={formatCurrency(summary.credit)}
                            icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                            tone="success"
                        />
                    ) : null}
                </View>
            ) : null}

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
            contentContainerStyle={SharedStyles.pageList}
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
                <View style={[SharedStyles.card, styles.card]}>
                    <View style={styles.cardTopRow}>
                        <View>
                            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                            <Text style={styles.secondaryText}>{formatDate(order.createdAt)}</Text>
                        </View>
                        <StatusPill label={ORDER_STATUS_LABELS[order.status]} tone={orderStatusTone(order.status)} />
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
                        <View style={[SharedStyles.card, styles.card, isCancelled && SharedStyles.listItemInactive]}>
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
                                    <StatusPill label="Anulado" tone="neutral" />
                                ) : canCancel ? (
                                    <ActionChip
                                        label="Anular"
                                        icon={{ ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' }}
                                        tone="danger"
                                        disabled={cancelPayment.isPending}
                                        onPress={() => void handleCancel(payment)}
                                    />
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
                    <View style={[SharedStyles.card, SharedStyles.listItem]}>
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






    sections: {
        flexDirection: 'row',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
    },

    content: {
        flex: 1,
    },


    errorText: {
        color: Colors.error,
        fontSize: 13,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
    },









    stats: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xs,
    },
    card: {
        padding: Spacing.md,
        gap: Spacing.sm,
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
        borderRadius: Radius.sm,
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
