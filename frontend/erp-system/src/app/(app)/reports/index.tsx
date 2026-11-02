import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AttentionKind, AttentionModal } from '@/components/reports/AttentionModal';
import { BarList } from '@/components/reports/BarList';
import { CollectionsBar } from '@/components/reports/CollectionsBar';
import { SalesChart } from '@/components/reports/SalesChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useMyBranches } from '@/hooks/use-branch-queries';
import { useDashboard } from '@/hooks/use-report-queries';
import { chooseAction } from '@/stores/dialog-store';
import { SharedStyles } from '@/styles/shared';
import { PAYMENT_METHOD_LABELS } from '@/types/order';
import { Dashboard } from '@/types/report';
import { formatCurrency, formatTime } from '@/utils/format';
import { percentChange, REPORT_PERIODS, ReportPeriod, salesChartData } from '@/utils/report-periods';

// Más vendidos: los primeros a la vista; "Ver todos" muestra los 10 que trae el backend.
const TOP_PRODUCTS_PREVIEW = 5;

/** Bloque del reporte: título de sección, su contenido y una aclaración chica debajo. */
function Section({ title, action, note, children }: {
    title: string;
    action?: { label: string; onPress: () => void };
    note?: string;
    children: ReactNode;
}) {
    return (
        <View style={SharedStyles.pageSection}>
            <SectionHeader title={title} actionLabel={action?.label} onAction={action?.onPress} />
            {children}
            {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
    );
}

function formatChange(change: number): { text: string; color: string } {
    const rounded = Math.round(change);
    return {
        text: `${rounded > 0 ? '+' : ''}${rounded}%`,
        color: rounded > 0 ? Colors.successDark : rounded < 0 ? Colors.errorDark : Colors.textSecondary,
    };
}

export default function ReportsScreen() {
    // El alcance de los reportes son las sucursales asignadas y activas del usuario.
    const { branches: availableBranches, isFetched: hasFetchedUserBranches } = useMyBranches();
    const [period, setPeriod] = useState<ReportPeriod>('today');
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [attention, setAttention] = useState<AttentionKind | null>(null);
    const [showAllProducts, setShowAllProducts] = useState(false);
    // Si al usuario le quitaron la sucursal elegida, se vuelve a "Todas".
    const branchId = availableBranches.some((branch) => branch.id === selectedBranchId) ? selectedBranchId : null;
    const { dashboard, isLoading, isRefreshing, error, refresh } = useDashboard(period, branchId);

    const branchLabel = branchId
        ? availableBranches.find((branch) => branch.id === branchId)?.name
        : availableBranches.length === 1 ? availableBranches[0].name : 'Todas tus sucursales';

    async function pickBranch() {
        const picked = await chooseAction<string | null>({
            title: 'Sucursal',
            message: 'Qué sucursal querés ver en los reportes.',
            options: [
                { label: 'Todas', value: 'all' },
                ...availableBranches.map((branch) => ({ label: branch.name, value: branch.id })),
                { label: 'Cancelar', value: null, style: 'cancel' },
            ],
        });
        if (picked === null) return;
        setSelectedBranchId(picked === 'all' ? null : picked);
    }

    function renderSalesCard(data: Dashboard) {
        const periodInfo = REPORT_PERIODS.find((item) => item.value === period);
        // Hoy se compara contra el mismo tramo de ayer: de 00:00 hasta la hora de la consulta.
        const comparison = period === 'today'
            ? `ayer de 00:00 a ${formatTime(data.to)}`
            : periodInfo?.comparison ?? '';
        const changeValue = percentChange(data.sales.total, data.previousSales.total);
        const change = changeValue === null ? null : formatChange(changeValue);
        const chart = salesChartData(data.salesSeries, period);

        return (
            <View style={[SharedStyles.card, styles.salesCard]}>
                <View style={styles.segmented} accessibilityRole="tablist">
                    {REPORT_PERIODS.map((item) => {
                        const selected = item.value === period;
                        return (
                            <Pressable
                                key={item.value}
                                onPress={() => setPeriod(item.value)}
                                accessibilityRole="tab"
                                accessibilityState={{ selected }}
                                style={[styles.segment, selected && styles.segmentSelected]}
                            >
                                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.totals}>
                    <Text style={styles.cardLabel}>Ventas</Text>
                    <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>
                        {formatCurrency(data.sales.total)}
                    </Text>
                    {change ? (
                        <Text style={styles.comparison}>
                            <Text style={[styles.change, { color: change.color }]}>{change.text}</Text>
                            {` vs. ${comparison}`}
                        </Text>
                    ) : (
                        <Text style={styles.comparison}>Sin ventas para comparar con {comparison}</Text>
                    )}
                </View>

                {chart.values.length > 0 ? (
                    <SalesChart
                        values={chart.values}
                        labels={chart.labels}
                        accessibilityLabel={period === 'today' ? 'Ventas por hora' : 'Ventas por día'}
                    />
                ) : null}

                <View style={styles.cardStats}>
                    <View style={styles.cardStat}>
                        <Text style={styles.cardStatLabel}>Pedidos</Text>
                        <Text style={styles.cardStatValue}>{data.sales.orderCount}</Text>
                    </View>
                    <View style={styles.cardStat}>
                        <Text style={styles.cardStatLabel}>Ticket promedio</Text>
                        <Text style={styles.cardStatValue}>{formatCurrency(data.sales.averageTicket)}</Text>
                    </View>
                </View>
            </View>
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

        const collectionSegments = [
            ...dashboard.collections.byMethod.map((item) => ({
                key: item.method,
                label: PAYMENT_METHOD_LABELS[item.method],
                total: item.total,
            })),
            { key: 'none', label: 'Sin medio', total: dashboard.collections.withoutMethodTotal },
        ];
        const collected = collectionSegments.reduce((sum, segment) => sum + segment.total, 0);
        const topProducts = showAllProducts
            ? dashboard.topProducts
            : dashboard.topProducts.slice(0, TOP_PRODUCTS_PREVIEW);
        const debtors = dashboard.debt.debtorCount;

        return (
            <>
                {error ? <Text style={styles.inlineError}>{error}</Text> : null}
                {renderSalesCard(dashboard)}

                <Section title="Para atender" note="Deuda y envíos no dependen del período; la deuda es de toda la empresa.">
                    <View style={SharedStyles.statRow}>
                        <StatTile
                            label="Stock bajo"
                            value={String(dashboard.lowStock.count)}
                            icon={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
                            tone="danger"
                            onPress={() => setAttention('lowStock')}
                        />
                        <StatTile
                            label="Por despachar"
                            value={String(dashboard.pendingOrders.count)}
                            icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
                            tone="warning"
                            onPress={() => setAttention('pending')}
                        />
                        <StatTile
                            label={debtors === 1 ? 'Cliente debe' : 'Clientes deben'}
                            value={String(debtors)}
                            icon={{ ios: 'creditcard', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
                            tone="warning"
                            onPress={() => setAttention('debt')}
                        />
                    </View>
                </Section>

                <Section title={`Cobranzas · ${formatCurrency(collected)}`}>
                    <CollectionsBar segments={collectionSegments} />
                </Section>

                {!branchId && dashboard.salesByBranch.length > 1 ? (
                    <Section title="Por sucursal">
                        <BarList
                            items={dashboard.salesByBranch.map((branch) => ({
                                key: branch.branchId,
                                label: branch.branchName,
                                detail: `${branch.orderCount} pedidos`,
                                value: formatCurrency(branch.total),
                                amount: branch.total,
                            }))}
                        />
                    </Section>
                ) : null}

                <Section
                    title="Más vendidos"
                    action={dashboard.topProducts.length > TOP_PRODUCTS_PREVIEW
                        ? {
                            label: showAllProducts ? 'Ver menos' : 'Ver todos',
                            onPress: () => setShowAllProducts((value) => !value),
                        }
                        : undefined}
                    note={dashboard.topProducts.length > 0
                        ? 'Las unidades incluyen las vendidas en promos; el importe es solo el de las ventas sueltas.'
                        : undefined}
                >
                    {topProducts.length === 0 ? (
                        <View style={SharedStyles.card}>
                            <Text style={styles.emptyText}>Sin ventas de productos en el período.</Text>
                        </View>
                    ) : (
                        <BarList
                            items={topProducts.map((product) => ({
                                key: product.productVariantId,
                                label: product.productName,
                                detail: `${product.sku} · ${formatCurrency(product.total)}`,
                                value: `${product.quantity} u.`,
                                amount: product.quantity,
                            }))}
                        />
                    )}
                </Section>

                <AttentionModal
                    kind={attention}
                    dashboard={dashboard}
                    branchId={branchId}
                    onClose={() => setAttention(null)}
                />
            </>
        );
    }

    return (
        <Screen>
            <PageHeader
                title="Reportes"
                eyebrow={branchLabel}
                onBack={() => router.back()}
                right={availableBranches.length > 1 ? (
                    <HeaderButton
                        label="Sucursal"
                        variant="secondary"
                        icon={{ ios: 'building.2', android: 'store', web: 'store' }}
                        accessibilityLabel={`Sucursal: ${branchLabel}. Cambiar`}
                        onPress={() => void pickBranch()}
                    />
                ) : null}
            />

            <ScrollView
                contentContainerStyle={[SharedStyles.pageContent, styles.content]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />
                }
            >
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
    note: {
        fontSize: 12,
        lineHeight: 17,
        color: Colors.textSecondary,
    },
    salesCard: {
        gap: Spacing.lg,
        borderRadius: Radius.xl,
    },
    segmented: {
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        borderRadius: Radius.sm + 2,
        backgroundColor: Colors.muted,
    },
    segment: {
        flex: 1,
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.sm - 1,
    },
    segmentSelected: {
        backgroundColor: Colors.surface,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12)',
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    segmentTextSelected: {
        color: Colors.text,
    },
    totals: {
        gap: 4,
    },
    cardLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bigNumber: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
        color: Colors.text,
    },
    comparison: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    change: {
        fontWeight: '700',
    },
    cardStats: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
    },
    cardStat: {
        flex: 1,
        gap: 2,
    },
    cardStatLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    cardStatValue: {
        fontSize: 17,
        fontWeight: '800',
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
