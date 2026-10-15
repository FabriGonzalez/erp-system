import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { TransferStatusBadge } from '@/components/transfers/TransferStatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useTransfers } from '@/hooks/use-transfer-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { StockTransfer } from '@/types/transfer';
import { formatDateTime } from '@/utils/format';
import { hasPermission } from '@/utils/permissions';

export default function TransfersScreen() {
    const user = useAuthStore((state) => state.user);
    const canTransfer = hasPermission(user, 'TRANSFERIR_STOCK');
    const list = useTransfers();

    function renderItem({ item }: { item: StockTransfer }) {
        const isCancelled = item.status === 'CANCELLED';

        return (
            <Pressable
                style={({ pressed }) => [styles.card, isCancelled && styles.cancelledCard, pressed && SharedStyles.pressed]}
                onPress={() => router.push({ pathname: '/transfers/[id]', params: { id: item.id } })}
            >
                <View style={styles.cardTopRow}>
                    <Text style={styles.transferNumber}>Transferencia #{item.id}</Text>
                    <TransferStatusBadge status={item.status} />
                </View>

                <View style={styles.route}>
                    <Text style={styles.branchName} numberOfLines={1}>{item.originBranchName}</Text>
                    <SymbolView
                        name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                        size={16}
                        tintColor={Colors.textSecondary}
                    />
                    <Text style={styles.branchName} numberOfLines={1}>{item.destinationBranchName}</Text>
                </View>

                <Text style={styles.secondaryText}>
                    {item.items.length} {item.items.length === 1 ? 'producto' : 'productos'} · {item.totalUnits}{' '}
                    {item.totalUnits === 1 ? 'unidad' : 'unidades'}
                </Text>
                <Text style={styles.secondaryText}>
                    {formatDateTime(item.createdAt)} · {item.createdByUsername}
                </Text>
            </Pressable>
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

                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle}>Transferencias</Text>
                    <Text style={styles.screenSubtitle}>
                        {list.isInitialLoading
                            ? 'Cargando...'
                            : `${list.totalElements} ${list.totalElements === 1 ? 'transferencia' : 'transferencias'}`}
                    </Text>
                </View>

                {canTransfer ? (
                    <Pressable
                        style={({ pressed }) => [styles.createButton, pressed && SharedStyles.pressed]}
                        onPress={() => router.push('/transfers/new')}
                    >
                        <SymbolView
                            name={{ ios: 'plus', android: 'add', web: 'add' }}
                            size={18}
                            tintColor={Colors.white}
                        />
                        <Text style={styles.createButtonText}>Nueva</Text>
                    </Pressable>
                ) : null}
            </View>

            {list.isInitialLoading ? (
                <LoadingState label="Cargando transferencias..." />
            ) : list.error && list.items.length === 0 ? (
                <ErrorState message={list.error} onRetry={list.refresh} />
            ) : (
                <FlatList
                    data={list.items}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={list.items.length === 0 ? SharedStyles.listEmpty : styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    onEndReached={list.loadMore}
                    onEndReachedThreshold={0.4}
                    refreshControl={
                        <RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="Sin transferencias"
                            description="Todavía no se transfirió stock entre sucursales."
                        />
                    }
                    ListFooterComponent={list.isLoadingMore ? <LoadingState label="Cargando más..." /> : null}
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
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        gap: 6,
    },
    createButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    cancelledCard: {
        opacity: 0.7,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transferNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    route: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginVertical: 2,
    },
    branchName: {
        flexShrink: 1,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    secondaryText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
