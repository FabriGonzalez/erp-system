import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useBranchStore } from '@/stores/branch-store';
import { useCustomerAccountStore } from '@/stores/customer-account-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';

export default function NewShipmentScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const addOrder = useOrderStore((state) => state.addOrder);
    const customer = useOrderDraftStore((state) => state.customer);
    const address = useOrderDraftStore((state) => state.address);
    const items = useOrderDraftStore((state) => state.items);
    const amountPaid = useOrderDraftStore((state) => state.amountPaid);
    const resetDraft = useOrderDraftStore((state) => state.reset);
    const activeBranch = useBranchStore((state) => state.activeBranch);

    function handleSubmitOrder() {
        if (!activeBranch || customer.id === CUSTOMER_ANONYMOUS.id || !address || items.length === 0) {
            return;
        }

        setIsSubmitting(true);

        try {
            const total = items.reduce((sum, item) => sum + item.subtotal, 0);
            const safeAmountPaid = Number.isFinite(amountPaid)
                ? Math.min(Math.max(0, amountPaid), total)
                : 0;

            const orderId = addOrder({
                customerId: customer.id,
                customerName: customer.name,
                salesType: 'WITH_PRODUCTS',
                deliveryType: 'SHIPPING',
                address,
                branchId: activeBranch.id,
                branchName: activeBranch.name,
                items,
                total,
                amountPaid: 0,
            });

            const createdOrder = useOrderStore.getState().orders.find((order) => order.id === orderId);
            if (createdOrder) {
                useCustomerAccountStore.getState().applyAvailableCreditToOrder(customer.id, createdOrder);
                if (safeAmountPaid > 0) {
                    useCustomerAccountStore.getState().recordInitialOrderPayment(
                        customer.id,
                        createdOrder,
                        safeAmountPaid,
                        activeBranch.id,
                    );
                }
            }

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
});
