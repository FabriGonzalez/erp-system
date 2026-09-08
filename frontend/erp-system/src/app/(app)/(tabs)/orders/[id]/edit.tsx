import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { SuccessBanner } from '@/components/orders/SuccessBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerStore } from '@/stores/customer-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';

export default function EditOrderScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const order = useOrderStore((state) =>
        state.orders.find((item) => item.id === id),
    );
    const updateOrder = useOrderStore((state) => state.updateOrder);

    const getCustomerById = useCustomerStore(
        (state) => state.getCustomerById,
    );

    const customer = useOrderDraftStore((state) => state.customer);
    const deliveryType = useOrderDraftStore((state) => state.deliveryType);
    const address = useOrderDraftStore((state) => state.address);
    const items = useOrderDraftStore((state) => state.items);
    const amountPaid = useOrderDraftStore((state) => state.amountPaid);
    const resetDraft = useOrderDraftStore((state) => state.reset);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!order) {
        return (
            <Screen style={styles.container}>
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
                    description="El pedido que intentas editar no existe o fue eliminado."
                    actionLabel="Volver a pedidos"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    function handleSubmitOrder(orderId: string) {
        const currentCustomer = getCustomerById(customer.id);

        if (!currentCustomer) {
            console.error('No se encontró el cliente del pedido.');
            return;
        }

        if (items.length === 0) {
            console.error('El pedido debe tener al menos un producto.');
            return;
        }

        if (deliveryType === 'SHIPPING' && !address) {
            console.error(
                'Los pedidos con envío requieren una dirección.',
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const total = items.reduce(
                (sum, item) => sum + item.subtotal,
                0,
            );

            updateOrder(orderId, {
                customerId: currentCustomer.id,
                customerName: currentCustomer.name,
                deliveryType,
                address,
                items,
                total,
                amountPaid,
            });

            resetDraft();

            setSuccessMessage('¡Pedido actualizado con éxito!');

            setTimeout(() => {
                router.back();
            }, 600);
        } catch (error) {
            console.error('Error al actualizar el pedido:', error);
            setIsSubmitting(false);
        }
    }

    function handleCancel() {
        if (isSubmitting) {
            return;
        }

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
                        name={{
                            ios: 'chevron.left',
                            android: 'arrow_back',
                            web: 'arrow_back',
                        }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>

                <Text style={SharedStyles.headerTitle}>Editar Pedido</Text>

                <View style={SharedStyles.headerSpacer} />
            </View>

            {successMessage && (
                <SuccessBanner message={successMessage} />
            )}

            <OrderForm
                initialOrder={order}
                onSubmitOrder={() => handleSubmitOrder(order.id)}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitLabel="Guardar Cambios"
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
        backgroundColor: Colors.background,
    },
});