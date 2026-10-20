import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { OrderActions } from '@/components/orders/OrderActions';
import { OrderHeader } from '@/components/orders/OrderHeader';
import { OrderInfoCard } from '@/components/orders/OrderInfoCard';
import { OrderProducts } from '@/components/orders/OrderProducts';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useOrderActions } from '@/hooks/use-order-actions';
import { useOrder } from '@/hooks/use-order-queries';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/utils/permissions';

export default function OperationDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const { order, isLoading, loadError } = useOrder(id);
    // El éxito se avisa con un toast; el error queda junto a las acciones.
    const { isBusy, errorMessage, handleCancel, handleDispatch } = useOrderActions(
        { cancel: 'Operación cancelada', dispatch: 'Envío despachado correctamente' },
    );

    if (!order) {
        if (isLoading) {
            return (
                <Screen style={styles.screen}>
                    <LoadingState />
                </Screen>
            );
        }

        return (
            <Screen style={styles.screen}>
                <EmptyState
                    title="Operación no encontrada"
                    description={loadError ?? 'La venta o envío que buscás no existe o fue eliminado.'}
                    actionLabel="Volver a operaciones"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    const currentOrder = order;

    const canManageOrders = hasPermission(user, 'CREAR_PEDIDOS');
    const isShipping = currentOrder.deliveryType === 'SHIPPING';
    const isToPrepare = currentOrder.status === 'TO_PREPARE';
    const canCancel = canManageOrders && (currentOrder.status === 'CONFIRMED' || isToPrepare);
    const canDispatch = hasPermission(user, 'PREPARAR_PEDIDOS') && isShipping && isToPrepare;
    const canEdit = canManageOrders && isShipping && isToPrepare;

    return (
        <Screen style={styles.screen}>
            <OrderHeader order={currentOrder} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <OrderInfoCard order={currentOrder} />
                <OrderProducts order={currentOrder} />
                <OrderTimeline order={currentOrder} />
            </ScrollView>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            {(canCancel || canDispatch || canEdit) && (
                <OrderActions
                    canEdit={canEdit}
                    canDispatch={canDispatch}
                    canCancel={canCancel}
                    isBusy={isBusy}
                    onEdit={() => router.push({ pathname: '/operations/[id]/edit', params: { id: currentOrder.id } })}
                    onDispatch={() => void handleDispatch(currentOrder)}
                    onCancel={() => void handleCancel(currentOrder)}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0 },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2, gap: Spacing.md },
    errorText: { color: Colors.error, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, fontSize: 13 },
});
