import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AssignBranchModal } from '@/components/orders/AssignBranchModal';
import { OrderActions } from '@/components/orders/OrderActions';
import { OrderHeader } from '@/components/orders/OrderHeader';
import { OrderInfoCard } from '@/components/orders/OrderInfoCard';
import { OrderProducts } from '@/components/orders/OrderProducts';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useOrderActions } from '@/hooks/use-order-actions';
import { useOrder } from '@/hooks/use-order-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { hasPermission } from '@/utils/permissions';

export default function ShipmentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const { order: loadedOrder, isLoading, loadError } = useOrder(id);
    const order = loadedOrder?.deliveryType === 'SHIPPING' ? loadedOrder : undefined;
    const [isAssigning, setIsAssigning] = useState(false);

    // El éxito se avisa con un toast; el error queda junto a las acciones.
    const { isBusy, errorMessage, handleCancel, handleDispatch } = useOrderActions(
        { cancel: 'Envío cancelado', dispatch: 'Envío despachado correctamente' },
    );

    if (!order) {
        return (
            <Screen style={styles.screen}>
                <PageHeader onBack={() => router.back()} title="Envío" />
                {isLoading ? (
                    <LoadingState />
                ) : (
                    <EmptyState
                        title="Envío no encontrado"
                        description={loadError ?? 'El envío no existe o no pertenece a este módulo.'}
                        actionLabel="Volver a envíos"
                        onAction={() => router.back()}
                    />
                )}
            </Screen>
        );
    }

    const shipment = order;

    const canManageOrders = hasPermission(user, 'CREAR_PEDIDOS');
    const isToPrepare = order.status === 'TO_PREPARE';
    const isToAssign = order.status === 'TO_ASSIGN';
    const canCancel = canManageOrders && (order.status === 'CONFIRMED' || isToPrepare || isToAssign);
    const canDispatch = hasPermission(user, 'PREPARAR_PEDIDOS') && isToPrepare;
    // Un pedido web ya se pagó con ese total: no se edita.
    const canEdit = canManageOrders && isToPrepare && order.channel !== 'WEB';
    const canAssign = canManageOrders && isToAssign;

    return (
        <Screen style={styles.screen}>
            <OrderHeader order={order} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={SharedStyles.pageContent}>
                <OrderInfoCard order={order} />
                <OrderProducts order={order} />
                <OrderTimeline order={order} />
            </ScrollView>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            {(canCancel || canDispatch || canEdit || canAssign) && (
                <OrderActions
                    canEdit={canEdit}
                    canDispatch={canDispatch}
                    canCancel={canCancel}
                    canAssign={canAssign}
                    isBusy={isBusy}
                    onEdit={() => router.push(`/shipments/${shipment.id}/edit`)}
                    onDispatch={() => void handleDispatch(shipment)}
                    onCancel={() => void handleCancel(shipment)}
                    onAssign={() => setIsAssigning(true)}
                />
            )}
            {isAssigning ? <AssignBranchModal order={shipment} onClose={() => setIsAssigning(false)} /> : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0 },
    errorText: { color: Colors.error, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, fontSize: 13 },
});
