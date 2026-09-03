import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { QuantitySelector } from '@/components/QuantitySelector';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderStore } from '@/stores/order-store';
import { useProductStore } from '@/stores/product-store';
import { mockCustomers, CUSTOMER_ANONYMOUS } from '@/data/mock-customers';
import { Customer, CustomerAddress } from '@/types/customer';
import { DeliveryType, OrderItem } from '@/types/order';

type Step = 'customer' | 'delivery' | 'address' | 'products' | 'summary';

const STEP_LABELS: Record<Step, string> = {
    customer: 'Cliente',
    delivery: 'Entrega',
    address: 'Dirección',
    products: 'Productos',
    summary: 'Resumen',
};

const STEP_ORDER: Step[] = ['customer', 'delivery', 'address', 'products', 'summary'];

function getStepsForDelivery(type: DeliveryType | null): Step[] {
    if (type === 'SHIPPING') return ['customer', 'delivery', 'address', 'products', 'summary'];
    return ['customer', 'delivery', 'products', 'summary'];
}

export default function NewOrderScreen() {
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();
    const isEditing = Boolean(orderId);

    const user = useAuthStore((state) => state.user);
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const { products, categories } = useProductStore();
    const { orders, addOrder, updateOrder } = useOrderStore();

    const editingOrder = isEditing ? orders.find((o) => o.id === orderId) : null;

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
        editingOrder
            ? mockCustomers.find((c) => c.id === editingOrder.customerId) ?? CUSTOMER_ANONYMOUS
            : null
    );
    const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(
        editingOrder?.deliveryType ?? null
    );
    const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(
        editingOrder?.address ?? null
    );
    const [selectedProducts, setSelectedProducts] = useState<
        { product: typeof products[0]; quantity: number }[]
    >(
        editingOrder
            ? editingOrder.items.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return product ? { product, quantity: item.quantity } : null;
            }).filter(Boolean) as { product: typeof products[0]; quantity: number }[]
            : []
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const steps = getStepsForDelivery(deliveryType);
    const currentStep = steps[currentStepIndex];

    const total = useMemo(
        () => selectedProducts.reduce((sum, sp) => sum + sp.product.price * sp.quantity, 0),
        [selectedProducts]
    );

    const canGoBack = currentStepIndex > 0;
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === steps.length - 1;

    function handleNext() {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
        }
    }

    function handleBack() {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1);
        }
    }

    function handleSelectCustomer(customer: Customer) {
        setSelectedCustomer(customer);
        handleNext();
    }

    function handleSelectDelivery(type: DeliveryType) {
        setDeliveryType(type);
        setSelectedAddress(null);
        handleNext();
    }

    function handleSelectAddress(address: CustomerAddress) {
        setSelectedAddress(address);
        handleNext();
    }

    function handleToggleProduct(product: typeof products[0]) {
        setSelectedProducts((prev) => {
            const existing = prev.find((sp) => sp.product.id === product.id);
            if (existing) {
                return prev.filter((sp) => sp.product.id !== product.id);
            }
            return [...prev, { product, quantity: 1 }];
        });
    }

    function handleUpdateQuantity(productId: string, quantity: number) {
        setSelectedProducts((prev) =>
            prev.map((sp) =>
                sp.product.id === productId ? { ...sp, quantity } : sp
            )
        );
    }

    function handleSubmit() {
        if (!selectedCustomer || !deliveryType || !activeBranch) return;
        if (selectedProducts.length === 0) return;
        if (deliveryType === 'SHIPPING' && !selectedAddress) return;

        setIsSubmitting(true);

        setTimeout(() => {
            const items: OrderItem[] = selectedProducts.map((sp, index) => ({
                id: `item-${Date.now()}-${index}`,
                productId: sp.product.id,
                productName: sp.product.name,
                productSku: sp.product.sku,
                quantity: sp.quantity,
                unitPrice: sp.product.price,
                subtotal: sp.product.price * sp.quantity,
            }));

            if (isEditing && editingOrder) {
                updateOrder(editingOrder.id, {
                    customerId: selectedCustomer.id,
                    customerName: selectedCustomer.name,
                    deliveryType,
                    address: selectedAddress ?? undefined,
                    items,
                    total,
                });
                setIsSubmitting(false);
                setSuccessMessage('¡Pedido actualizado correctamente!');
            } else {
                addOrder(
                    {
                        customerId: selectedCustomer.id,
                        customerName: selectedCustomer.name,
                        deliveryType,
                        address: selectedAddress ?? undefined,
                        branchId: activeBranch.id,
                        branchName: activeBranch.name,
                        items,
                        total,
                    },
                    deliveryType
                );
                setIsSubmitting(false);
                setSuccessMessage(
                    deliveryType === 'LOCAL_PICKUP'
                        ? 'Pedido creado correctamente'
                        : 'Borrador guardado correctamente'
                );
            }

            setTimeout(() => {
                router.back();
            }, 600);
        }, 500);
    }

    const branchId = activeBranch?.id ?? '1';

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                    disabled={isSubmitting}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={styles.headerTitle}>
                    {isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Success Banner */}
            {successMessage && (
                <View style={styles.successBanner}>
                    <SymbolView
                        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                        size={20}
                        tintColor={Colors.success}
                    />
                    <Text style={styles.successText}>{successMessage}</Text>
                </View>
            )}

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
                {steps.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isCompleted = index < currentStepIndex;
                    return (
                        <View key={step} style={styles.stepItem}>
                            <View
                                style={[
                                    styles.stepDot,
                                    isActive && styles.stepDotActive,
                                    isCompleted && styles.stepDotCompleted,
                                ]}
                            >
                                {isCompleted ? (
                                    <SymbolView
                                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                                        size={12}
                                        tintColor="#FFFFFF"
                                    />
                                ) : (
                                    <Text
                                        style={[
                                            styles.stepDotText,
                                            isActive && styles.stepDotTextActive,
                                        ]}
                                    >
                                        {index + 1}
                                    </Text>
                                )}
                            </View>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    isActive && styles.stepLabelActive,
                                    isCompleted && styles.stepLabelCompleted,
                                ]}
                            >
                                {STEP_LABELS[step]}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* Step Content */}
            <View style={styles.content}>
                {currentStep === 'customer' && (
                    <CustomerStep
                        selectedCustomer={selectedCustomer}
                        onSelect={handleSelectCustomer}
                    />
                )}
                {currentStep === 'delivery' && (
                    <DeliveryStep
                        selectedType={deliveryType}
                        onSelect={handleSelectDelivery}
                    />
                )}
                {currentStep === 'address' && selectedCustomer && (
                    <AddressStep
                        customer={selectedCustomer}
                        selectedAddress={selectedAddress}
                        onSelect={handleSelectAddress}
                    />
                )}
                {currentStep === 'products' && (
                    <ProductsStep
                        products={products}
                        branchId={branchId}
                        selectedProducts={selectedProducts}
                        onToggle={handleToggleProduct}
                        onUpdateQuantity={handleUpdateQuantity}
                    />
                )}
                {currentStep === 'summary' && (
                    <SummaryStep
                        customer={selectedCustomer}
                        deliveryType={deliveryType}
                        address={selectedAddress}
                        selectedProducts={selectedProducts}
                        total={total}
                        isEditing={isEditing}
                        isLocalPickup={deliveryType === 'LOCAL_PICKUP'}
                    />
                )}
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                {canGoBack && (
                    <Pressable
                        style={styles.backAction}
                        onPress={handleBack}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.backActionText}>Atrás</Text>
                    </Pressable>
                )}

                {isLastStep ? (
                    <Pressable
                        style={[
                            styles.submitButton,
                            (isSubmitting || selectedProducts.length === 0) && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting || selectedProducts.length === 0}
                    >
                        {isSubmitting ? (
                            <View style={styles.submittingContent}>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                                <Text style={styles.submitButtonText}>Guardando...</Text>
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isEditing
                                    ? 'Guardar cambios'
                                    : deliveryType === 'LOCAL_PICKUP'
                                        ? 'Crear pedido'
                                        : 'Guardar borrador'}
                            </Text>
                        )}
                    </Pressable>
                ) : (
                    <Pressable
                        style={styles.nextButton}
                        onPress={handleNext}
                        disabled={
                            (currentStep === 'customer' && !selectedCustomer) ||
                            (currentStep === 'delivery' && !deliveryType) ||
                            (currentStep === 'address' && !selectedAddress) ||
                            (currentStep === 'products' && selectedProducts.length === 0)
                        }
                    >
                        <Text style={styles.nextButtonText}>Siguiente</Text>
                    </Pressable>
                )}
            </View>
        </Screen>
    );
}

/* ─── Step: Customer ─────────────────────────────────── */

function CustomerStep({
    selectedCustomer,
    onSelect,
}: {
    selectedCustomer: Customer | null;
    onSelect: (customer: Customer) => void;
}) {
    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
            <Text style={styles.stepTitle}>Seleccionar cliente</Text>

            {/* Consumidor final */}
            <Pressable
                style={({ pressed }) => [
                    styles.customerCard,
                    selectedCustomer?.id === CUSTOMER_ANONYMOUS.id && styles.customerCardSelected,
                    pressed && styles.pressed,
                ]}
                onPress={() => onSelect(CUSTOMER_ANONYMOUS)}
            >
                <View style={styles.customerCardLeft}>
                    <View style={styles.customerAvatar}>
                        <Text style={styles.customerAvatarText}>CF</Text>
                    </View>
                    <View>
                        <Text style={styles.customerName}>Consumidor final</Text>
                        <Text style={styles.customerSub}>Cliente no identificado</Text>
                    </View>
                </View>
                {selectedCustomer?.id === CUSTOMER_ANONYMOUS.id && (
                    <SymbolView
                        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                        size={20}
                        tintColor={Colors.primary}
                    />
                )}
            </Pressable>

            {/* Customer list */}
            <Text style={styles.sectionLabel}>O seleccionar un cliente existente</Text>
            {mockCustomers.map((customer) => (
                <Pressable
                    key={customer.id}
                    style={({ pressed }) => [
                        styles.customerCard,
                        selectedCustomer?.id === customer.id && styles.customerCardSelected,
                        pressed && styles.pressed,
                    ]}
                    onPress={() => onSelect(customer)}
                >
                    <View style={styles.customerCardLeft}>
                        <View style={styles.customerAvatar}>
                            <Text style={styles.customerAvatarText}>
                                {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.customerName}>{customer.name}</Text>
                            {customer.email && (
                                <Text style={styles.customerSub}>{customer.email}</Text>
                            )}
                        </View>
                    </View>
                    {selectedCustomer?.id === customer.id && (
                        <SymbolView
                            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                            size={20}
                            tintColor={Colors.primary}
                        />
                    )}
                </Pressable>
            ))}
        </ScrollView>
    );
}

/* ─── Step: Delivery Type ────────────────────────────── */

function DeliveryStep({
    selectedType,
    onSelect,
}: {
    selectedType: DeliveryType | null;
    onSelect: (type: DeliveryType) => void;
}) {
    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
            <Text style={styles.stepTitle}>Tipo de entrega</Text>

            <Pressable
                style={({ pressed }) => [
                    styles.deliveryCard,
                    selectedType === 'LOCAL_PICKUP' && styles.deliveryCardSelected,
                    pressed && styles.pressed,
                ]}
                onPress={() => onSelect('LOCAL_PICKUP')}
            >
                <SymbolView
                    name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
                    size={28}
                    tintColor={selectedType === 'LOCAL_PICKUP' ? Colors.primary : Colors.textSecondary}
                />
                <View style={styles.deliveryCardInfo}>
                    <Text style={styles.deliveryCardTitle}>Retiro en local</Text>
                    <Text style={styles.deliveryCardDesc}>
                        El cliente retira el pedido en sucursal
                    </Text>
                </View>
                <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={18}
                    tintColor={Colors.textSecondary}
                />
            </Pressable>

            <Pressable
                style={({ pressed }) => [
                    styles.deliveryCard,
                    selectedType === 'SHIPPING' && styles.deliveryCardSelected,
                    pressed && styles.pressed,
                ]}
                onPress={() => onSelect('SHIPPING')}
            >
                <SymbolView
                    name={{ ios: 'truck.fill', android: 'local_shipping', web: 'local_shipping' }}
                    size={28}
                    tintColor={selectedType === 'SHIPPING' ? Colors.primary : Colors.textSecondary}
                />
                <View style={styles.deliveryCardInfo}>
                    <Text style={styles.deliveryCardTitle}>Envío a domicilio</Text>
                    <Text style={styles.deliveryCardDesc}>
                        Se envía a la dirección del cliente
                    </Text>
                </View>
                <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={18}
                    tintColor={Colors.textSecondary}
                />
            </Pressable>
        </ScrollView>
    );
}

/* ─── Step: Address ──────────────────────────────────── */

function AddressStep({
    customer,
    selectedAddress,
    onSelect,
}: {
    customer: Customer;
    selectedAddress: CustomerAddress | null;
    onSelect: (address: CustomerAddress) => void;
}) {
    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
            <Text style={styles.stepTitle}>Dirección de envío</Text>
            <Text style={styles.stepSubtitle}>
                Seleccioná la dirección para el envío de <Text style={{ fontWeight: '700' }}>{customer.name}</Text>
            </Text>

            {customer.addresses.length === 0 ? (
                <View style={styles.emptyAddressContainer}>
                    <SymbolView
                        name={{ ios: 'mappin.slash', android: 'location_off', web: 'location_off' }}
                        size={40}
                        tintColor={Colors.textSecondary}
                    />
                    <Text style={styles.emptyAddressTitle}>Sin direcciones</Text>
                    <Text style={styles.emptyAddressDesc}>
                        Este cliente no tiene direcciones registradas.
                    </Text>
                </View>
            ) : (
                customer.addresses.map((address) => (
                    <Pressable
                        key={address.id}
                        style={({ pressed }) => [
                            styles.addressCard,
                            selectedAddress?.id === address.id && styles.addressCardSelected,
                            pressed && styles.pressed,
                        ]}
                        onPress={() => onSelect(address)}
                    >
                        <View style={styles.addressCardLeft}>
                            <View style={styles.addressIcon}>
                                <SymbolView
                                    name={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }}
                                    size={22}
                                    tintColor={selectedAddress?.id === address.id ? Colors.primary : Colors.textSecondary}
                                />
                            </View>
                            <View style={styles.addressInfo}>
                                <Text style={styles.addressLabel}>{address.label}</Text>
                                <Text style={styles.addressLine}>
                                    {address.street} {address.number}
                                </Text>
                                <Text style={styles.addressLine2}>
                                    {address.city}, {address.province}
                                </Text>
                            </View>
                        </View>
                        {selectedAddress?.id === address.id && (
                            <SymbolView
                                name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                                size={20}
                                tintColor={Colors.primary}
                            />
                        )}
                    </Pressable>
                ))
            )}
        </ScrollView>
    );
}

/* ─── Step: Products ─────────────────────────────────── */

function ProductsStep({
    products: allProducts,
    branchId,
    selectedProducts,
    onToggle,
    onUpdateQuantity,
}: {
    products: typeof useProductStore extends () => infer S ? S extends { products: infer P } ? P : never : never;
    branchId: string;
    selectedProducts: { product: { id: string; name: string; sku: string; price: number; active: boolean; stockByBranch: Record<string, number> }; quantity: number }[];
    onToggle: (product: { id: string; name: string; sku: string; price: number; active: boolean; stockByBranch: Record<string, number> }) => void;
    onUpdateQuantity: (productId: string, quantity: number) => void;
}) {
    const activeProducts = useMemo(
        () => allProducts.filter((p) => p.active),
        [allProducts]
    );

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
            <Text style={styles.stepTitle}>Seleccionar productos</Text>
            <Text style={styles.stepSubtitle}>Solo se muestran productos activos</Text>

            {activeProducts.map((product) => {
                const stock = product.stockByBranch[branchId] ?? 0;
                const isSelected = selectedProducts.some((sp) => sp.product.id === product.id);
                const selectedEntry = selectedProducts.find((sp) => sp.product.id === product.id);
                const isOutOfStock = stock <= 0;

                return (
                    <View
                        key={product.id}
                        style={[
                            styles.productCard,
                            isOutOfStock && styles.productCardDisabled,
                        ]}
                    >
                        <Pressable
                            style={({ pressed }) => [
                                styles.productCardHeader,
                                pressed && styles.pressed,
                            ]}
                            onPress={() => !isOutOfStock && onToggle(product)}
                            disabled={isOutOfStock}
                        >
                            <View style={styles.productInfo}>
                                <Text style={[styles.productName, isOutOfStock && styles.productNameDisabled]}>
                                    {product.name}
                                </Text>
                                <Text style={styles.productSku}>{product.sku}</Text>
                            </View>
                            <View style={styles.productRight}>
                                <Text style={styles.productPrice}>
                                    ${product.price.toLocaleString('es-AR')}
                                </Text>
                                <Text style={[styles.stockText, isOutOfStock && styles.stockTextZero]}>
                                    Stock: {stock}
                                </Text>
                            </View>
                        </Pressable>

                        {isSelected && !isOutOfStock && (
                            <View style={styles.quantityRow}>
                                <QuantitySelector
                                    max={stock}
                                    initialValue={selectedEntry?.quantity ?? 1}
                                    onChange={(qty) => onUpdateQuantity(product.id, qty)}
                                />
                                <Text style={styles.subtotalText}>
                                    ${(product.price * (selectedEntry?.quantity ?? 1)).toLocaleString('es-AR')}
                                </Text>
                            </View>
                        )}

                        {isOutOfStock && (
                            <View style={styles.outOfStockRow}>
                                <SymbolView
                                    name={{ ios: 'xmark.circle', android: 'cancel', web: 'cancel' }}
                                    size={14}
                                    tintColor={Colors.error}
                                />
                                <Text style={styles.outOfStockText}>Sin stock disponible</Text>
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}

/* ─── Step: Summary ──────────────────────────────────── */

function SummaryStep({
    customer,
    deliveryType,
    address,
    selectedProducts,
    total,
    isEditing,
    isLocalPickup,
}: {
    customer: Customer | null;
    deliveryType: DeliveryType | null;
    address: CustomerAddress | null;
    selectedProducts: { product: { id: string; name: string; sku: string; price: number }; quantity: number }[];
    total: number;
    isEditing: boolean;
    isLocalPickup: boolean;
}) {
    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
            <Text style={styles.stepTitle}>Resumen del pedido</Text>

            {/* Customer */}
            <View style={styles.summarySection}>
                <Text style={styles.summaryLabel}>Cliente</Text>
                <Text style={styles.summaryValue}>{customer?.name ?? '—'}</Text>
            </View>

            {/* Delivery */}
            <View style={styles.summarySection}>
                <Text style={styles.summaryLabel}>Tipo de entrega</Text>
                <Text style={styles.summaryValue}>
                    {deliveryType === 'LOCAL_PICKUP' ? 'Retiro en local' : 'Envío a domicilio'}
                </Text>
            </View>

            {/* Address */}
            {deliveryType === 'SHIPPING' && address && (
                <View style={styles.summarySection}>
                    <Text style={styles.summaryLabel}>Dirección</Text>
                    <Text style={styles.summaryValue}>
                        {address.street} {address.number}, {address.city}
                    </Text>
                </View>
            )}

            {/* Products */}
            <View style={styles.summaryProductsSection}>
                <Text style={styles.summaryLabel}>Productos</Text>
                {selectedProducts.map((sp) => (
                    <View key={sp.product.id} style={styles.summaryProductRow}>
                        <View style={styles.summaryProductInfo}>
                            <Text style={styles.summaryProductName} numberOfLines={1}>
                                {sp.product.name}
                            </Text>
                            <Text style={styles.summaryProductDetail}>
                                {sp.quantity} × ${sp.product.price.toLocaleString('es-AR')}
                            </Text>
                        </View>
                        <Text style={styles.summaryProductSubtotal}>
                            ${(sp.product.price * sp.quantity).toLocaleString('es-AR')}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Total */}
            <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>
                    ${total.toLocaleString('es-AR')}
                </Text>
            </View>
        </ScrollView>
    );
}

/* ─── Main Styles ────────────────────────────────────── */

const styles = StyleSheet.create({
    screen: {
        padding: 0,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
    },
    pressed: {
        opacity: 0.7,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSpacer: {
        width: 32,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#BBF7D0',
    },
    successText: {
        color: '#166534',
        fontSize: 14,
        fontWeight: '600',
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: Spacing.xl,
    },
    stepItem: {
        alignItems: 'center',
        gap: 4,
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepDotActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    stepDotCompleted: {
        backgroundColor: Colors.success,
        borderColor: Colors.success,
    },
    stepDotText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    stepDotTextActive: {
        color: '#FFFFFF',
    },
    stepLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    stepLabelActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    stepLabelCompleted: {
        color: Colors.success,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    stepScroll: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    stepSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    bottomActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    backAction: {
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
    },
    backActionText: {
        color: Colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
    nextButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submittingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    /* Customer Step */
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    customerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    customerCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#F8FAFF',
    },
    customerCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    customerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    customerAvatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    customerSub: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 1,
    },

    /* Delivery Step */
    deliveryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.md,
    },
    deliveryCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#F8FAFF',
    },
    deliveryCardInfo: {
        flex: 1,
    },
    deliveryCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    deliveryCardDesc: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },

    /* Address Step */
    emptyAddressContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
    },
    emptyAddressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginTop: Spacing.md,
    },
    emptyAddressDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    addressCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#F8FAFF',
    },
    addressCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    addressIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addressInfo: {
        flex: 1,
    },
    addressLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    addressLine: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    addressLine2: {
        fontSize: 12,
        color: Colors.textSecondary,
    },

    /* Products Step */
    productCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    productCardDisabled: {
        opacity: 0.6,
    },
    productCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    productInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    productNameDisabled: {
        color: Colors.textSecondary,
    },
    productSku: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    productRight: {
        alignItems: 'flex-end',
    },
    productPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    stockText: {
        fontSize: 12,
        color: Colors.success,
        marginTop: 2,
    },
    stockTextZero: {
        color: Colors.error,
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    subtotalText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    outOfStockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: Spacing.sm,
    },
    outOfStockText: {
        fontSize: 12,
        color: Colors.error,
        fontWeight: '500',
    },

    /* Summary Step */
    summarySection: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    summaryProductsSection: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    summaryProductRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    summaryProductInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },
    summaryProductName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    summaryProductDetail: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    summaryProductSubtotal: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    summaryTotalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    summaryTotalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    summaryTotalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.primary,
    },
});
