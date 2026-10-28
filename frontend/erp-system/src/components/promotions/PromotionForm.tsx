import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartSummaryBar } from '@/components/products/CartSummaryBar';
import { activeVariantPrices, PromotionProductPicker } from '@/components/promotions/PromotionProductPicker';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { DateField } from '@/components/ui/DateField';
import { FormField } from '@/components/ui/FormField';
import { FormFooter } from '@/components/ui/FormFooter';
import { FormSection } from '@/components/ui/FormSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Product } from '@/types/product';
import { Promotion, PromotionRequest } from '@/types/promotion';
import { formatCurrency } from '@/utils/format';

/** Un producto elegido; minPrice/maxPrice de sus variantes activas, para mostrar el ahorro. */
type DraftProduct = {
    productId: string;
    productName: string;
    minPrice?: number;
    maxPrice?: number;
    quantity: number;
    // Los que vienen de la promo pueden haberse desactivado después.
    available: boolean;
};

type PromotionFormProps = {
    initialPromotion?: Promotion;
    onSubmit: (data: PromotionRequest) => void;
    isSubmitting: boolean;
    submitLabel: string;
    // Error del backend al guardar.
    submitError?: string | null;
};

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function todayYmd() {
    const today = new Date();
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

/**
 * Alta y edición de una promo: productos con su cantidad (sin stock, la promo es de toda la
 * empresa; la variante de cada unidad se elige al vender), precio fijo y vigencia.
 */
export function PromotionForm({ initialPromotion, onSubmit, isSubmitting, submitLabel, submitError }: PromotionFormProps) {
    const [name, setName] = useState(initialPromotion?.name ?? '');
    const [description, setDescription] = useState(initialPromotion?.description ?? '');
    const [price, setPrice] = useState(initialPromotion ? String(initialPromotion.price) : '');
    // AAAA-MM-DD, como las manda el backend; vacío hasta que se elige.
    const [startDate, setStartDate] = useState(initialPromotion?.startDate ?? todayYmd());
    const [endDate, setEndDate] = useState(initialPromotion?.endDate ?? '');
    const [components, setComponents] = useState<DraftProduct[]>(() =>
        (initialPromotion?.items ?? []).map((item) => ({
            productId: item.productId,
            productName: item.productName,
            minPrice: item.minPrice,
            maxPrice: item.maxPrice,
            quantity: item.quantity,
            available: item.available,
        })));
    const [isCatalogVisible, setCatalogVisible] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // El precio suelto depende de las variantes que se elijan al vender: va como rango.
    const regularMin = components.reduce((sum, component) => sum + (component.minPrice ?? 0) * component.quantity, 0);
    const regularMax = components.reduce((sum, component) => sum + (component.maxPrice ?? 0) * component.quantity, 0);
    const numericPrice = Number(price.replace(',', '.'));
    const hasPrice = price.trim() !== '' && Number.isFinite(numericPrice) && numericPrice > 0;
    const totalUnits = components.reduce((sum, component) => sum + component.quantity, 0);
    const selectionSummary = components
        .map((component) => `${component.productName} ×${component.quantity}`)
        .join(' · ');

    function setQuantity(productId: string, quantity: number) {
        setComponents((current) => quantity <= 0
            ? current.filter((component) => component.productId !== productId)
            : current.map((component) => component.productId === productId ? { ...component, quantity } : component));
        setFormError(null);
    }

    function addProduct(product: Product) {
        const prices = activeVariantPrices(product);
        setComponents((current) => current.some((component) => component.productId === product.id)
            ? current
            : [...current, {
                productId: product.id,
                productName: product.name,
                minPrice: Math.min(...prices),
                maxPrice: Math.max(...prices),
                quantity: 1,
                available: true,
            }]);
        setFormError(null);
    }

    function handleSubmit() {
        if (!name.trim()) return setFormError('Poné un nombre a la promo.');
        if (!hasPrice) return setFormError('El precio tiene que ser mayor a $0.');
        if (!startDate || !endDate) return setFormError('Elegí las fechas de inicio y de fin.');
        if (endDate < startDate) return setFormError('La fecha de fin no puede ser anterior a la de inicio.');
        if (components.length === 0) return setFormError('Agregá al menos un producto.');
        if (components.some((component) => !component.available)) {
            return setFormError('Sacá los productos inactivos (marcados en rojo) para poder guardar.');
        }

        setFormError(null);
        onSubmit({
            name: name.trim(),
            description: description.trim() || null,
            price: numericPrice,
            startDate,
            endDate,
            items: components.map((component) => ({
                productId: Number(component.productId),
                quantity: component.quantity,
            })),
        });
    }

    const error = formError ?? submitError ?? null;

    return (
        <>
            <ScrollView contentContainerStyle={SharedStyles.pageContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <FormSection title="Datos">
                    <FormField label="Nombre *">
                        <AppInput value={name} onChangeText={setName} maxLength={100} placeholder="Ej. 2 remeras + gorra" editable={!isSubmitting} />
                    </FormField>

                    <FormField label="Descripción">
                        <AppInput
                            value={description}
                            onChangeText={setDescription}
                            maxLength={500}
                            multiline
                            placeholder="Opcional"
                            editable={!isSubmitting}
                        />
                    </FormField>
                </FormSection>

                <View style={SharedStyles.pageSection}>
                    <SectionHeader
                        title="Productos"
                        actionLabel={isSubmitting ? undefined : 'Agregar'}
                        onAction={() => setCatalogVisible(true)}
                    />
                    <View style={[SharedStyles.card, styles.card]}>
                        {components.length === 0 ? (
                            <Text style={styles.hint}>
                                Elegí los productos que lleva la promo y cuántos de cada uno. El talle, color, etc. se
                                elige al vender.
                            </Text>
                        ) : (
                            components.map((component) => (
                                <View key={component.productId} style={styles.itemRow}>
                                    <View style={styles.itemInfo}>
                                        <Text style={[styles.itemName, !component.available && styles.errorInline]}>
                                            {component.productName}
                                        </Text>
                                        <Text style={[styles.hint, !component.available && styles.errorInline]}>
                                            {!component.available
                                                ? 'Inactivo o sin variantes activas: sacalo de la promo'
                                                : component.minPrice === component.maxPrice
                                                    ? `${formatCurrency(component.minPrice ?? 0)} c/u`
                                                    : `${formatCurrency(component.minPrice ?? 0)} a ${formatCurrency(component.maxPrice ?? 0)} c/u`}
                                        </Text>
                                    </View>
                                    <View style={styles.qtyControls}>
                                        <Pressable
                                            style={styles.qtyButton}
                                            onPress={() => setQuantity(component.productId, component.quantity - 1)}
                                            disabled={isSubmitting}
                                        >
                                            <SymbolView
                                                name={{ ios: 'minus', android: 'remove', web: 'remove' }}
                                                size={16}
                                                tintColor={Colors.text}
                                            />
                                        </Pressable>
                                        <Text style={styles.qtyText}>{component.quantity}</Text>
                                        <Pressable
                                            style={[styles.qtyButton, !component.available && styles.qtyButtonDisabled]}
                                            onPress={() => setQuantity(component.productId, component.quantity + 1)}
                                            disabled={isSubmitting || !component.available}
                                        >
                                            <SymbolView
                                                name={{ ios: 'plus', android: 'add', web: 'add' }}
                                                size={16}
                                                tintColor={Colors.text}
                                            />
                                        </Pressable>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                <FormSection title="Precio">
                    <FormField label="Precio de la promo *">
                        <AppInput
                            value={price}
                            onChangeText={(text) => setPrice(text.replace(/[^0-9.,]/g, ''))}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            editable={!isSubmitting}
                        />
                    </FormField>
                    <View style={styles.summaryRow}>
                        <Text style={styles.hint}>Sueltos costarían</Text>
                        <Text style={styles.summaryValue}>
                            {regularMin === regularMax
                                ? formatCurrency(regularMin)
                                : `${formatCurrency(regularMin)} a ${formatCurrency(regularMax)}`}
                        </Text>
                    </View>
                    {hasPrice && components.length > 0 ? (
                        regularMin - numericPrice > 0 ? (
                            <View style={styles.summaryRow}>
                                <Text style={styles.hint}>Ahorro</Text>
                                <Text style={[styles.summaryValue, styles.savings]}>
                                    {regularMin === regularMax
                                        ? formatCurrency(regularMin - numericPrice)
                                        : `${formatCurrency(regularMin - numericPrice)} a ${formatCurrency(regularMax - numericPrice)}`}
                                </Text>
                            </View>
                        ) : (
                            // No se bloquea: el backend lo acepta, pero probablemente sea un error de carga.
                            <Text style={styles.warning}>
                                Con las variantes más baratas, el precio de la promo no es menor que la suma de los
                                productos sueltos.
                            </Text>
                        )
                    ) : null}
                </FormSection>

                <FormSection title="Vigencia">
                    <View style={styles.datesRow}>
                        <FormField label="Desde *">
                            <DateField
                                value={startDate}
                                onChange={(ymd) => {
                                    setStartDate(ymd);
                                    setFormError(null);
                                }}
                                disabled={isSubmitting}
                            />
                        </FormField>
                        <FormField label="Hasta *">
                            <DateField
                                value={endDate}
                                onChange={(ymd) => {
                                    setEndDate(ymd);
                                    setFormError(null);
                                }}
                                minimumDate={startDate || undefined}
                                disabled={isSubmitting}
                            />
                        </FormField>
                    </View>
                    <Text style={styles.hint}>Los dos días incluidos. Se vende solo dentro de estas fechas.</Text>
                </FormSection>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </ScrollView>

            <FormFooter>
                <AppButton
                    title={isSubmitting ? 'Guardando...' : submitLabel}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                />
            </FormFooter>

            <Modal visible={isCatalogVisible} animationType="slide" onRequestClose={() => setCatalogVisible(false)}>
                <SafeAreaView style={styles.modal}>
                    <View style={SharedStyles.header}>
                        <View style={SharedStyles.headerSpacer} />
                        <Text style={styles.modalTitle}>Productos de la promo</Text>
                        <Pressable
                            onPress={() => setCatalogVisible(false)}
                            style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                        >
                            <Text style={styles.link}>Listo</Text>
                        </Pressable>
                    </View>

                    <View style={styles.modalBody}>
                        <PromotionProductPicker
                            getQuantity={(productId) =>
                                components.find((component) => component.productId === productId)?.quantity ?? 0
                            }
                            onAdd={addProduct}
                            onChangeQuantity={setQuantity}
                        />

                        <CartSummaryBar
                            itemsCount={totalUnits}
                            detail={selectionSummary}
                            actionLabel="Listo"
                            onPress={() => setCatalogVisible(false)}
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    hint: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    link: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
        paddingTop: Spacing.sm,
    },
    itemInfo: {
        flex: 1,
        gap: 2,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    qtyButton: {
        width: 32,
        height: 32,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyButtonDisabled: {
        opacity: 0.4,
    },
    qtyText: {
        minWidth: 24,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    savings: {
        color: Colors.successDark,
    },
    warning: {
        fontSize: 13,
        color: Colors.warningText,
    },
    datesRow: {
        gap: Spacing.lg,
    },
    errorInline: {
        color: Colors.error,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
    modal: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    // La barra de resumen va con position absolute: se apoya en este contenedor y no en el área segura.
    modalBody: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
    },
});
