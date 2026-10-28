import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Tone } from '@/constants/tones';
import { useMyBranches } from '@/hooks/use-branch-queries';
import { useDashboard } from '@/hooks/use-report-queries';
import { SharedStyles } from '@/styles/shared';
import { PAYMENT_METHOD_LABELS } from '@/types/order';
import { Dashboard } from '@/types/report';
import { formatCurrency, formatDateTime, formatTime } from '@/utils/format';
import { percentChange, REPORT_PERIODS, ReportPeriod } from '@/utils/report-periods';
import { stockPill } from '@/utils/status';

/** Bloque del reporte: título de sección, su contenido y una aclaración chica debajo. */
function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
    return (
        <View style={SharedStyles.pageSection}>
            <SectionHeader title={title} />
            {children}
            {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
    );
}

/** Fila de un ListGroup: nombre y detalle a la izquierda, importe o estado a la derecha. */
function ReportRow({ label, detail, value }: { label: string; detail?: string; value: ReactNode }) {
    return (
        <View style={styles.row}>
            <View style={SharedStyles.listItemTexts}>
                <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
                {detail ? <Text style={SharedStyles.listItemMeta} numberOfLines={1}>{detail}</Text> : null}
            </View>
            {typeof value === 'string' ? <Text style={styles.rowValue}>{value}</Text> : value}
        </View>
    );
}

function formatChange(change: number | null, comparison: string): { text: string; tone: Tone } {
    if (change === null) {
        return { text: `Sin ventas para comparar con ${comparison}`, tone: 'neutral' };
    }
    const rounded = Math.round(change);
    const sign = rounded > 0 ? '+' : '';
    return {
        text: `${sign}${rounded}% vs. ${comparison}`,
        tone: rounded > 0 ? 'success' : rounded < 0 ? 'danger' : 'neutral',
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

    const branchLabel = branchId
        ? availableBranches.find((branch) => branch.id === branchId)?.name
        : availableBranches.length === 1 ? availableBranches[0].name : 'Todas tus sucursales';

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
                <Section title="Ventas" note={todayRange ? `Hoy ${todayRange}.` : undefined}>
                    <View style={[SharedStyles.card, styles.salesCard]}>
                        <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>
                            {formatCurrency(data.sales.total)}
                        </Text>
                        <StatusPill label={change.text} tone={change.tone} />
                    </View>
                    <View style={SharedStyles.statRow}>
                        <StatTile label="Pedidos" value={String(data.sales.orderCount)} />
                        <StatTile label="Ticket promedio" value={formatCurrency(data.sales.averageTicket)} />
                    </View>
                </Section>

                {!branchId && data.salesByBranch.length > 1 ? (
                    <Section title="Por sucursal">
                        <View style={[SharedStyles.card, styles.branchCard]}>
                            {data.salesByBranch.map((branch) => (
                                <View key={branch.branchId} style={styles.barItem}>
                                    <View style={styles.barLabels}>
                                        <Text style={styles.rowLabel} numberOfLines={1}>{branch.branchName}</Text>
                                        <Text style={styles.rowValue}>{formatCurrency(branch.total)}</Text>
                                    </View>
                                    <View style={styles.barTrack}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                { width: `${maxBranchTotal > 0 ? (branch.total / maxBranchTotal) * 100 : 0}%` },
                                            ]}
                                        />
                                    </View>
                                    <Text style={SharedStyles.listItemMeta}>{branch.orderCount} pedidos</Text>
                                </View>
                            ))}
                        </View>
                    </Section>
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

        const oldestPending = dashboard.pendingOrders.oldestCreatedAt;
        const remainingLowStock = dashboard.lowStock.count - dashboard.lowStock.items.length;

        return (
            <>
                {error ? <Text style={styles.inlineError}>{error}</Text> : null}
                {renderSales(dashboard)}

                <Section
                    title="Al momento"
                    note={'La deuda es de toda la empresa; deuda y envíos no dependen del período.'
                        + (oldestPending ? ` El envío pendiente más antiguo es del ${formatDateTime(oldestPending)}.` : '')}
                >
                    <View style={SharedStyles.statRow}>
                        <StatTile
                            label={dashboard.debt.debtorCount === 1
                                ? 'Deuda · 1 cliente'
                                : `Deuda · ${dashboard.debt.debtorCount} clientes`}
                            value={formatCurrency(dashboard.debt.totalDebt)}
                            icon={{ ios: 'creditcard', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
                            tone="warning"
                        />
                        <StatTile
                            label="Por despachar"
                            value={String(dashboard.pendingOrders.count)}
                            icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
                            tone="warning"
                        />
                    </View>
                </Section>

                <Section title="Cobranzas" note="Pagos de clientes y ventas a consumidor final, por medio de pago.">
                    <ListGroup>
                        {dashboard.collections.byMethod.map((item) => (
                            <ReportRow
                                key={item.method}
                                label={PAYMENT_METHOD_LABELS[item.method]}
                                value={formatCurrency(item.total)}
                            />
                        ))}
                        {dashboard.collections.withoutMethodTotal > 0 ? (
                            <ReportRow
                                label="Sin medio registrado"
                                detail="Ventas a consumidor final anteriores a registrar el medio"
                                value={formatCurrency(dashboard.collections.withoutMethodTotal)}
                            />
                        ) : null}
                    </ListGroup>
                </Section>

                <Section
                    title="Más vendidos"
                    note="Las unidades incluyen las vendidas en promos; el importe es solo el de las ventas sueltas."
                >
                    {dashboard.topProducts.length === 0 ? (
                        <View style={SharedStyles.card}>
                            <Text style={styles.emptyText}>Sin ventas de productos en el período.</Text>
                        </View>
                    ) : (
                        <ListGroup>
                            {dashboard.topProducts.map((product) => (
                                <ReportRow
                                    key={product.productVariantId}
                                    label={product.productName}
                                    detail={`${product.sku} · ${product.quantity} u.`}
                                    value={formatCurrency(product.total)}
                                />
                            ))}
                        </ListGroup>
                    )}
                </Section>

                <Section
                    title="Stock bajo"
                    note={`Productos con ${dashboard.lowStock.threshold} unidades o menos en una sucursal.`
                        + (remainingLowStock > 0 ? ` Y ${remainingLowStock} más.` : '')}
                >
                    {dashboard.lowStock.count === 0 ? (
                        <View style={SharedStyles.card}>
                            <Text style={styles.emptyText}>No hay productos con stock bajo.</Text>
                        </View>
                    ) : (
                        <ListGroup>
                            {dashboard.lowStock.items.map((item) => {
                                const pill = stockPill(item.quantity);
                                return (
                                    <ReportRow
                                        key={item.stockId}
                                        label={item.productName}
                                        detail={`${item.sku} · ${item.branchName}`}
                                        value={<StatusPill label={pill.label} tone={pill.tone} />}
                                    />
                                );
                            })}
                        </ListGroup>
                    )}
                </Section>
            </>
        );
    }

    return (
        <Screen>
            <PageHeader title="Reportes" eyebrow={branchLabel} onBack={() => router.back()} />

            <ScrollView
                contentContainerStyle={[SharedStyles.pageContent, styles.content]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />
                }
            >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {REPORT_PERIODS.map((item) => (
                        <FilterChip
                            key={item.value}
                            label={item.label}
                            selected={period === item.value}
                            onPress={() => setPeriod(item.value)}
                        />
                    ))}
                </ScrollView>
                {availableBranches.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                        <FilterChip
                            label="Todas"
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
    // Cargando y error ocupan el resto de la pantalla.
    content: {
        flexGrow: 1,
    },
    chips: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    note: {
        fontSize: 12,
        lineHeight: 17,
        color: Colors.textSecondary,
    },
    salesCard: {
        gap: Spacing.sm,
        padding: Spacing.lg,
    },
    bigNumber: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
        color: Colors.text,
    },
    branchCard: {
        gap: Spacing.md,
    },
    barItem: {
        gap: 4,
    },
    barLabels: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    barTrack: {
        height: 8,
        borderRadius: Radius.pill,
        backgroundColor: Colors.muted,
        overflow: 'hidden',
    },
    barFill: {
        height: 8,
        borderRadius: Radius.pill,
        backgroundColor: Colors.primary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
        backgroundColor: Colors.surface,
    },
    rowLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    rowValue: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    inlineError: {
        fontSize: 13,
        color: Colors.error,
    },
});
