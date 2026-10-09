import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OrderAddressSection } from './OrderAddressSection';
import { OrderCartSection } from './OrderCartSection';
import { OrderCustomerSection } from './OrderCustomerSection';
import { OrderSalesTypeSection } from './OrderSalesTypeSection';
import { OrderSummarySection } from './OrderSummarySection';

import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerAccountSummary } from '@/hooks/use-customer-account-summary';
import { useBranchStore } from '@/stores/branch-store';
import { useCustomerStore } from '@/stores/customer-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { useProductStore } from '@/stores/product-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import { Order, OrderCreationMode } from '@/types/order';

type OrderFormProps = {
    mode?: OrderCreationMode;
    initialOrder?: Order;
    initialSalesType?: 'WITH_PRODUCTS' | 'QUICK_SALE';
    onSubmitOrder: () => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
};

export function OrderForm({
    mode,
    initialOrder,
    initialSalesType,
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
        salesType,
        quickSaleAmount,
        address,
        items,
        applyCredit,
        setApplyCredit,
        initNewOrder,
        initEditOrder,
        setSalesType,
        setQuickSaleAmount,
        updateItemQuantity,
        removeItem,
    } = useOrderDraftStore();

    const creationMode = mode ?? (initialOrder?.deliveryType === 'SHIPPING' ? 'SHIPMENT' : 'SALE');

    const [formError, setFormError] = useState<string | null>(null);
    const [quickSaleInput, setQuickSaleInput] = useState(
        quickSaleAmount > 0 ? String(quickSaleAmount) : '',
    );

    const branchId = activeBranch?.id ?? '';
    const branchName = activeBranch?.name ?? 'Sin sucursal activa';

    useEffect(() => {
        if (initialOrder) {
            // Los clientes reales todavía no están en el store local; se arma
            // uno mínimo con los datos de la orden.
            const currentCustomer = getCustomerById(initialOrder.customerId) ?? {
                id: initialOrder.customerId,
                name: initialOrder.customerName,
                addresses: [],
            };

            initEditOrder(initialOrder, currentCustomer);
            return;
        }

        initNewOrder(creationMode);

        if (creationMode === 'SALE' && initialSalesType) {
            setSalesType(initialSalesType);
        }
    }, [initialOrder,getCustomerById,initEditOrder,initNewOrder,creationMode,initialSalesType,setSalesType,]);

    function handleQuickSaleInputChange(text: string) {
        const cleaned = text.replace(/[^0-9]/g, '');
        setQuickSaleInput(cleaned);
        const parsed = Number(cleaned);
        setQuickSaleAmount(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
    }

    const isShipment = creationMode === 'SHIPMENT';
    const effectiveDeliveryType = isShipment ? 'SHIPPING' : 'LOCAL_PICKUP';
    const effectiveSalesType = isShipment ? 'WITH_PRODUCTS' : salesType;
    const isShipping = effectiveDeliveryType === 'SHIPPING';
    const hasAddresses = customer.addresses.length > 0;
    // Al editar, el backend solo admite cambiar ítems o importe: cliente y
    // dirección de entrega quedan fijos.
    const isEditing = Boolean(initialOrder);
    const isShippingBlocked = isShipping && !isEditing && !hasAddresses;

    const itemsTotal = items.reduce(
        (sum, item) => sum + item.subtotal,
        0,
    );

    const totalAmount = effectiveSalesType === 'QUICK_SALE' ? quickSaleAmount : itemsTotal;

    const accountSummary = useCustomerAccountSummary(customer);
    const customerCredit = accountSummary?.credit ?? 0;
    const customerDebt = accountSummary?.debt ?? 0;
    // Estimación del saldo a favor que el backend aplicará a esta orden.
    const creditApplied = !isEditing && applyCredit
        ? Math.min(customerCredit, Math.max(0, totalAmount))
        : 0;

    function handleSelectCustomer() {
        const requireRegisteredCustomer = isShipment || effectiveSalesType === 'QUICK_SALE';
        const customerRoute = isShipment
            ? '/shipments/select-customer'
            : '/orders/select-customer';
        router.push({
            pathname: customerRoute,
            params: requireRegisteredCustomer ? { allowAnonymous: 'false' } : undefined,
        });
    }

    function handleSelectAddress() {
        router.push(isShipment ? '/shipments/select-address' : '/orders/select-address');
    }

    function handleAddCustomerAddress() {
        const addressRoute = isShipment
            ? '/shipments/add-address'
            : '/orders/add-address';
        router.push({
            pathname: addressRoute,
            params: { id: customer.id },
        });
    }

    function handleAddProducts() {
        router.push(isShipment ? '/shipments/select-products' : '/orders/select-products');
    }

    function handleUpdateQuantity(productId: string, variantId: string, newQty: number) {
        const product = products.find(
            (item) => item.id === productId,
        );

        const variant = product?.variants.find((item) => item.id === variantId);
        const maxStock = variant
            ? variant.stockByBranch[branchId] ?? 0
            : 0;

        updateItemQuantity(productId, variantId, newQty, maxStock);
    }

    function validate(): boolean {
        setFormError(null);

        if (effectiveSalesType === 'WITH_PRODUCTS' && items.length === 0) {
            setFormError(
                'Debes agregar al menos un producto al pedido.',
            );
            return false;
        }

        if (effectiveSalesType === 'QUICK_SALE' && quickSaleAmount <= 0) {
            setFormError(
                'Debes ingresar un importe válido para la venta rápida.',
            );
            return false;
        }

        if ((isShipment || effectiveSalesType === 'QUICK_SALE') && customer.id === CUSTOMER_ANONYMOUS.id) {
            setFormError('Debes seleccionar un cliente registrado.');
            return false;
        }

        if (isShipping && !isEditing) {
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

    const isFormInvalid =
        isShippingBlocked ||
        (effectiveSalesType === 'WITH_PRODUCTS' ? items.length === 0 : quickSaleAmount <= 0) ||
        ((isShipment || effectiveSalesType === 'QUICK_SALE') && customer.id === CUSTOMER_ANONYMOUS.id);

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
                customerCredit={customerCredit}
                customerDebt={customerDebt}
                pendingOrders={accountSummary?.pendingOrders ?? 0}
                applyCredit={applyCredit}
                onToggleApplyCredit={isEditing ? undefined : setApplyCredit}
                requireRegisteredCustomer={isShipment || effectiveSalesType === 'QUICK_SALE'}
                onSelectCustomer={isEditing ? () => {} : handleSelectCustomer}
            />

            {isShipping && !isEditing && (
                <OrderAddressSection
                    customer={customer}
                    selectedAddress={address}
                    onSelectAddress={handleSelectAddress}
                    onAddCustomerAddress={handleAddCustomerAddress}
                />
            )}

            {!isShipment && !initialSalesType && (
                <OrderSalesTypeSection
                    salesType={salesType}
                    onChangeSalesType={setSalesType}
                    disabled={isSubmitting}
                />
            )}

            {effectiveSalesType === 'WITH_PRODUCTS' ? (
                <OrderCartSection
                    items={items}
                    onAddProducts={handleAddProducts}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={removeItem}
                />
            ) : (
                <View style={styles.quickSaleCard}>
                    <Text style={SharedStyles.sectionTitle}>Venta Rápida</Text>
                    <Text style={styles.inputLabel}>
                        Importe total de la venta <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.currencyInputRow}>
                        <Text style={styles.currencyPrefix}>$</Text>
                        <AppInput
                            style={styles.amountInput}
                            value={quickSaleInput}
                            onChangeText={handleQuickSaleInputChange}
                            keyboardType="numeric"
                            placeholder="0.00"
                            editable={!isSubmitting}
                        />
                    </View>
                </View>
            )}

            <OrderSummarySection
                total={totalAmount}
                creditApplied={creditApplied}
                showPayment={!isEditing}
                itemsCount={effectiveSalesType === 'WITH_PRODUCTS' ? items.length : 0}
                deliveryType={effectiveDeliveryType}
                branchName={branchName}
                isSubmitting={isSubmitting}
                submitLabel={submitLabel}
                onSubmit={handleSubmit}
                onCancel={onCancel}
                disabled={isFormInvalid}
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
        borderColor: Colors.errorBorder,
        marginBottom: Spacing.lg,
    },
    errorBoxText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    quickSaleCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    required: {
        color: Colors.error,
    },
    currencyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
    },
    currencyPrefix: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        marginRight: Spacing.xs,
    },
    amountInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        borderWidth: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
    },
});