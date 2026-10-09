import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { OrderActions } from '@/components/orders/OrderActions';
import { OrderHeader } from '@/components/orders/OrderHeader';
import { OrderInfoCard } from '@/components/orders/OrderInfoCard';
import { OrderProducts } from '@/components/orders/OrderProducts';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { SuccessBanner } from '@/components/orders/SuccessBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useOrderActions } from '@/hooks/use-order-actions';
import { useOrderDetail } from '@/hooks/use-order-detail';
import { useAuthStore } from '@/stores/auth-store';

export default function OperationDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const { order, isLoading, loadError } = useOrderDetail(id);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    function showSuccess(message: string) {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 2000);
    }

    const { isBusy, errorMessage, handleCancel, handleDispatch } = useOrderActions(
        showSuccess,
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

    const canUpdate = user?.role === 'Administrador' || user?.role === 'ADMINISTRATOR' || Boolean(user?.permissions?.includes('ORDERS_UPDATE'));
    const isShipping = currentOrder.deliveryType === 'SHIPPING';
    const isToPrepare = currentOrder.status === 'TO_PREPARE';
    const canCancel = currentOrder.status === 'CONFIRMED' || isToPrepare;
    const canDispatch = isShipping && isToPrepare;
    const canEdit = isShipping && isToPrepare;

    return (
        <Screen style={styles.screen}>
            <OrderHeader order={currentOrder} />
            {successMessage && <SuccessBanner message={successMessage} />}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <OrderInfoCard order={currentOrder} />
                <OrderProducts order={currentOrder} />
                <OrderTimeline order={currentOrder} />
            </ScrollView>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            {canUpdate && (canCancel || canDispatch || canEdit) && (
                <OrderActions
                    canEdit={canEdit}
                    canDispatch={canDispatch}
                    canCancel={canCancel}
                    isBusy={isBusy}
                    onEdit={() => router.push(`/shipments/${currentOrder.id}/edit`)}
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
