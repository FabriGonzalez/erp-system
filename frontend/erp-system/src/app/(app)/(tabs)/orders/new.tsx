import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderForm } from '@/components/orders/OrderForm';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCreateOrder } from '@/hooks/use-order-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { showToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import {
    toBackendCustomerId,
    toOrderItemRequests,
    toOrderPaymentOptions,
} from '@/utils/order-request';
import { hasPermission } from '@/utils/permissions';

export default function NewOrderScreen() {
    const canAccess = useAuthStore((state) => hasPermission(state.user, 'CREAR_PEDIDOS'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const createOrder = useCreateOrder();
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
        if (isSubmitting) {
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

            const order = await createOrder.mutateAsync({
                branchId: Number(activeBranch.id),
                customerId: toBackendCustomerId(customer),
                salesType,
                quickSaleAmount: isQuickSale ? quickSaleAmount : undefined,
                deliveryType: 'LOCAL_PICKUP',
                items: isQuickSale ? undefined : toOrderItemRequests(items),
                ...toOrderPaymentOptions(draft),
            });

            resetDraft();
            // El toast sigue visible después de volver a Ventas.
            showToast({ type: 'success', message: `Venta ${order.orderNumber} registrada.` });
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

    if (!canAccess) {
        return (
            <NotFound
                headerTitle="Nueva venta"
                title="Sin permisos"
                description="Tu usuario no tiene permiso para crear ventas."
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
