import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { OrderRow } from '@/components/orders/OrderRow';
import { ActionCard } from '@/components/ui/ActionCard';
import { BranchChip } from '@/components/ui/BranchChip';
import { HeroAction } from '@/components/ui/HeroAction';
import { ListGroup } from '@/components/ui/ListGroup';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { Colors } from '@/constants/colors';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useOrders } from '@/hooks/use-order-queries';
import { useDashboard } from '@/hooks/use-report-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { SalesType } from '@/types/order';
import { formatCurrency, formatToday } from '@/utils/format';
import { hasAnyPermission, ORDER_READ_PERMISSIONS } from '@/utils/permissions';

const RECENT_SALES = 3;

export default function SalesScreen() {
    const user = useAuthStore((state) => state.user);
    const activeBranch = useActiveBranch();
    const branchId = activeBranch?.id ?? null;
    const canSeeOrders = hasAnyPermission(user, ORDER_READ_PERMISSIONS);

    // El resumen del día sale de Reportes: sin VER_REPORTES no se pide ni se muestra.
    const report = useDashboard('today', branchId);
    const recentSales = useOrders(
        { branchId: branchId ?? undefined, deliveryType: 'LOCAL_PICKUP' },
        { enabled: canSeeOrders },
    );

    function startSale(salesType: SalesType) {
        router.push({ pathname: '/orders/new', params: { salesType } });
    }

    function refresh() {
        report.refresh();
        recentSales.refresh();
    }

    const sales = report.dashboard?.sales;
    const recent = recentSales.items.slice(0, RECENT_SALES);

    return (
        <Screen style={styles.screen}>
            <PageHeader eyebrow={formatToday()} title="Vender" right={<BranchChip />} />

            <ScrollView
                contentContainerStyle={SharedStyles.pageContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={report.isRefreshing || recentSales.isRefreshing}
                        onRefresh={refresh}
                        tintColor={Colors.primary}
                    />
                }
            >
                <HeroAction
                    icon={{ ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' }}
                    title="Nueva venta"
                    subtitle="Productos, cliente y pago"
                    onPress={() => startSale('WITH_PRODUCTS')}
                />
                <ActionCard
                    icon={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }}
                    tone="warning"
                    title="Venta rápida"
                    subtitle="Solo el importe, sin cargar productos"
                    onPress={() => startSale('QUICK_SALE')}
                />

                {sales ? (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title={activeBranch ? `Hoy en ${activeBranch.name}` : 'Hoy'} />
                        <View style={SharedStyles.statRow}>
                            <StatTile label="Vendido" value={formatCurrency(sales.total)} />
                            <StatTile label="Ventas" value={String(sales.orderCount)} />
                        </View>
                    </View>
                ) : null}

                {recent.length > 0 ? (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader
                            title="Últimas ventas"
                            actionLabel="Ver todas"
                            onAction={() => router.push('/operations' as any)}
                        />
                        <ListGroup>
                            {recent.map((order) => (
                                <OrderRow
                                    key={order.id}
                                    order={order}
                                    onPress={() => router.push({ pathname: '/operations/[id]', params: { id: order.id } })}
                                />
                            ))}
                        </ListGroup>
                    </View>
                ) : null}
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
});
