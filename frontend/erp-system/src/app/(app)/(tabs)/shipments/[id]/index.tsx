import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { SharedStyles } from '@/styles/shared';
import { hasPermission } from '@/utils/permissions';

export default function ShipmentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const { order: loadedOrder, isLoading, loadError } = useOrder(id);
    const order = loadedOrder?.deliveryType === 'SHIPPING' ? loadedOrder : undefined;

    // El éxito se avisa con un toast; el error queda junto a las acciones.
    const { isBusy, errorMessage, handleCancel, handleDispatch } = useOrderActions(
        { cancel: 'Envío cancelado', dispatch: 'Envío despachado correctamente' },
    );

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
    const canCancel = canManageOrders && (order.status === 'CONFIRMED' || isToPrepare);
    const canDispatch = hasPermission(user, 'PREPARAR_PEDIDOS') && isToPrepare;
    const canEdit = canManageOrders && isToPrepare;

    return (
        <Screen style={styles.screen}>
            <OrderHeader order={order} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <OrderInfoCard order={order} />
                <OrderProducts order={order} />
                <OrderTimeline order={order} />
            </ScrollView>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            {(canCancel || canDispatch || canEdit) && (
                <OrderActions
                    canEdit={canEdit}
                    canDispatch={canDispatch}
                    canCancel={canCancel}
                    isBusy={isBusy}
                    onEdit={() => router.push(`/shipments/${shipment.id}/edit`)}
                    onDispatch={() => void handleDispatch(shipment)}
                    onCancel={() => void handleCancel(shipment)}
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
