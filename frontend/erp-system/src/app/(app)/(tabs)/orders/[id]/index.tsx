import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderActions } from '@/components/orders/OrderActions';
import { OrderHeader } from '@/components/orders/OrderHeader';
import { OrderInfoCard } from '@/components/orders/OrderInfoCard';
import { OrderProducts } from '@/components/orders/OrderProducts';
import { SuccessBanner } from '@/components/orders/SuccessBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import { useAuthStore } from '@/stores/auth-store';
import { useOrderStore } from '@/stores/order-store';
import {
    Order,
    SHIPPING_STATUS_FLOW,
} from '@/types/order';

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const user = useAuthStore((state) => state.user);

    const orders = useOrderStore((state) => state.orders);
    const confirmOrder = useOrderStore((state) => state.confirmOrder);
    const cancelOrder = useOrderStore((state) => state.cancelOrder);
    const advanceOrderStatus = useOrderStore(
        (state) => state.advanceOrderStatus
    );

    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const order = orders.find((o) => o.id === id);

    const canUpdate =
        user?.role === 'ADMINISTRATOR' ||
        Boolean(user?.permissions?.includes('ORDERS_UPDATE'));

    if (!order) {
        return (
            <Screen style={styles.screen}>
                <View style={SharedStyles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [
                            SharedStyles.backButton,
                            pressed && SharedStyles.pressed,
                        ]}
                    >
                        <SymbolView
                            name={{
                                ios: 'chevron.left',
                                android: 'arrow_back',
                                web: 'arrow_back',
                            }}
                            size={24}
                            tintColor={Colors.text}
                        />
                    </Pressable>

                    <Text style={SharedStyles.headerTitle}>Pedido</Text>

                    <View style={SharedStyles.headerSpacer} />
                </View>

                <EmptyState
                    title="Pedido no encontrado"
                    description="El pedido que buscás no existe o fue eliminado."
                    actionLabel="Volver a pedidos"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    const currentOrder: Order = order;

    const isDraft = currentOrder.status === 'DRAFT';
    const isCancelled = currentOrder.status === 'CANCELLED';
    const isDelivered = currentOrder.status === 'DELIVERED';
    const isShipping = currentOrder.deliveryType === 'SHIPPING';

    const currentStatusIndex = SHIPPING_STATUS_FLOW.indexOf(currentOrder.status);

    const canAdvance = useMemo(() => {
        return (
            isShipping &&
            !isDraft &&
            !isCancelled &&
            !isDelivered &&
            currentStatusIndex >= 0 &&
            currentStatusIndex < SHIPPING_STATUS_FLOW.length - 1
        );
    }, [isShipping, isDraft, isCancelled, isDelivered, currentStatusIndex]);

    function showSuccessMessage(message: string) {
        setSuccessMessage(message);

        setTimeout(() => {
            setSuccessMessage(null);
        }, 2000);
    }

    function handleEdit() {
        router.push(`/orders/${currentOrder.id}/edit`);
    }

    function handleConfirm() {
        const success = confirmOrder(currentOrder.id);

        if (!success) {
            return;
        }

        showSuccessMessage('Pedido confirmado correctamente');
    }

    function handleCancel() {
        const success = cancelOrder(currentOrder.id);

        if (!success) {
            return;
        }

        showSuccessMessage('Pedido cancelado');
    }

    function handleAdvance() {
        const success = advanceOrderStatus(currentOrder.id);

        if (!success) {
            return;
        }

        showSuccessMessage('Estado del pedido actualizado');
    }

    return (
        <Screen style={styles.screen}>
            <OrderHeader order={currentOrder} />

            {successMessage && <SuccessBanner message={successMessage} />}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <OrderInfoCard order={currentOrder} />

                <OrderProducts order={currentOrder} />

                <OrderTimeline order={currentOrder} />
            </ScrollView>

            {canUpdate && !isCancelled && !isDelivered && (
                <OrderActions
                    isDraft={isDraft}
                    canAdvance={canAdvance}
                    onEdit={handleEdit}
                    onConfirm={handleConfirm}
                    onAdvance={handleAdvance}
                    onCancel={handleCancel}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
        backgroundColor: Colors.background,
    },

    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
        gap: Spacing.md,
    },
});
