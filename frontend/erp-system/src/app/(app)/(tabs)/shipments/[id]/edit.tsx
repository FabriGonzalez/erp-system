import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useOrderDetail } from '@/hooks/use-order-detail';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { toOrderItemRequests } from '@/utils/order-request';

export default function EditShipmentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { order: loadedOrder, isLoading, loadError } = useOrderDetail(id);
    const order = loadedOrder?.deliveryType === 'SHIPPING' ? loadedOrder : undefined;
    const token = useAuthStore((state) => state.token);
    const updateOrder = useOrderStore((state) => state.updateOrder);
    const items = useOrderDraftStore((state) => state.items);
    const resetDraft = useOrderDraftStore((state) => state.reset);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!order) {
        return (
            <Screen style={styles.container}>
                <Text style={SharedStyles.headerTitle}>Editar Envío</Text>
                {isLoading ? (
                    <LoadingState />
                ) : (
                    <EmptyState
                        title="Envío no encontrado"
                        description={loadError ?? 'El envío no existe o no pertenece a este módulo.'}
                        actionLabel="Volver"
                        onAction={() => router.back()}
                    />
                )}
            </Screen>
        );
    }

    const shipment = order;

    // El backend solo permite cambiar los ítems de una orden en TO_PREPARE;
    // cliente, sucursal y tipo de entrega no se pueden modificar.
    async function handleSubmit() {
        if (!token || isSubmitting || items.length === 0) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await updateOrder(shipment.id, { items: toOrderItemRequests(items) }, token);
            resetDraft();
            router.back();
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'No se pudo guardar el envío.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleCancel() {
        if (isSubmitting) return;
        resetDraft();
        router.back();
    }

    return (
        <Screen style={styles.container}>
            <View style={SharedStyles.header}>
                <Text style={SharedStyles.headerTitle}>Editar Envío</Text>
            </View>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            <OrderForm initialOrder={order} mode="SHIPMENT" onSubmitOrder={handleSubmit} onCancel={handleCancel} isSubmitting={isSubmitting} submitLabel="Guardar Cambios" />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 0 },
    errorText: { color: Colors.error, fontSize: 13, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
});
