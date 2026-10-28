import { router } from 'expo-router';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useDebtors } from '@/hooks/use-customer-account-queries';
import { SharedStyles } from '@/styles/shared';
import { formatCurrency, formatDate } from '@/utils/format';

export default function CustomerAccountsScreen() {
    // Deudores calculados por el backend (GET /customers/debtors), de mayor a menor deuda.
    const {
        items: debtors,
        totalElements: totalDebtors,
        isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error,
        loadMore,
        refresh: reload,
    } = useDebtors();
    const hasData = !isInitialLoading && !(error && debtors.length === 0);

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={!hasData
                    ? 'Cargando...'
                    : `${totalDebtors} ${totalDebtors === 1 ? 'cliente con deuda' : 'clientes con deuda'}`}
                title="Cuentas corrientes"
            />

            {isInitialLoading ? (
                <LoadingState label="Cargando deudores..." />
            ) : error && debtors.length === 0 ? (
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
                    contentContainerStyle={SharedStyles.pageList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={reload}
                            tintColor={Colors.primary}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        isLoadingMore ? <LoadingState label="Cargando más..." /> : null
                    }
                    renderItem={({ item }) => (
                        <Pressable
                            style={({ pressed }) => [
                                SharedStyles.card,
                                SharedStyles.listItem,
                                pressed && SharedStyles.listItemPressed,
                            ]}
                            onPress={() =>
                                router.push({
                                    pathname: '/customers/[id]/debts',
                                    params: {
                                        id: item.customerId,
                                    },
                                })
                            }
                            accessibilityRole="button"
                        >
                            <Avatar
                                name={item.customerName}
                                size={44}
                                fontWeight="700"
                                fontSize={16}
                                backgroundColor={Colors.warningLight}
                                textColor={Colors.warningTextSecondary}
                            />
                            <View style={SharedStyles.listItemTexts}>
                                <Text style={SharedStyles.listItemTitle} numberOfLines={1}>
                                    {item.customerName}
                                </Text>
                                <Text style={SharedStyles.listItemMeta}>
                                    {item.pendingOrders}{' '}
                                    {item.pendingOrders === 1
                                        ? 'pedido pendiente'
                                        : 'pedidos pendientes'}
                                </Text>
                                {item.oldestPendingOrderAt ? (
                                    <Text style={SharedStyles.listItemMeta}>
                                        Desde el {formatDate(item.oldestPendingOrderAt)}
                                    </Text>
                                ) : null}
                            </View>
                            <View style={styles.amounts}>
                                <Text style={styles.debtAmount}>{formatCurrency(item.debt)}</Text>
                                {item.credit > 0 ? (
                                    <Text style={styles.creditAmount}>
                                        A favor {formatCurrency(item.credit)}
                                    </Text>
                                ) : null}
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
    amounts: {
        alignItems: 'flex-end',
        gap: 2,
    },
    debtAmount: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.errorDark,
    },
    creditAmount: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.successDark,
    },
});
