import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useKeyedQuery } from '@/hooks/use-keyed-query';
import { getDebtors } from '@/services/customer-account-service';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { formatCurrency, formatDate } from '@/utils/format';

// El backend admite hasta 100 por página; el paginado completo llega con la etapa de
// cuenta corriente.
const DEBTORS_PAGE_SIZE = 100;

export default function CustomerAccountsScreen() {
    const token = useAuthStore((state) => state.token);

    // Deudores calculados por el backend (GET /customers/debtors), de mayor a menor deuda.
    const { data, error, isLoading, reload } = useKeyedQuery(
        token ? `debtors|${token}` : null,
        () => getDebtors({ page: 0, size: DEBTORS_PAGE_SIZE }, token as string),
        'No se pudieron cargar los deudores.',
    );

    const debtors = data?.content ?? [];
    const totalDebtors = data?.totalElements ?? 0;

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
                        {!data
                            ? 'Cargando...'
                            : `${totalDebtors} ${totalDebtors === 1 ? 'cliente con deuda' : 'clientes con deuda'}`}
                    </Text>
                </View>

                <View style={styles.headerSpacer} />
            </View>

            {!data && isLoading ? (
                <LoadingState label="Cargando deudores..." />
            ) : !data && error ? (
                <ErrorState message={error} onRetry={reload} />
            ) : debtors.length === 0 ? (
                <EmptyState
                    title="Sin deudas pendientes"
                    description="Ningún cliente tiene pedidos con saldo pendiente."
                    iconName={{
                        ios: 'checkmark.seal.fill',
                        android: 'verified',
                        web: 'verified',
                    }}
                />
            ) : (
                <FlatList
                    data={debtors}
                    keyExtractor={(item) => item.customerId}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={reload}
                            tintColor={Colors.primary}
                        />
                    }
                    ListFooterComponent={
                        totalDebtors > debtors.length ? (
                            <Text style={styles.branches}>
                                Mostrando {debtors.length} de {totalDebtors} clientes con mayor deuda.
                            </Text>
                        ) : null
                    }
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
                                        {item.pendingOrders}{' '}
                                        {item.pendingOrders === 1
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
                                            item.debt,
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
                                            item.credit,
                                        )}
                                    </Text>
                                </View>
                            </View>

                            {item.oldestPendingOrderAt ? (
                                <Text style={styles.branches}>
                                    Pendiente desde el{' '}
                                    {formatDate(item.oldestPendingOrderAt)}
                                </Text>
                            ) : null}
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
