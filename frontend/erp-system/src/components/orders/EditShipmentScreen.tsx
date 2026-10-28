import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useOrder, useUpdateOrder } from '@/hooks/use-order-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { toOrderItemRequests, toOrderPromoRequests } from '@/utils/order-request';
import { OrderFlow } from '@/utils/order-routes';
import { hasPermission } from '@/utils/permissions';

type EditShipmentScreenProps = {
    // Stack desde el que se edita: el formulario abre sus pantallas auxiliares en el mismo.
    flow: Exclude<OrderFlow, 'orders'>;
};

export function EditShipmentScreen({ flow }: EditShipmentScreenProps) {
    const canAccess = useAuthStore((state) => hasPermission(state.user, 'CREAR_PEDIDOS'));
    const { id } = useLocalSearchParams<{ id: string }>();
    // fresh: el borrador se inicializa una sola vez y tiene que partir de datos frescos,
    // no de la copia en caché.
    const { order: loadedOrder, isLoading, loadError } = useOrder(id, { fresh: true });
    const order = loadedOrder?.deliveryType === 'SHIPPING' ? loadedOrder : undefined;
    const updateOrder = useUpdateOrder();
    const items = useOrderDraftStore((state) => state.items);
    const promos = useOrderDraftStore((state) => state.promos);
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

    // El backend permite cambiar los ítems y la dirección de entrega de una orden en
    // TO_PREPARE; cliente, sucursal y tipo de entrega no se pueden modificar.
    async function handleSubmit() {
        if (isSubmitting || (items.length === 0 && promos.length === 0)) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            // Sin dirección nueva elegida, el envío conserva la que tiene.
            const { address } = useOrderDraftStore.getState();
            await updateOrder.mutateAsync({
                id: shipment.id,
                data: {
                    items: toOrderItemRequests(items),
                    promos: toOrderPromoRequests(promos),
                    shippingAddressId: address ? Number(address.id) : undefined,
                },
            });
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

    if (!canAccess) {
        return (
            <NotFound
                headerTitle="Editar envío"
                title="Sin permisos"
                description="Tu usuario no tiene permiso para editar envíos."
            />
        );
    }

    return (
        <Screen style={styles.container}>
            <PageHeader
                onBack={isSubmitting ? undefined : handleCancel}
                eyebrow={order.orderNumber}
                title="Editar envío"
            />
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            <OrderForm initialOrder={order} mode="SHIPMENT" flow={flow} onSubmitOrder={handleSubmit} isSubmitting={isSubmitting} submitLabel="Guardar Cambios" />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 0 },
    errorText: { color: Colors.error, fontSize: 13, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
});
