import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';

export default function EditShipmentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const order = useOrderStore((state) => state.orders.find((item) => item.id === id && item.deliveryType === 'SHIPPING'));
    const updateOrder = useOrderStore((state) => state.updateOrder);
    const customer = useOrderDraftStore((state) => state.customer);
    const address = useOrderDraftStore((state) => state.address);
    const items = useOrderDraftStore((state) => state.items);
    const amountPaid = useOrderDraftStore((state) => state.amountPaid);
    const resetDraft = useOrderDraftStore((state) => state.reset);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!order) {
        return (
            <Screen style={styles.container}>
                <Text style={SharedStyles.headerTitle}>Editar Envío</Text>
                <EmptyState title="Envío no encontrado" description="El envío no existe o no pertenece a este módulo." actionLabel="Volver" onAction={() => router.back()} />
            </Screen>
        );
    }

    const shipment = order;

    function handleSubmit() {
        if (!customer.id || !address || items.length === 0) return;
        setIsSubmitting(true);
        try {
            const total = items.reduce((sum, item) => sum + item.subtotal, 0);
            updateOrder(shipment.id, {
                customerId: customer.id,
                customerName: customer.name,
                salesType: 'WITH_PRODUCTS',
                quickSaleAmount: undefined,
                deliveryType: 'SHIPPING',
                address,
                items,
                total,
                amountPaid: Math.min(Math.max(0, amountPaid), total),
            });
            resetDraft();
            router.back();
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
            <OrderForm initialOrder={order} mode="SHIPMENT" onSubmitOrder={handleSubmit} onCancel={handleCancel} isSubmitting={isSubmitting} submitLabel="Guardar Cambios" />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 0 },
});
