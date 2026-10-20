import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { StockAdjustModal } from '@/components/inventory/StockAdjustModal';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
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
            <View style={styles.movementCard}>
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
        return (
            <View style={styles.header}>
                <View style={styles.stockCard}>
                    <View style={styles.stockInfo}>
                        <Text style={styles.productName}>{current.productName}</Text>
                        <Text style={styles.secondaryText}>SKU: {current.productVariantSku}</Text>
                        <Text style={styles.secondaryText}>Sucursal: {current.branchName}</Text>
                    </View>
                    <View style={styles.quantityContainer}>
                        <Text style={styles.quantity}>{current.quantity}</Text>
                        <Text style={styles.quantityLabel}>unidades</Text>
                    </View>
                </View>
                {canAdjust ? <AppButton title="Ajustar stock" onPress={() => setIsAdjusting(true)} /> : null}
                <Text style={styles.sectionTitle}>Historial</Text>
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
                contentContainerStyle={styles.list}
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
                <Text style={styles.screenTitle}>Stock</Text>
            </View>

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
    list: {
        padding: Spacing.lg,
        gap: Spacing.sm,
        flexGrow: 1,
    },
    header: {
        gap: Spacing.md,
        marginBottom: Spacing.xs,
    },
    stockCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    stockInfo: {
        flex: 1,
        gap: 2,
    },
    productName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    quantityContainer: {
        alignItems: 'flex-end',
        marginLeft: Spacing.md,
    },
    quantity: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.primary,
    },
    quantityLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    movementCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
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
        fontWeight: '600',
        color: Colors.text,
    },
    delta: {
        fontSize: 16,
        fontWeight: '700',
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
