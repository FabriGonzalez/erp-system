import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { StockAdjustModal } from '@/components/inventory/StockAdjustModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useStockMovements } from '@/hooks/use-stock-movement-queries';
import { useStock } from '@/hooks/use-stock-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { Stock } from '@/types/stock';
import { StockMovement } from '@/types/stock-movement';
import { formatDateTime } from '@/utils/format';
import { hasPermission } from '@/utils/permissions';
import { stockPill } from '@/utils/status';
import { formatStockDelta, stockMovementReference, stockMovementTitle } from '@/utils/stock-movement-labels';

export default function StockDetailScreen() {
    const { stockId } = useLocalSearchParams<{ stockId: string }>();
    const user = useAuthStore((state) => state.user);
    const canAdjust = hasPermission(user, 'AJUSTAR_STOCK');
    // Se muestra la copia del listado de Inventario mientras llega la actual (o tras un F5).
    const { stock, loadError, reload } = useStock(stockId);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const movements = useStockMovements(stockId);

    function renderMovement({ item }: { item: StockMovement }) {
        const reference = stockMovementReference(item);
        const deltaStyle = item.quantity > 0 ? styles.deltaUp : item.quantity < 0 ? styles.deltaDown : null;

        return (
            <View style={[SharedStyles.card, styles.movementCard]}>
                <View style={styles.movementTopRow}>
                    <Text style={styles.movementTitle}>{stockMovementTitle(item)}</Text>
                    <Text style={[styles.delta, deltaStyle]}>{formatStockDelta(item.quantity)}</Text>
                </View>
                <Text style={styles.secondaryText}>
                    {item.previousQuantity} → {item.newQuantity} unidades
                    {reference ? ` · ${reference}` : ''}
                </Text>
                {item.reason ? <Text style={styles.reason}>“{item.reason}”</Text> : null}
                <Text style={styles.secondaryText}>
                    {formatDateTime(item.createdAt)}
                    {item.createdByUsername ? ` · ${item.createdByUsername}` : ''}
                </Text>
            </View>
        );
    }

    function renderHeader(current: Stock) {
        const pill = stockPill(current.quantity);
        return (
            <View style={styles.header}>
                <View style={SharedStyles.statRow}>
                    <StatTile
                        label={`Unidades en ${current.branchName}`}
                        value={String(current.quantity)}
                        icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
                        tone={pill.tone}
                    />
                </View>
                <SectionHeader title="Historial" />
            </View>
        );
    }

    function renderBody() {
        if (!stock) {
            if (loadError) {
                return <ErrorState message={loadError} onRetry={reload} />;
            }
            return <LoadingState label="Cargando stock..." />;
        }

        return (
            <FlatList
                data={movements.items}
                keyExtractor={(item) => item.id}
                renderItem={renderMovement}
                ListHeaderComponent={renderHeader(stock)}
                contentContainerStyle={SharedStyles.pageList}
                showsVerticalScrollIndicator={false}
                onEndReached={movements.loadMore}
                onEndReachedThreshold={0.4}
                refreshControl={
                    <RefreshControl
                        refreshing={movements.isRefreshing}
                        onRefresh={movements.refresh}
                        tintColor={Colors.primary}
                    />
                }
                ListEmptyComponent={
                    movements.isInitialLoading ? (
                        <LoadingState label="Cargando historial..." />
                    ) : movements.error ? (
                        <ErrorState message={movements.error} onRetry={movements.refresh} />
                    ) : (
                        <EmptyState
                            title="Sin movimientos registrados"
                            description="El historial muestra los cambios desde que se empezaron a registrar; los anteriores no figuran."
                        />
                    )
                }
                ListFooterComponent={movements.isLoadingMore ? <LoadingState label="Cargando más..." /> : null}
            />
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={stock ? `SKU ${stock.productVariantSku}` : 'Stock'}
                title={stock?.productName ?? 'Stock'}
                right={stock && canAdjust ? (
                    <HeaderButton
                        label="Ajustar"
                        icon={{ ios: 'plusminus', android: 'exposure', web: 'exposure' }}
                        accessibilityLabel="Ajustar stock"
                        onPress={() => setIsAdjusting(true)}
                    />
                ) : undefined}
            />

            {renderBody()}

            {stock && isAdjusting ? (
                <StockAdjustModal stock={stock} onClose={() => setIsAdjusting(false)} />
            ) : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    header: {
        gap: Spacing.md,
        marginBottom: Spacing.xs,
    },
    movementCard: {
        padding: Spacing.md,
        gap: 4,
    },
    movementTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    movementTitle: {
        flexShrink: 1,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    delta: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textSecondary,
    },
    deltaUp: {
        color: Colors.success,
    },
    deltaDown: {
        color: Colors.error,
    },
    reason: {
        fontSize: 13,
        fontStyle: 'italic',
        color: Colors.text,
    },
    secondaryText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
