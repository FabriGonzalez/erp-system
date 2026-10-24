import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OrderAddressSection, OrderEditAddressSection } from './OrderAddressSection';
import { OrderCartSection } from './OrderCartSection';
import { OrderCustomerSection } from './OrderCustomerSection';
import { OrderSalesTypeSection } from './OrderSalesTypeSection';
import { OrderSummarySection } from './OrderSummarySection';

import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useCustomerAccountSummary } from '@/hooks/use-customer-account-summary';
import { useCustomer, useCustomerAddresses } from '@/hooks/use-customer-queries';
import { useVariantStock } from '@/hooks/use-stock-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import { Order, OrderCreationMode } from '@/types/order';
import { draftVariantIds, promoLimit } from '@/utils/draft-stock';
import { CUSTOMER_PICKER_ROUTES, ORDER_FORM_ROUTES, OrderFlow } from '@/utils/order-routes';

const INACTIVE_CUSTOMER_MESSAGE = 'El cliente seleccionado está inactivo. Elegí otro cliente para continuar.';

type OrderFormProps = {
    mode?: OrderCreationMode;
    // Stack desde el que se abre; por defecto, el del modo (Ventas o Envíos).
    flow?: OrderFlow;
    initialOrder?: Order;
    initialSalesType?: 'WITH_PRODUCTS' | 'QUICK_SALE';
    onSubmitOrder: () => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
};

export function OrderForm({
    mode,
    flow: flowProp,
    initialOrder,
    initialSalesType,
    onSubmitOrder,
    onCancel,
    isSubmitting = false,
    submitLabel = 'Crear Pedido',
}: OrderFormProps) {
    const activeBranch = useActiveBranch();

    const {
        customer,
        salesType,
        quickSaleAmount,
        address,
        items,
        promos,
        originalUnits,
        applyCredit,
        setApplyCredit,
        initNewOrder,
        initEditOrder,
        reset: resetDraft,
        setSalesType,
        setQuickSaleAmount,
        updateItemQuantity,
        removeItem,
        updatePromoQuantity,
    } = useOrderDraftStore();

    const creationMode = mode ?? (initialOrder?.deliveryType === 'SHIPPING' ? 'SHIPMENT' : 'SALE');

    const [formError, setFormError] = useState<string | null>(null);
    const [quickSaleInput, setQuickSaleInput] = useState(
        quickSaleAmount > 0 ? String(quickSaleAmount) : '',
    );

    const branchId = activeBranch?.id ?? '';
    const branchName = activeBranch?.name ?? 'Sin sucursal activa';
    // Stock de lo que hay en el carrito (sueltos y variantes de las promos), sin depender de
    // qué páginas del catálogo se cargaron.
    const { stockOf } = useVariantStock(branchId, draftVariantIds(items, promos));

    useEffect(() => {
        if (initialOrder) {
            // Se inicializa una sola vez por orden: el store la reemplaza por un objeto
            // nuevo cada vez que se recarga, y eso no debe pisar lo que ya se editó.
            if (useOrderDraftStore.getState().orderId === initialOrder.id) {
                return;
            }

            // Al editar, el cliente queda fijo: alcanza con los datos de la orden,
            // sin pedir el cliente al backend.
            const currentCustomer = initialOrder.customerId === CUSTOMER_ANONYMOUS.id
                ? CUSTOMER_ANONYMOUS
                : {
                    id: initialOrder.customerId,
                    name: initialOrder.customerName,
                    active: true,
                    addressCount: 0,
                    mainAddress: null,
                };

            initEditOrder(initialOrder, currentCustomer);
            return;
        }

        initNewOrder(creationMode);

        if (creationMode === 'SALE' && initialSalesType) {
            setSalesType(initialSalesType);
        }
    }, [initialOrder, initEditOrder, initNewOrder, creationMode, initialSalesType, setSalesType]);

    // Al salir de la edición se descarta el borrador, para que volver a abrir la misma
    // orden parta de sus datos y no de cambios sin guardar.
    const editingOrderId = initialOrder?.id;
    useEffect(() => {
        if (!editingOrderId) {
            return;
        }

        return () => resetDraft();
    }, [editingOrderId, resetDraft]);

    function handleQuickSaleInputChange(text: string) {
        const cleaned = text.replace(/[^0-9]/g, '');
        setQuickSaleInput(cleaned);
        const parsed = Number(cleaned);
        setQuickSaleAmount(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
    }

    const isShipment = creationMode === 'SHIPMENT';
    const flow: OrderFlow = flowProp ?? (isShipment ? 'shipments' : 'orders');
    const routes = ORDER_FORM_ROUTES[flow];
    const effectiveDeliveryType = isShipment ? 'SHIPPING' : 'LOCAL_PICKUP';
    const effectiveSalesType = isShipment ? 'WITH_PRODUCTS' : salesType;
    const isShipping = effectiveDeliveryType === 'SHIPPING';
    // Al editar, el backend admite cambiar ítems o importe y, en envíos, la
    // dirección de entrega; el cliente queda fijo.
    const isEditing = Boolean(initialOrder);

    // En el alta, el cliente y la dirección del borrador se revalidan contra el backend:
    // pueden haberse desactivado o editado desde otra pantalla u otro dispositivo.
    const { customer: freshCustomer } = useCustomer(isEditing ? undefined : customer.id);
    const currentCustomer = freshCustomer ?? customer;
    const isCustomerInactive = !isEditing && !currentCustomer.active;
    const needsAddress = isShipping && !isEditing;
    // Al editar, address solo existe si se eligió una dirección nueva; se revalida igual.
    const isChangingAddress = isShipping && isEditing && Boolean(address);
    const {
        addresses: activeAddresses,
        isLoading: addressesLoading,
        error: addressesError,
    } = useCustomerAddresses(needsAddress || isChangingAddress ? customer.id : undefined, { activeOnly: true });
    const canCheckAddresses = !addressesLoading && !addressesError;
    const selectedAddress = address?.active
        ? (canCheckAddresses ? activeAddresses.find((item) => item.id === address.id) : address)
        : undefined;
    const isAddressUnavailable = Boolean(address) && !selectedAddress;
    const hasAddresses = currentCustomer.addressCount > 0;
    const isShippingBlocked = needsAddress && !hasAddresses;

    const itemsTotal = items.reduce(
        (sum, item) => sum + item.subtotal,
        0,
    ) + promos.reduce((sum, promo) => sum + promo.subtotal, 0);
    const hasProducts = items.length > 0 || promos.length > 0;

    const totalAmount = effectiveSalesType === 'QUICK_SALE' ? quickSaleAmount : itemsTotal;

    const accountSummary = useCustomerAccountSummary(customer);
    const customerCredit = accountSummary?.credit ?? 0;
    const customerDebt = accountSummary?.debt ?? 0;
    // Estimación del saldo a favor que el backend aplicará a esta orden.
    const creditApplied = !isEditing && applyCredit
        ? Math.min(customerCredit, Math.max(0, totalAmount))
        : 0;

    function handleSelectCustomer() {
        // Solo en el alta: al editar el cliente queda fijo.
        if (flow === 'operations') return;

        const requireRegisteredCustomer = isShipment || effectiveSalesType === 'QUICK_SALE';
        router.push({
            pathname: CUSTOMER_PICKER_ROUTES[flow].selectCustomer,
            params: requireRegisteredCustomer ? { allowAnonymous: 'false' } : undefined,
        });
    }

    function handleSelectAddress() {
        router.push(routes.selectAddress);
    }

    function handleAddCustomerAddress() {
        router.push({
            pathname: routes.addAddress,
            params: { id: customer.id },
        });
    }

    function handleAddProducts() {
        router.push(routes.selectProducts);
    }

    function handleUpdateQuantity(productId: string, variantId: string, newQty: number) {
        // Mientras llega el stock de la variante solo se puede bajar; al editar, el store
        // suma lo que el pedido ya tenía reservado.
        updateItemQuantity(productId, variantId, newQty, stockOf(variantId) ?? 0);
    }

    function handleUpdatePromoQuantity(lineId: string, newQty: number) {
        const promo = promos.find((candidate) => candidate.id === lineId);
        if (!promo) return;
        // Más de la misma combinación de variantes. Hasta que llega su stock solo se puede bajar;
        // una línea que el pedido ya tenía conserva lo vendido aunque la promo haya vencido.
        const limit = promoLimit(lineId, promo.components, stockOf, originalUnits, items, promos);
        updatePromoQuantity(lineId, newQty, limit ?? promo.quantity);
    }

    function validate(): boolean {
        setFormError(null);

        if (effectiveSalesType === 'WITH_PRODUCTS' && !hasProducts) {
            setFormError(
                'Debes agregar al menos un producto o una promo al pedido.',
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

        if (isCustomerInactive) {
            setFormError(INACTIVE_CUSTOMER_MESSAGE);
            return false;
        }

        if (needsAddress) {
            if (!hasAddresses) {
                setFormError(
                    'El cliente no tiene direcciones registradas para realizar un envío.',
                );
                return false;
            }

            if (!selectedAddress) {
                setFormError(
                    'Debes seleccionar una dirección de envío para el cliente.',
                );
                return false;
            }
        }

        if (isChangingAddress && !selectedAddress) {
            setFormError('La dirección elegida ya no está disponible. Seleccioná otra.');
            return false;
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
        isCustomerInactive ||
        (effectiveSalesType === 'WITH_PRODUCTS' ? !hasProducts : quickSaleAmount <= 0) ||
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
                customer={currentCustomer}
                customerCredit={customerCredit}
                customerDebt={customerDebt}
                pendingOrders={accountSummary?.pendingOrders ?? 0}
                applyCredit={applyCredit}
                onToggleApplyCredit={isEditing ? undefined : setApplyCredit}
                requireRegisteredCustomer={isShipment || effectiveSalesType === 'QUICK_SALE'}
                onSelectCustomer={isEditing ? () => {} : handleSelectCustomer}
            />

            {isCustomerInactive ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{INACTIVE_CUSTOMER_MESSAGE}</Text>
                </View>
            ) : null}

            {needsAddress && (
                <OrderAddressSection
                    customer={currentCustomer}
                    selectedAddress={selectedAddress}
                    isSelectedAddressUnavailable={isAddressUnavailable}
                    onSelectAddress={handleSelectAddress}
                    onAddCustomerAddress={handleAddCustomerAddress}
                />
            )}

            {isShipping && isEditing && (
                <OrderEditAddressSection
                    currentAddress={initialOrder?.shippingAddress}
                    selectedAddress={selectedAddress}
                    isSelectedAddressUnavailable={isAddressUnavailable}
                    onSelectAddress={handleSelectAddress}
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
                    promos={promos}
                    onAddProducts={handleAddProducts}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={removeItem}
                    onUpdatePromoQuantity={handleUpdatePromoQuantity}
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
                itemsCount={effectiveSalesType === 'WITH_PRODUCTS' ? items.length + promos.length : 0}
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