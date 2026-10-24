import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartSummaryBar } from '@/components/products/CartSummaryBar';
import { activeVariantPrices, PromotionProductPicker } from '@/components/promotions/PromotionProductPicker';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
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

/** AAAA-MM-DD → DD/MM/AAAA. */
function toDisplayDate(ymd: string) {
    const [year, month, day] = ymd.split('-');
    return `${day}/${month}/${year}`;
}

/** DD/MM/AAAA → AAAA-MM-DD, o null si no es una fecha real (p. ej. 31/02). */
function parseDisplayDate(text: string): string | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
    if (!match) return null;
    const [, day, month, year] = match.map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
}

/** Deja solo dígitos y agrega las barras mientras se escribe. */
function maskDate(text: string) {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Alta y edición de una promo: productos con su cantidad (sin stock, la promo es de toda la
 * empresa; la variante de cada unidad se elige al vender), precio fijo y vigencia.
 */
export function PromotionForm({ initialPromotion, onSubmit, isSubmitting, submitLabel, submitError }: PromotionFormProps) {
    const [name, setName] = useState(initialPromotion?.name ?? '');
    const [description, setDescription] = useState(initialPromotion?.description ?? '');
    const [price, setPrice] = useState(initialPromotion ? String(initialPromotion.price) : '');
    const [startDate, setStartDate] = useState(toDisplayDate(initialPromotion?.startDate ?? todayYmd()));
    const [endDate, setEndDate] = useState(initialPromotion ? toDisplayDate(initialPromotion.endDate) : '');
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
        const start = parseDisplayDate(startDate);
        const end = parseDisplayDate(endDate);

        if (!name.trim()) return setFormError('Poné un nombre a la promo.');
        if (!hasPrice) return setFormError('El precio tiene que ser mayor a $0.');
        if (!start || !end) return setFormError('Las fechas tienen que tener el formato DD/MM/AAAA.');
        if (end < start) return setFormError('La fecha de fin no puede ser anterior a la de inicio.');
        if (components.length === 0) return setFormError('Agregá al menos un producto.');
        if (components.some((component) => !component.available)) {
            return setFormError('Sacá los productos inactivos (marcados en rojo) para poder guardar.');
        }

        setFormError(null);
        onSubmit({
            name: name.trim(),
            description: description.trim() || null,
            price: numericPrice,
            startDate: start,
            endDate: end,
            items: components.map((component) => ({
                productId: Number(component.productId),
                quantity: component.quantity,
            })),
        });
    }

    const error = formError ?? submitError ?? null;

    return (
        <>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.label}>Nombre *</Text>
                    <AppInput value={name} onChangeText={setName} maxLength={100} placeholder="Ej. 2 remeras + gorra" editable={!isSubmitting} />

                    <Text style={styles.label}>Descripción</Text>
                    <AppInput
                        value={description}
                        onChangeText={setDescription}
                        maxLength={500}
                        multiline
                        placeholder="Opcional"
                        editable={!isSubmitting}
                    />
                </View>

                <View style={styles.card}>
                    <View style={styles.cardTopRow}>
                        <Text style={styles.label}>Productos</Text>
                        <Pressable
                            onPress={() => setCatalogVisible(true)}
                            disabled={isSubmitting}
                            style={({ pressed }) => [pressed && SharedStyles.pressed]}
                        >
                            <Text style={styles.link}>Agregar</Text>
                        </Pressable>
                    </View>

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

                <View style={styles.card}>
                    <Text style={styles.label}>Precio de la promo *</Text>
                    <AppInput
                        value={price}
                        onChangeText={(text) => setPrice(text.replace(/[^0-9.,]/g, ''))}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        editable={!isSubmitting}
                    />
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
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Vigencia *</Text>
                    <View style={styles.datesRow}>
                        <View style={styles.dateField}>
                            <Text style={styles.hint}>Desde</Text>
                            <AppInput
                                value={startDate}
                                onChangeText={(text) => setStartDate(maskDate(text))}
                                keyboardType="number-pad"
                                placeholder="DD/MM/AAAA"
                                editable={!isSubmitting}
                            />
                        </View>
                        <View style={styles.dateField}>
                            <Text style={styles.hint}>Hasta</Text>
                            <AppInput
                                value={endDate}
                                onChangeText={(text) => setEndDate(maskDate(text))}
                                keyboardType="number-pad"
                                placeholder="DD/MM/AAAA"
                                editable={!isSubmitting}
                            />
                        </View>
                    </View>
                    <Text style={styles.hint}>Los dos días incluidos. Se vende solo dentro de estas fechas.</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.footer}>
                <AppButton
                    title={isSubmitting ? 'Guardando...' : submitLabel}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                />
            </View>

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
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
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
        borderRadius: 8,
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
        flexDirection: 'row',
        gap: Spacing.md,
    },
    dateField: {
        flex: 1,
        gap: Spacing.xs,
    },
    errorInline: {
        color: Colors.error,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
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
