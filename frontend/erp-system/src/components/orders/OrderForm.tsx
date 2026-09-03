import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OrderAddressSection } from './OrderAddressSection';
import { OrderCartSection } from './OrderCartSection';
import { OrderCustomerSection } from './OrderCustomerSection';
import { OrderDeliverySection } from './OrderDeliverySection';
import { OrderSummarySection } from './OrderSummarySection';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useCustomerStore } from '@/stores/customer-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useProductStore } from '@/stores/product-store';
import { Order } from '@/types/order';

type OrderFormProps = {
    initialOrder?: Order;
    onSubmitOrder: () => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
};

export function OrderForm({
    initialOrder,
    onSubmitOrder,
    onCancel,
    isSubmitting = false,
    submitLabel = 'Crear Pedido',
}: OrderFormProps) {
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const products = useProductStore((state) => state.products);
    const getCustomerById = useCustomerStore(
        (state) => state.getCustomerById,
    );

    const {
        customer,
        deliveryType,
        address,
        items,
        initNewOrder,
        initEditOrder,
        setDeliveryType,
        updateItemQuantity,
        removeItem,
    } = useOrderDraftStore();

    const [formError, setFormError] = useState<string | null>(null);

    const branchId = activeBranch?.id ?? 'branch-1';
    const branchName = activeBranch?.name ?? 'Sucursal Central';

    useEffect(() => {
        setFormError(null);

        if (initialOrder) {
            const currentCustomer = getCustomerById(initialOrder.customerId);

            if (!currentCustomer) {
                setFormError('No se encontró el cliente del pedido.');
                return;
            }

            initEditOrder(initialOrder, currentCustomer);
            return;
        }

        initNewOrder();
    }, [initialOrder, getCustomerById, initEditOrder, initNewOrder]);

    const isShipping = deliveryType === 'SHIPPING';
    const hasAddresses = customer.addresses.length > 0;
    const isShippingBlocked = isShipping && !hasAddresses;

    const totalAmount = items.reduce(
        (sum, item) => sum + item.subtotal,
        0,
    );

    function handleSelectCustomer() {
        router.push('/orders/select-customer');
    }

    function handleSelectAddress() {
        router.push('/orders/select-address');
    }

    function handleAddCustomerAddress() {
        // La pantalla para agregar una dirección a un cliente existente
        // se conectará cuando terminemos select-address.
    }

    function handleAddProducts() {
        router.push('/orders/select-products');
    }

    function handleUpdateQuantity(productId: string, newQty: number) {
        const product = products.find(
            (item) => item.id === productId,
        );

        const maxStock = product
            ? product.stockByBranch[branchId] ?? 0
            : 0;

        updateItemQuantity(productId, newQty, maxStock);
    }

    function validate(): boolean {
        setFormError(null);

        if (items.length === 0) {
            setFormError(
                'Debes agregar al menos un producto al pedido.',
            );
            return false;
        }

        if (isShipping) {
            if (!hasAddresses) {
                setFormError(
                    'El cliente no tiene direcciones registradas para realizar un envío.',
                );
                return false;
            }

            if (!address) {
                setFormError(
                    'Debes seleccionar una dirección de envío para el cliente.',
                );
                return false;
            }
        }

        return true;
    }

    function handleSubmit() {
        if (!validate()) {
            return;
        }

        onSubmitOrder();
    }

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
        >
            {formError ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>
                        {formError}
                    </Text>
                </View>
            ) : null}

            <OrderCustomerSection
                customer={customer}
                onSelectCustomer={handleSelectCustomer}
            />

            <OrderDeliverySection
                deliveryType={deliveryType}
                onChangeDeliveryType={setDeliveryType}
                disabled={isSubmitting}
            />

            {isShipping && (
                <OrderAddressSection
                    customer={customer}
                    selectedAddress={address}
                    onSelectAddress={handleSelectAddress}
                    onAddCustomerAddress={handleAddCustomerAddress}
                />
            )}

            <OrderCartSection
                items={items}
                onAddProducts={handleAddProducts}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={removeItem}
            />

            <OrderSummarySection
                total={totalAmount}
                itemsCount={items.length}
                deliveryType={deliveryType}
                branchName={branchName}
                isSubmitting={isSubmitting}
                submitLabel={submitLabel}
                onSubmit={handleSubmit}
                onCancel={onCancel}
                disabled={isShippingBlocked || items.length === 0}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        marginBottom: Spacing.lg,
    },
    errorBoxText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
});