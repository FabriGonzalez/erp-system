import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';

export default function NewOrderScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addOrder = useOrderStore((state) => state.addOrder);

    const customer = useOrderDraftStore((state) => state.customer);
    const deliveryType = useOrderDraftStore((state) => state.deliveryType);
    const address = useOrderDraftStore((state) => state.address);
    const items = useOrderDraftStore((state) => state.items);
    const amountPaid = useOrderDraftStore((state) => state.amountPaid);
    const resetDraft = useOrderDraftStore((state) => state.reset);

    const activeBranch = useBranchStore((state) => state.activeBranch);

    function handleSubmitOrder() {
        if (!activeBranch) {
            console.error('No hay una sucursal activa seleccionada.');
            return;
        }

        if (items.length === 0) {
            console.error('El pedido debe tener al menos un producto.');
            return;
        }

        if (deliveryType === 'SHIPPING' && !address) {
            console.error('Los pedidos con envío requieren una dirección.');
            return;
        }

        setIsSubmitting(true);

        try {
            const total = items.reduce(
                (sum, item) => sum + item.subtotal,
                0,
            );

            addOrder({
                customerId: customer.id,
                customerName: customer.name,
                deliveryType,
                address,
                branchId: activeBranch.id,
                branchName: activeBranch.name,
                items,
                total,
                amountPaid,
            });

            resetDraft();
            router.back();
        } catch (error) {
            console.error('Error al crear el pedido:', error);
        } finally {
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

                <Text style={SharedStyles.headerTitle}>Nuevo Pedido</Text>

                <View style={SharedStyles.headerSpacer} />
            </View>

            <OrderForm
                onSubmitOrder={handleSubmitOrder}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitLabel="Crear Pedido"
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
