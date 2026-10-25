import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ReactNode, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useMyBranches } from '@/hooks/use-branch-queries';
import { useDashboard } from '@/hooks/use-report-queries';
import { SharedStyles } from '@/styles/shared';
import { PAYMENT_METHOD_LABELS } from '@/types/order';
import { Dashboard } from '@/types/report';
import { formatCurrency, formatDateTime, formatTime } from '@/utils/format';
import { percentChange, REPORT_PERIODS, ReportPeriod } from '@/utils/report-periods';

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            {note ? <Text style={styles.note}>{note}</Text> : null}
            {children}
        </View>
    );
}

function Row({ label, value, detail }: { label: string; value: string; detail?: string }) {
    return (
        <View style={styles.row}>
            <View style={styles.rowLabel}>
                <Text style={styles.rowText} numberOfLines={1}>{label}</Text>
                {detail ? <Text style={styles.secondaryText} numberOfLines={1}>{detail}</Text> : null}
            </View>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

function formatChange(change: number | null, comparison: string): { text: string; style: object | null } {
    if (change === null) {
        return { text: `Sin ventas para comparar con ${comparison}`, style: null };
    }
    const rounded = Math.round(change);
    const sign = rounded > 0 ? '+' : '';
    return {
        text: `${sign}${rounded}% vs. ${comparison}`,
        style: rounded > 0 ? styles.up : rounded < 0 ? styles.down : null,
    };
}

export default function ReportsScreen() {
    // El alcance de los reportes son las sucursales asignadas y activas del usuario.
    const { branches: availableBranches, isFetched: hasFetchedUserBranches } = useMyBranches();
    const [period, setPeriod] = useState<ReportPeriod>('today');
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    // Si al usuario le quitaron la sucursal elegida, se vuelve a "Todas".
    const branchId = availableBranches.some((branch) => branch.id === selectedBranchId) ? selectedBranchId : null;
    const { dashboard, isLoading, isRefreshing, error, refresh } = useDashboard(period, branchId);
    const comparison = REPORT_PERIODS.find((item) => item.value === period)?.comparison ?? '';

    function renderSales(data: Dashboard) {
        // Hoy se compara contra el mismo tramo de ayer: de 00:00 hasta la hora de la consulta.
        const todayRange = period === 'today' ? `de 00:00 a ${formatTime(data.to)}` : null;
        const change = formatChange(
            percentChange(data.sales.total, data.previousSales.total),
            todayRange ? `${comparison} ${todayRange}` : comparison
        );
        const maxBranchTotal = Math.max(...data.salesByBranch.map((branch) => branch.total), 0);

        return (
            <>
                <Card title="Ventas" note={todayRange ? `Hoy ${todayRange}` : undefined}>
                    <Text style={styles.bigNumber}>{formatCurrency(data.sales.total)}</Text>
                    <Text style={[styles.secondaryText, change.style]}>{change.text}</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{data.sales.orderCount}</Text>
                            <Text style={styles.secondaryText}>pedidos</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{formatCurrency(data.sales.averageTicket)}</Text>
                            <Text style={styles.secondaryText}>ticket promedio</Text>
                        </View>
                    </View>
                </Card>

                {!branchId && data.salesByBranch.length > 1 ? (
                    <Card title="Por sucursal">
                        {data.salesByBranch.map((branch) => (
                            <View key={branch.branchId} style={styles.barItem}>
                                <Row
                                    label={branch.branchName}
                                    detail={`${branch.orderCount} pedidos`}
                                    value={formatCurrency(branch.total)}
                                />
                                <View style={styles.barTrack}>
                                    <View
                                        style={[
                                            styles.barFill,
                                            { width: `${maxBranchTotal > 0 ? (branch.total / maxBranchTotal) * 100 : 0}%` },
                                        ]}
                                    />
                                </View>
                            </View>
                        ))}
                    </Card>
                ) : null}
            </>
        );
    }

    function renderBody() {
        // (app)/_layout carga las sucursales del usuario al entrar.
        if (hasFetchedUserBranches && availableBranches.length === 0) {
            return (
                <EmptyState
                    title="Sin sucursales asignadas"
                    description="Los reportes muestran las sucursales que tenés asignadas. Pedile a un administrador que te asigne una."
                />
            );
        }
        if (isLoading) {
            return <LoadingState label="Cargando reportes..." />;
        }
        if (!dashboard) {
            return <ErrorState message={error ?? 'No se pudieron cargar los reportes.'} onRetry={refresh} />;
        }

        return (
            <>
                {error ? <Text style={styles.inlineError}>{error}</Text> : null}
                {renderSales(dashboard)}

                <Card title="Cobranzas" note="Pagos registrados de clientes, por medio de pago.">
                    {dashboard.collections.byMethod.map((item) => (
                        <Row key={item.method} label={PAYMENT_METHOD_LABELS[item.method]} value={formatCurrency(item.total)} />
                    ))}
                    <Row
                        label="Ventas sin cliente"
                        detail="Cobradas al vender, sin medio registrado"
                        value={formatCurrency(dashboard.collections.walkInSalesTotal)}
                    />
                </Card>

                <Card title="Deuda de clientes" note="De toda la empresa: no depende del período ni de la sucursal.">
                    <Text style={styles.bigNumber}>{formatCurrency(dashboard.debt.totalDebt)}</Text>
                    <Text style={styles.secondaryText}>
                        {dashboard.debt.debtorCount === 1
                            ? '1 cliente con deuda'
                            : `${dashboard.debt.debtorCount} clientes con deuda`}
                    </Text>
                </Card>

                <Card
                    title="Más vendidos"
                    note="Las unidades incluyen las vendidas en promos; el importe es solo el de las ventas sueltas."
                >
                    {dashboard.topProducts.length === 0 ? (
                        <Text style={styles.secondaryText}>Sin ventas de productos en el período.</Text>
                    ) : (
                        dashboard.topProducts.map((product) => (
                            <Row
                                key={product.productVariantId}
                                label={product.productName}
                                detail={`${product.sku} · ${product.quantity} u.`}
                                value={formatCurrency(product.total)}
                            />
                        ))
                    )}
                </Card>

                <Card title="Pedidos por despachar" note="Envíos pendientes al momento, sin importar el período.">
                    <Text style={styles.bigNumber}>{dashboard.pendingOrders.count}</Text>
                    {dashboard.pendingOrders.oldestCreatedAt ? (
                        <Text style={styles.secondaryText}>
                            El más antiguo es del {formatDateTime(dashboard.pendingOrders.oldestCreatedAt)}
                        </Text>
                    ) : null}
                </Card>

                <Card
                    title="Stock bajo"
                    note={`Productos con ${dashboard.lowStock.threshold} unidades o menos en una sucursal.`}
                >
                    {dashboard.lowStock.count === 0 ? (
                        <Text style={styles.secondaryText}>No hay productos con stock bajo.</Text>
                    ) : (
                        <>
                            {dashboard.lowStock.items.map((item) => (
                                <Row
                                    key={item.stockId}
                                    label={item.productName}
                                    detail={`${item.sku} · ${item.branchName}`}
                                    value={`${item.quantity} u.`}
                                />
                            ))}
                            {dashboard.lowStock.count > dashboard.lowStock.items.length ? (
                                <Text style={styles.secondaryText}>
                                    Y {dashboard.lowStock.count - dashboard.lowStock.items.length} más.
                                </Text>
                            ) : null}
                        </>
                    )}
                </Card>
            </>
        );
    }

    return (
        <Screen style={styles.screen}>
            <View style={[SharedStyles.topBar, SharedStyles.topBarElevated]}>
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
                <Text style={styles.screenTitle}>Reportes</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />
                }
            >
                <View style={styles.chips}>
                    {REPORT_PERIODS.map((item) => (
                        <FilterChip
                            key={item.value}
                            label={item.label}
                            selected={period === item.value}
                            onPress={() => setPeriod(item.value)}
                        />
                    ))}
                </View>
                {availableBranches.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                        <FilterChip
                            label="Todas las sucursales"
                            selected={branchId === null}
                            onPress={() => setSelectedBranchId(null)}
                        />
                        {availableBranches.map((branch) => (
                            <FilterChip
                                key={branch.id}
                                label={branch.name}
                                selected={branchId === branch.id}
                                onPress={() => setSelectedBranchId(branch.id)}
                            />
                        ))}
                    </ScrollView>
                ) : null}

                {renderBody()}
            </ScrollView>
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
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
        flexGrow: 1,
    },
    chips: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    note: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    bigNumber: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.primary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginTop: Spacing.sm,
    },
    stat: {
        gap: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    rowLabel: {
        flex: 1,
        gap: 2,
    },
    rowText: {
        fontSize: 14,
        color: Colors.text,
    },
    rowValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    barItem: {
        gap: 4,
        marginBottom: Spacing.xs,
    },
    barTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.muted,
        overflow: 'hidden',
    },
    barFill: {
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    secondaryText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    up: {
        color: Colors.success,
    },
    down: {
        color: Colors.error,
    },
    inlineError: {
        fontSize: 13,
        color: Colors.error,
    },
});
