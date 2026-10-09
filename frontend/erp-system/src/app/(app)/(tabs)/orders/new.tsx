import { router, useLocalSearchParams } from 'expo-router';
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
import {
    toBackendCustomerId,
    toOrderItemRequests,
    toOrderPaymentOptions,
} from '@/utils/order-request';

export default function NewOrderScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const createOrder = useOrderStore((state) => state.createOrder);
    const token = useAuthStore((state) => state.token);
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
    const resetDraft = useOrderDraftStore((state) => state.reset);

    const activeBranch = useBranchStore((state) => state.activeBranch);

    async function handleSubmitOrder() {
        if (!token || isSubmitting) {
            return;
        }

        if (!activeBranch) {
            setErrorMessage('No hay una sucursal activa seleccionada.');
            return;
        }

        if (salesType === 'WITH_PRODUCTS' && items.length === 0) {
            setErrorMessage('El pedido debe tener al menos un producto.');
            return;
        }

        if (salesType === 'QUICK_SALE' && quickSaleAmount <= 0) {
            setErrorMessage('Debes ingresar un importe válido para la venta rápida.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const isQuickSale = salesType === 'QUICK_SALE';
            // El resumen guarda el importe cobrado justo antes de enviar.
            const draft = useOrderDraftStore.getState();

            await createOrder(
                {
                    branchId: Number(activeBranch.id),
                    customerId: toBackendCustomerId(customer),
                    salesType,
                    quickSaleAmount: isQuickSale ? quickSaleAmount : undefined,
                    deliveryType: 'LOCAL_PICKUP',
                    items: isQuickSale ? undefined : toOrderItemRequests(items),
                    ...toOrderPaymentOptions(draft),
                },
                token,
            );

            resetDraft();
            router.back();
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'No se pudo crear el pedido.',
            );
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

            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

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
    errorText: {
        color: Colors.error,
        fontSize: 13,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
});
