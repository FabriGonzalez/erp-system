import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { TransferStatusBadge } from '@/components/transfers/TransferStatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
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
                style={({ pressed }) => [
                    SharedStyles.card,
                    SharedStyles.listItem,
                    isCancelled && SharedStyles.listItemInactive,
                    pressed && SharedStyles.listItemPressed,
                ]}
                onPress={() => router.push({ pathname: '/transfers/[id]', params: { id: item.id } })}
                accessibilityRole="button"
            >
                <IconBadge
                    icon={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
                    tone="teal"
                    size={44}
                />
                <View style={SharedStyles.listItemTexts}>
                    <View style={styles.route}>
                        <Text style={[SharedStyles.listItemTitle, styles.branchName]} numberOfLines={1}>
                            {item.originBranchName}
                        </Text>
                        <SymbolView
                            name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                            size={14}
                            tintColor={Colors.textSecondary}
                        />
                        <Text style={[SharedStyles.listItemTitle, styles.branchName]} numberOfLines={1}>
                            {item.destinationBranchName}
                        </Text>
                    </View>
                    <Text style={SharedStyles.listItemMeta}>
                        #{item.id} · {item.items.length} {item.items.length === 1 ? 'producto' : 'productos'} · {item.totalUnits}{' '}
                        {item.totalUnits === 1 ? 'unidad' : 'unidades'}
                    </Text>
                    <Text style={SharedStyles.listItemMeta} numberOfLines={1}>
                        {formatDateTime(item.createdAt)} · {item.createdByUsername}
                    </Text>
                </View>
                <TransferStatusBadge status={item.status} />
            </Pressable>
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={list.isInitialLoading
                    ? 'Cargando...'
                    : `${list.totalElements} ${list.totalElements === 1 ? 'transferencia' : 'transferencias'}`}
                title="Transferencias"
                right={canTransfer ? (
                    <HeaderButton label="Nueva" accessibilityLabel="Nueva transferencia" onPress={() => router.push('/transfers/new')} />
                ) : undefined}
            />

            {list.isInitialLoading ? (
                <LoadingState label="Cargando transferencias..." />
            ) : list.error && list.items.length === 0 ? (
                <ErrorState message={list.error} onRetry={list.refresh} />
            ) : (
                <FlatList
                    data={list.items}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={SharedStyles.pageList}
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
    route: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    branchName: {
        flexShrink: 1,
    },
});
