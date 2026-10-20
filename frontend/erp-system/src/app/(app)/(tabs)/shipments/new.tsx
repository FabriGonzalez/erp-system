import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useCreateOrder } from '@/hooks/use-order-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { showToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import {
    toBackendCustomerId,
    toOrderItemRequests,
    toOrderPaymentOptions,
} from '@/utils/order-request';
import { hasPermission } from '@/utils/permissions';

export default function NewShipmentScreen() {
    const canAccess = useAuthStore((state) => hasPermission(state.user, 'CREAR_PEDIDOS'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const createOrder = useCreateOrder();
    const customer = useOrderDraftStore((state) => state.customer);
    const address = useOrderDraftStore((state) => state.address);
    const items = useOrderDraftStore((state) => state.items);
    const resetDraft = useOrderDraftStore((state) => state.reset);
    const activeBranch = useActiveBranch();

    async function handleSubmitOrder() {
        if (
            isSubmitting ||
            !activeBranch ||
            customer.id === CUSTOMER_ANONYMOUS.id ||
            !address ||
            items.length === 0
        ) {
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            // El resumen guarda el importe cobrado justo antes de enviar.
            const draft = useOrderDraftStore.getState();

            // El backend copia la dirección al envío en la misma transacción del alta.
            const order = await createOrder.mutateAsync({
                branchId: Number(activeBranch.id),
                customerId: toBackendCustomerId(customer),
                salesType: 'WITH_PRODUCTS',
                deliveryType: 'SHIPPING',
                shippingAddressId: Number(address.id),
                items: toOrderItemRequests(items),
                ...toOrderPaymentOptions(draft),
            });

            resetDraft();
            // El toast sigue visible después de volver a Envíos.
            showToast({ type: 'success', message: `Envío ${order.orderNumber} creado.` });
            router.back();
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'No se pudo crear el envío.',
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
                headerTitle="Nuevo envío"
                title="Sin permisos"
                description="Tu usuario no tiene permiso para crear envíos."
            />
        );
    }

    return (
        <Screen style={styles.container}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [
                        SharedStyles.backButton,
                        pressed && SharedStyles.pressed,
                    ]}
                    disabled={isSubmitting}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Nuevo Envío</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <OrderForm
                mode="SHIPMENT"
                onSubmitOrder={handleSubmitOrder}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitLabel="Crear Envío"
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
});
