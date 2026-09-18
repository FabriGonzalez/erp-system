import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { OrderActions } from '@/components/orders/OrderActions';
import { OrderHeader } from '@/components/orders/OrderHeader';
import { OrderInfoCard } from '@/components/orders/OrderInfoCard';
import { OrderProducts } from '@/components/orders/OrderProducts';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { SuccessBanner } from '@/components/orders/SuccessBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderStore } from '@/stores/order-store';
import { SHIPPING_STATUS_FLOW } from '@/types/order';

export default function OperationDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const orders = useOrderStore((state) => state.orders);
    const confirmOrder = useOrderStore((state) => state.confirmOrder);
    const cancelOrder = useOrderStore((state) => state.cancelOrder);
    const advanceOrderStatus = useOrderStore((state) => state.advanceOrderStatus);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const order = orders.find((item) => item.id === id);

    if (!order) {
        return (
            <Screen style={styles.screen}>
                <EmptyState
                    title="Operación no encontrada"
                    description="La venta o envío que buscás no existe o fue eliminado."
                    actionLabel="Volver a operaciones"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    const currentOrder = order;

    const canUpdate = user?.role === 'ADMINISTRATOR' || Boolean(user?.permissions?.includes('ORDERS_UPDATE'));
    const isDraft = currentOrder.status === 'DRAFT';
    const isCancelled = currentOrder.status === 'CANCELLED';
    const isShipped = currentOrder.status === 'SHIPPED';
    const isToPrepare = currentOrder.status === 'TO_PREPARE';
    const isShipping = currentOrder.deliveryType === 'SHIPPING';
    const statusIndex = SHIPPING_STATUS_FLOW.indexOf(currentOrder.status);
    const canAdvance = isShipping && !isDraft && !isCancelled && !isShipped && statusIndex >= 0 && statusIndex < SHIPPING_STATUS_FLOW.length - 1;

    function showSuccess(message: string) {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 2000);
    }

    function handleConfirm() {
        if (confirmOrder(currentOrder.id)) showSuccess(isShipping ? 'Envío confirmado correctamente' : 'Venta confirmada correctamente');
    }

    function handleCancel() {
        if (cancelOrder(currentOrder.id)) showSuccess('Operación cancelada');
    }

    function handleAdvance() {
        if (advanceOrderStatus(currentOrder.id)) showSuccess('Estado actualizado');
    }

    return (
        <Screen style={styles.screen}>
            <OrderHeader order={currentOrder} />
            {successMessage && <SuccessBanner message={successMessage} />}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <OrderInfoCard order={currentOrder} />
                <OrderProducts order={currentOrder} />
                <OrderTimeline order={currentOrder} />
            </ScrollView>
            {canUpdate && !isCancelled && !isShipped && (
                <OrderActions
                    isDraft={isDraft}
                    canEdit={false}
                    canAdvance={canAdvance}
                    onEdit={() => { }}
                    onConfirm={handleConfirm}
                    onAdvance={handleAdvance}
                    onCancel={handleCancel}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0 },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2, gap: Spacing.md },
});
