import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import {
    toBackendCustomerId,
    toOrderItemRequests,
    toOrderPaymentOptions,
} from '@/utils/order-request';

export default function NewShipmentScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const createOrder = useOrderStore((state) => state.createOrder);
    const token = useAuthStore((state) => state.token);
    const customer = useOrderDraftStore((state) => state.customer);
    const address = useOrderDraftStore((state) => state.address);
    const items = useOrderDraftStore((state) => state.items);
    const resetDraft = useOrderDraftStore((state) => state.reset);
    const activeBranch = useBranchStore((state) => state.activeBranch);

    async function handleSubmitOrder() {
        if (
            !token ||
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

            // La dirección de entrega todavía no se envía: el backend la gestiona
            // como un recurso aparte (POST /orders/{id}/shipment).
            await createOrder(
                {
                    branchId: Number(activeBranch.id),
                    customerId: toBackendCustomerId(customer),
                    salesType: 'WITH_PRODUCTS',
                    deliveryType: 'SHIPPING',
                    items: toOrderItemRequests(items),
                    ...toOrderPaymentOptions(draft),
                },
                token,
            );

            resetDraft();
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
