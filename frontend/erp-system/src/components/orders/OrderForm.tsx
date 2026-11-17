import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OrderAddressSection, OrderEditAddressSection } from './OrderAddressSection';
import { CatalogTab, OrderCartSection } from './OrderCartSection';
import { OrderCustomerNotices } from './OrderCustomerNotices';
import { OrderPaymentSection, PaymentMode } from './OrderPaymentSection';
import { OrderSalesTypeSection } from './OrderSalesTypeSection';
import { OrderTotalCard } from './OrderTotalCard';

import { AppInput } from '@/components/ui/AppInput';
import { ListGroup } from '@/components/ui/ListGroup';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useCustomerAccountSummary } from '@/hooks/use-customer-account-summary';
import { useCustomer, useCustomerAddresses } from '@/hooks/use-customer-queries';
import { useVariantStock } from '@/hooks/use-stock-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { CUSTOMER_ANONYMOUS } from '@/types/customer';
import { Order, OrderCreationMode } from '@/types/order';
import { draftVariantIds, promoLimit } from '@/utils/draft-stock';
import { formatCurrency } from '@/utils/format';
import { CUSTOMER_PICKER_ROUTES, ORDER_FORM_ROUTES, OrderFlow } from '@/utils/order-routes';

const INACTIVE_CUSTOMER_MESSAGE = 'El cliente seleccionado está inactivo. Elegí otro cliente para continuar.';
const DISCOUNT_TOO_HIGH_MESSAGE = 'El descuento tiene que ser menor que el subtotal.';

type OrderFormProps = {
    mode?: OrderCreationMode;
    // Stack desde el que se abre; por defecto, el del modo (Ventas o Envíos).
    flow?: OrderFlow;
    initialOrder?: Order;
    initialSalesType?: 'WITH_PRODUCTS' | 'QUICK_SALE';
    // Cancelar es la flecha del encabezado de cada pantalla.
    onSubmitOrder: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
};

export function OrderForm({
    mode,
    flow: flowProp,
    initialOrder,
    initialSalesType,
    onSubmitOrder,
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
        discount,
        originalUnits,
        applyCredit,
        setApplyCredit,
        paymentMethod,
        setPaymentMethod,
        setAmountPaid,
        initNewOrder,
        initEditOrder,
        reset: resetDraft,
        setSalesType,
        setQuickSaleAmount,
        setDiscount,
        updateItemQuantity,
        updatePromoQuantity,
    } = useOrderDraftStore();

    const creationMode = mode ?? (initialOrder?.deliveryType === 'SHIPPING' ? 'SHIPMENT' : 'SALE');

    const [formError, setFormError] = useState<string | null>(null);
    // Prendido a mano; un descuento cargado (p. ej. al editar) también lo muestra.
    const [isDiscountToggled, setIsDiscountToggled] = useState(false);
    const [quickSaleInput, setQuickSaleInput] = useState(
        quickSaleAmount > 0 ? String(quickSaleAmount) : '',
    );
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('TOTAL');
    const [partialAmount, setPartialAmount] = useState('');

    const branchId = activeBranch?.id ?? '';
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
                    origin: 'ERP' as const,
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

    function handleToggleDiscount(enabled: boolean) {
        setIsDiscountToggled(enabled);
        // Apagado no queda un descuento escondido en el total.
        if (!enabled) {
            setDiscount(0);
        }
    }

    function handleDiscountInputChange(text: string) {
        const parsed = Number(text.replace(/[^0-9]/g, ''));
        setDiscount(Number.isFinite(parsed) ? parsed : 0);
    }

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

    // La venta rápida ya se carga con lo cobrado: no lleva descuento.
    const discountAmount = effectiveSalesType === 'QUICK_SALE' ? 0 : discount;
    // Como en el backend, el pedido no puede quedar en $0.
    const isDiscountEnabled = isDiscountToggled || discount > 0;
    const isDiscountTooHigh = hasProducts && discountAmount > 0 && discountAmount >= itemsTotal;
    const totalAmount = effectiveSalesType === 'QUICK_SALE' ? quickSaleAmount : itemsTotal - discountAmount;

    const accountSummary = useCustomerAccountSummary(customer);
    const customerCredit = accountSummary?.credit ?? 0;
    const customerDebt = accountSummary?.debt ?? 0;
    // Estimación del saldo a favor que el backend aplicará a esta orden.
    const isAnonymousCustomer = customer.id === CUSTOMER_ANONYMOUS.id;
    const creditApplied = !isEditing && applyCredit && !isAnonymousCustomer
        ? Math.min(customerCredit, Math.max(0, totalAmount))
        : 0;
    const amountToCharge = Math.max(0, totalAmount) - creditApplied;
    // Las ventas sin cliente se cobran completas al crearse.
    const effectivePaymentMode: PaymentMode = isAnonymousCustomer ? 'TOTAL' : paymentMode;
    const parsedPartial = Number(partialAmount);
    const amountPaid = effectivePaymentMode === 'TOTAL'
        ? amountToCharge
        : Math.min(Number.isFinite(parsedPartial) ? Math.max(0, parsedPartial) : 0, amountToCharge);
    const unitsCount = items.reduce((sum, item) => sum + item.quantity, 0)
        + promos.reduce((sum, promo) => sum + promo.quantity, 0);

    function handleSelectCustomer() {
        // Solo en el alta: al editar el cliente queda fijo.
        if (flow === 'operations') return;

        // Solo el envío necesita un cliente registrado (su dirección); la venta rápida puede ser a consumidor final.
        const requireRegisteredCustomer = isShipment;
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

    function handleAddProducts(tab: CatalogTab) {
        router.push({ pathname: routes.selectProducts, params: { tab } });
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

        if (isDiscountTooHigh) {
            setFormError(DISCOUNT_TOO_HIGH_MESSAGE);
            return false;
        }

        if (isShipment && customer.id === CUSTOMER_ANONYMOUS.id) {
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

        // La pantalla lee el importe del store en el momento del envío; al editar no se registran pagos.
        setAmountPaid(isEditing ? 0 : amountPaid);
        onSubmitOrder();
    }

    const isFormInvalid =
        isShippingBlocked ||
        isCustomerInactive ||
        (effectiveSalesType === 'WITH_PRODUCTS' ? !hasProducts || isDiscountTooHigh : quickSaleAmount <= 0) ||
        (isShipment && customer.id === CUSTOMER_ANONYMOUS.id);

    const isQuickSale = effectiveSalesType === 'QUICK_SALE';

    return (
        <View style={styles.container}>
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

                <OrderTotalCard
                    total={totalAmount}
                    unitsCount={isQuickSale ? undefined : unitsCount}
                    deliveryType={effectiveDeliveryType}
                    customer={currentCustomer}
                    requireRegisteredCustomer={isShipment}
                    onSelectCustomer={isEditing ? undefined : handleSelectCustomer}
                />

                <OrderCustomerNotices
                    customer={currentCustomer}
                    customerCredit={customerCredit}
                    customerDebt={customerDebt}
                    pendingOrders={accountSummary?.pendingOrders ?? 0}
                    applyCredit={applyCredit}
                    onToggleApplyCredit={isEditing ? undefined : setApplyCredit}
                />

                {isCustomerInactive ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorBoxText}>{INACTIVE_CUSTOMER_MESSAGE}</Text>
                    </View>
                ) : null}

                {/* Sin cliente elegido todavía no hay direcciones para elegir ni agregar. */}
                {needsAddress && !isAnonymousCustomer && (
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

                {!isQuickSale ? (
                    <>
                        <OrderCartSection
                            items={items}
                            promos={promos}
                            onAddProducts={handleAddProducts}
                            onUpdateQuantity={handleUpdateQuantity}
                            onUpdatePromoQuantity={handleUpdatePromoQuantity}
                        />

                        {hasProducts ? (
                            <View style={styles.discountSection}>
                                <ListGroup>
                                    <SwitchRow
                                        title="Aplicar descuento"
                                        value={isDiscountEnabled}
                                        onValueChange={handleToggleDiscount}
                                        disabled={isSubmitting}
                                    />
                                </ListGroup>
                                {isDiscountEnabled ? (
                                    <View style={[SharedStyles.card, styles.amountCard]}>
                                        <View style={styles.subtotalRow}>
                                            <Text style={styles.subtotalLabel}>Subtotal</Text>
                                            <Text style={styles.subtotalValue}>{formatCurrency(itemsTotal)}</Text>
                                        </View>
                                        <Text style={SharedStyles.fieldLabel}>Descuento en pesos</Text>
                                        <View style={[styles.currencyInputRow, isDiscountTooHigh && styles.inputError]}>
                                            <Text style={styles.currencyPrefix}>$</Text>
                                            <AppInput
                                                style={styles.amountInput}
                                                value={discount > 0 ? String(discount) : ''}
                                                onChangeText={handleDiscountInputChange}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                editable={!isSubmitting}
                                            />
                                        </View>
                                        {isDiscountTooHigh ? (
                                            <Text style={styles.fieldErrorText}>{DISCOUNT_TOO_HIGH_MESSAGE}</Text>
                                        ) : null}
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                    </>
                ) : (
                    <View>
                        <Text style={SharedStyles.sectionTitle}>Venta rápida</Text>
                        <View style={[SharedStyles.card, styles.amountCard]}>
                            <Text style={SharedStyles.fieldLabel}>
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
                    </View>
                )}

                {!isEditing ? (
                    <OrderPaymentSection
                        creditApplied={creditApplied}
                        amountToCharge={amountToCharge}
                        isAnonymousCustomer={isAnonymousCustomer}
                        paymentMode={effectivePaymentMode}
                        onChangePaymentMode={setPaymentMode}
                        partialAmount={partialAmount}
                        onChangePartialAmount={setPartialAmount}
                        paymentMethod={paymentMethod}
                        onChangePaymentMethod={setPaymentMethod}
                        disabled={isSubmitting}
                    />
                ) : null}
            </ScrollView>

            <View style={styles.footer}>
                <Pressable
                    style={({ pressed }) => [
                        styles.submit,
                        (isSubmitting || isFormInvalid) && styles.submitDisabled,
                        pressed && styles.submitPressed,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || isFormInvalid}
                    accessibilityRole="button"
                >
                    {isSubmitting ? (
                        <View style={styles.submitting}>
                            <ActivityIndicator size="small" color={Colors.white} />
                            <Text style={styles.submitText}>Procesando...</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.submitText}>{submitLabel}</Text>
                            <Text style={styles.submitTotal}>{formatCurrency(Math.max(0, totalAmount))}</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        padding: Spacing.lg,
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.xl,
        gap: Spacing.lg,
    },
    errorBox: {
        backgroundColor: Colors.errorLight,
        borderRadius: Radius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
    },
    errorBoxText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    submit: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.lg,
        backgroundColor: Colors.primary,
    },
    submitDisabled: {
        opacity: 0.5,
    },
    submitPressed: {
        backgroundColor: Colors.primaryDark,
    },
    submitting: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.white,
    },
    submitTotal: {
        fontSize: 19,
        fontWeight: '800',
        color: Colors.white,
    },
    discountSection: {
        gap: Spacing.sm,
    },
    amountCard: {
        gap: Spacing.sm,
    },
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtotalLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    subtotalValue: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    inputError: {
        borderColor: Colors.errorBorder,
    },
    fieldErrorText: {
        color: Colors.error,
        fontSize: 13,
    },
    required: {
        color: Colors.error,
    },
    currencyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
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