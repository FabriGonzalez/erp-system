import { router, useLocalSearchParams } from 'expo-router';
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

export default function NewOrderScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const addOrder = useOrderStore((state) => state.addOrder);
    const { salesType: salesTypeParam } = useLocalSearchParams<{
        salesType?: string;
    }>();
    const salesType: 'WITH_PRODUCTS' | 'QUICK_SALE' =
    salesTypeParam === 'QUICK_SALE'
        ? 'QUICK_SALE'
        : 'WITH_PRODUCTS';
    const quickSaleAmount = useOrderDraftStore((state) => state.quickSaleAmount);
    const customer = useOrderDraftStore((state) => state.customer);
    const items = useOrderDraftStore((state) => state.items);
    const amountPaid = useOrderDraftStore((state) => state.amountPaid);
    const resetDraft = useOrderDraftStore((state) => state.reset);

    const activeBranch = useBranchStore((state) => state.activeBranch);

    function handleSubmitOrder() {
        if (!activeBranch) {
            console.error('No hay una sucursal activa seleccionada.');
            return;
        }

        if (salesType === 'WITH_PRODUCTS' && items.length === 0) {
            console.error('El pedido debe tener al menos un producto.');
            return;
        }

        if (salesType === 'QUICK_SALE' && quickSaleAmount <= 0) {
            console.error('Debes ingresar un importe válido para la venta rápida.');
            return;
        }

        setIsSubmitting(true);

        try {
            const isQuickSale = salesType === 'QUICK_SALE';
            const orderItems = isQuickSale ? [] : items;
            const rawTotal = isQuickSale
                ? quickSaleAmount
                : items.reduce((sum, item) => sum + item.subtotal, 0);

            const safeTotal = Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : 0;
            const clampedAmountPaid = Number.isFinite(amountPaid)
                ? Math.min(Math.max(0, amountPaid), safeTotal)
                : 0;
            const safeAmountPaid = customer.id === CUSTOMER_ANONYMOUS.id &&
                clampedAmountPaid > 0 && clampedAmountPaid < safeTotal
                ? safeTotal
                : clampedAmountPaid;

            const orderId = addOrder({
                customerId: customer.id,
                customerName: customer.name,
                salesType,
                quickSaleAmount: isQuickSale ? quickSaleAmount : undefined,
                deliveryType: 'LOCAL_PICKUP',
                address: undefined,
                branchId: activeBranch.id,
                branchName: activeBranch.name,
                items: orderItems,
                total: safeTotal,
                amountPaid: 0,
            });

            const createdOrder = useOrderStore.getState().orders.find((order) => order.id === orderId);
            if (createdOrder && customer.id !== CUSTOMER_ANONYMOUS.id) {
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

            if (createdOrder && customer.id === CUSTOMER_ANONYMOUS.id && safeAmountPaid > 0) {
                useOrderStore.getState().updateOrder(orderId, { amountPaid: safeAmountPaid });
            }

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

                <Text style={SharedStyles.headerTitle}>Nueva Venta</Text>

                <View style={SharedStyles.headerSpacer} />
            </View>

            <OrderForm
                mode="SALE"
                initialSalesType={salesType}
                onSubmitOrder={handleSubmitOrder}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitLabel="Crear venta"
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
});
