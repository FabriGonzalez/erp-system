import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OrderActions } from '@/components/orders/OrderActions';
import { OrderHeader } from '@/components/orders/OrderHeader';
import { OrderInfoCard } from '@/components/orders/OrderInfoCard';
import { OrderProducts } from '@/components/orders/OrderProducts';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { SuccessBanner } from '@/components/orders/SuccessBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { SHIPPING_STATUS_FLOW } from '@/types/order';

export default function ShipmentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const orders = useOrderStore((state) => state.orders);
    const confirmOrder = useOrderStore((state) => state.confirmOrder);
    const cancelOrder = useOrderStore((state) => state.cancelOrder);
    const advanceOrderStatus = useOrderStore((state) => state.advanceOrderStatus);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const order = orders.find((item) => item.id === id && item.deliveryType === 'SHIPPING');

    if (!order) {
        return (
            <Screen style={styles.screen}>
                <View style={SharedStyles.header}>
                    <Pressable onPress={() => router.back()} style={SharedStyles.backButton}>
                        <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={Colors.text} />
                    </Pressable>
                    <Text style={SharedStyles.headerTitle}>Envío</Text>
                    <View style={SharedStyles.headerSpacer} />
                </View>
                <EmptyState
                    title="Envío no encontrado"
                    description="El envío no existe o no pertenece a este módulo."
                    actionLabel="Volver a envíos"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    const shipment = order;

    const canUpdate = user?.role === 'Administrador' || Boolean(user?.permissions?.includes('ORDERS_UPDATE'));
    const isDraft = order.status === 'DRAFT';
    const isCancelled = order.status === 'CANCELLED';
    const isDelivered = order.status === 'SHIPPED';
    const canEdit = !['SHIPPED', 'TO_PREPARE','CANCELLED'].includes(order.status);
    const statusIndex = SHIPPING_STATUS_FLOW.indexOf(order.status);
    const canAdvance = !isDraft && !isCancelled && !isDelivered && statusIndex >= 0 && statusIndex < SHIPPING_STATUS_FLOW.length - 1;

    function showSuccess(message: string) {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 2000);
    }

    return (
        <Screen style={styles.screen}>
            <OrderHeader order={order} />
            {successMessage && <SuccessBanner message={successMessage} />}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <OrderInfoCard order={order} />
                <OrderProducts order={order} />
                <OrderTimeline order={order} />
            </ScrollView>
            {canUpdate && !isCancelled && !isDelivered && (
                <OrderActions
                    isDraft={isDraft}
                    canEdit={canEdit}
                    canAdvance={canAdvance}
                    onEdit={() => router.push(`/shipments/${shipment.id}/edit`)}
                    onConfirm={() => confirmOrder(shipment.id) && showSuccess('Envío confirmado correctamente')}
                    onAdvance={() => advanceOrderStatus(shipment.id) && showSuccess('Estado del envío actualizado')}
                    onCancel={() => cancelOrder(shipment.id) && showSuccess('Envío cancelado')}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0 },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2, gap: Spacing.md },
});
