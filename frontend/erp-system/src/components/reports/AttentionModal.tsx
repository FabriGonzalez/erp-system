import { ReactNode } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ModalCard } from '@/components/ui/ModalCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useDebtors } from '@/hooks/use-customer-account-queries';
import { useOrders } from '@/hooks/use-order-queries';
import { SharedStyles } from '@/styles/shared';
import { Dashboard } from '@/types/report';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { stockPill } from '@/utils/status';

export type AttentionKind = 'lowStock' | 'pending' | 'debt';

type AttentionModalProps = {
    kind: AttentionKind | null;
    dashboard: Dashboard;
    /** El filtro de sucursal de Reportes (null = todas las del usuario). */
    branchId: string | null;
    onClose: () => void;
};

/**
 * El detalle de "Para atender" en Reportes. Es de solo lectura y no navega: Inventario, Envíos
 * y Cuentas corrientes son de otro stack y el back volvería a otro lado.
 */
export function AttentionModal({ kind, dashboard, branchId, onClose }: AttentionModalProps) {
    // Cada lista se monta solo mientras su modal está abierto: así no se piden sin necesidad.
    if (kind === 'lowStock') return <LowStockModal dashboard={dashboard} onClose={onClose} />;
    if (kind === 'pending') return <PendingModal dashboard={dashboard} branchId={branchId} onClose={onClose} />;
    if (kind === 'debt') return <DebtModal onClose={onClose} />;
    return null;
}

function LowStockModal({ dashboard, onClose }: { dashboard: Dashboard; onClose: () => void }) {
    const { threshold, count, items } = dashboard.lowStock;
    const remaining = count - items.length;

    return (
        <ModalCard
            title="Stock bajo"
            subtitle={`Productos con ${threshold} unidades o menos en una sucursal`}
            onClose={onClose}
            scroll={false}
        >
            <FlatList
                data={items}
                keyExtractor={(item) => item.stockId}
                style={styles.list}
                ItemSeparatorComponent={Separator}
                ListEmptyComponent={<EmptyState title="Sin stock bajo" description="Ningún producto está por agotarse." />}
                ListFooterComponent={remaining > 0
                    ? <Text style={styles.footer}>Y {remaining} más. Los ves todos en Inventario.</Text>
                    : null}
                renderItem={({ item }) => {
                    const pill = stockPill(item.quantity);
                    return (
                        <Row
                            title={item.productName}
                            meta={`${item.sku} · ${item.branchName}`}
                            right={<StatusPill label={pill.label} tone={pill.tone} />}
                        />
                    );
                }}
            />
        </ModalCard>
    );
}

function PendingModal({ dashboard, branchId, onClose }: {
    dashboard: Dashboard;
    branchId: string | null;
    onClose: () => void;
}) {
    // Mismo criterio que el contador del dashboard: a preparar, cualquier tipo de entrega.
    const { items, isInitialLoading, isLoadingMore, error, loadMore } = useOrders({
        status: 'TO_PREPARE',
        branchId: branchId ?? undefined,
    });
    const oldest = dashboard.pendingOrders.oldestCreatedAt;

    return (
        <ModalCard
            title="Por despachar"
            subtitle={oldest ? `El más antiguo es del ${formatDateTime(oldest)}` : undefined}
            onClose={onClose}
            error={error}
            scroll={false}
        >
            {isInitialLoading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loading} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    ItemSeparatorComponent={Separator}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListEmptyComponent={error
                        ? null
                        : <EmptyState title="Nada por despachar" description="No hay pedidos a preparar." />}
                    ListFooterComponent={isLoadingMore
                        ? <ActivityIndicator color={Colors.primary} style={styles.loadingMore} />
                        : null}
                    renderItem={({ item }) => (
                        <Row
                            title={item.customerName}
                            meta={`#${item.orderNumber} · ${item.branchName} · ${formatDateTime(item.createdAt)}`}
                            right={<Text style={styles.amount}>{formatCurrency(item.total)}</Text>}
                        />
                    )}
                />
            )}
        </ModalCard>
    );
}

function DebtModal({ onClose }: { onClose: () => void }) {
    const { items, isInitialLoading, isLoadingMore, error, loadMore } = useDebtors();

    return (
        <ModalCard
            title="Deuda de clientes"
            subtitle="De toda la empresa, de mayor a menor"
            onClose={onClose}
            error={error}
            scroll={false}
        >
            {isInitialLoading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loading} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.customerId}
                    style={styles.list}
                    ItemSeparatorComponent={Separator}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListEmptyComponent={error
                        ? null
                        : <EmptyState title="Sin deudas" description="Ningún cliente tiene saldo pendiente." />}
                    ListFooterComponent={isLoadingMore
                        ? <ActivityIndicator color={Colors.primary} style={styles.loadingMore} />
                        : null}
                    renderItem={({ item }) => (
                        <Row
                            title={item.customerName}
                            meta={item.pendingOrders === 1 ? '1 pedido pendiente' : `${item.pendingOrders} pedidos pendientes`}
                            right={<Text style={styles.amount}>{formatCurrency(item.debt)}</Text>}
                        />
                    )}
                />
            )}
        </ModalCard>
    );
}

function Row({ title, meta, right }: { title: string; meta: string; right: ReactNode }) {
    return (
        <View style={styles.row}>
            <View style={SharedStyles.listItemTexts}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={SharedStyles.listItemMeta} numberOfLines={1}>{meta}</Text>
            </View>
            {right}
        </View>
    );
}

function Separator() {
    return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
    list: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.lg,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.muted,
    },
    loading: {
        paddingVertical: Spacing.xxl,
    },
    loadingMore: {
        paddingVertical: Spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    amount: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    footer: {
        padding: Spacing.md,
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
