import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { OrderRow } from '@/components/orders/OrderRow';
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
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { formatToday } from '@/utils/format';
import { hasAnyPermission, hasPermission, ORDER_READ_PERMISSIONS } from '@/utils/permissions';

const PENDING_PREVIEW = 3;

export default function ShipmentsScreen() {
    const user = useAuthStore((state) => state.user);
    const canCreate = hasPermission(user, 'CREAR_PEDIDOS');
    const canSeeOrders = hasAnyPermission(user, ORDER_READ_PERMISSIONS);
    const activeBranch = useActiveBranch();

    // Mismos filtros que la lista "A preparar": comparten la caché.
    const toPrepare = useOrders(
        { status: 'TO_PREPARE', deliveryType: 'SHIPPING', branchId: activeBranch?.id },
        { enabled: canSeeOrders },
    );
    const pending = toPrepare.items.slice(0, PENDING_PREVIEW);

    return (
        <Screen style={styles.screen}>
            <PageHeader eyebrow={formatToday()} title="Envíos" right={<BranchChip />} />

            <ScrollView
                contentContainerStyle={SharedStyles.pageContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={toPrepare.isRefreshing}
                        onRefresh={toPrepare.refresh}
                        tintColor={Colors.primary}
                    />
                }
            >
                {canCreate ? (
                    <HeroAction
                        icon={{ ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' }}
                        title="Nuevo envío"
                        subtitle="Productos, cliente y dirección de entrega"
                        onPress={() => router.push('/shipments/new')}
                    />
                ) : null}

                {canSeeOrders ? (
                    <View style={SharedStyles.statRow}>
                        <StatTile
                            label="A preparar"
                            value={toPrepare.isInitialLoading ? '…' : String(toPrepare.totalElements)}
                            icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
                            tone="warning"
                            onPress={() => router.push('/shipments/to-prepare')}
                        />
                    </View>
                ) : null}

                {pending.length > 0 ? (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader
                            title="Para preparar"
                            actionLabel="Ver todos"
                            onAction={() => router.push('/shipments/to-prepare')}
                        />
                        <ListGroup>
                            {pending.map((order) => (
                                <OrderRow
                                    key={order.id}
                                    order={order}
                                    show="status"
                                    onPress={() => router.push({ pathname: '/shipments/[id]', params: { id: order.id } })}
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
