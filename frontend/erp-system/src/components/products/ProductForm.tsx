import { ProductAttributeFormModal } from '@/components/attributes/ProductAttributeFormModal';
import { ProductAttributeValueFormModal } from '@/components/attributes/ProductAttributeValueFormModal';
import { CategoryFormModal } from '@/components/categories/CategoryFormModal';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { useAttributes } from '@/hooks/use-attribute-queries';
import { SharedStyles } from '@/styles/shared';
import { useAuthStore } from '@/stores/auth-store';
import { Branch } from '@/types/branch';
import { Category } from '@/types/category';
import {
    ProductFormData,
    ProductVariantAttribute,
} from '@/types/product';
import { hasPermission } from '@/utils/permissions';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { AppInput } from '../ui/AppInput';
import { CategoryModal } from './CategoryModal';

type DraftVariant = ProductFormData['variants'][number];

type ProductFormProps = {
    initialValues?: Partial<ProductFormData>;
    categories: Category[];
    branches: Branch[];
    onSubmit: (data: ProductFormData) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
    /** Solo al editar: un producto nuevo se crea siempre activo. */
    showActiveToggle?: boolean;
};

function combinationKey(attributes: ProductVariantAttribute[]) {
    return attributes
        .slice()
        .sort((left, right) => left.attributeId.localeCompare(right.attributeId))
        .map((attribute) => `${attribute.attributeId}:${attribute.attributeValueId}`)
        .join('|');
}

// La variante única de un producto sin variantes (p. ej. un pack surtido) no tiene atributos.
function isManualPlaceholder(variant: DraftVariant) {
    return variant.attributes.length === 0;
}

function generateCombinations(
    selectedValues: Record<string, string[]>,
    currentVariants: DraftVariant[],
    basePrice: string,
): DraftVariant[] {
    const groups = Object.entries(selectedValues).filter(
        ([, values]) => values.length > 0,
    );

    if (!groups.length) {
        return currentVariants;
    }

    const combinations = groups.reduce<ProductVariantAttribute[][]>(
        (result, [attributeId, valueIds]) =>
            result.flatMap((partial) =>
                valueIds.map((attributeValueId) => [
                    ...partial,
                    {
                        attributeId,
                        attributeValueId,
                    },
                ]),
            ),
        [[]],
    );

    const currentByKey = new Map(
        currentVariants.map((variant) => [
            combinationKey(variant.attributes),
            variant,
        ]),
    );

    const result = [...currentVariants];

    for (let index = 0; index < combinations.length; index++) {
        const attributes = combinations[index];
        const key = combinationKey(attributes);

        const existing = currentByKey.get(key);

        if (existing) {
            continue;
        }

        // Sin SKU: lo genera el backend al guardar, único en toda la empresa (este listado
        // está paginado y no tiene los SKU del resto).
        result.push({
            id: `variant-${Date.now()}-${index}`,
            sku: '',
            price: basePrice,
            attributes,
            stockByBranch: {},
        });
    }

    return result;
}

export function ProductForm({
    initialValues,
    categories,
    branches,
    onSubmit,
    onCancel,
    isSubmitting = false,
    submitLabel = 'Guardar Producto',
    showActiveToggle = false,
}: ProductFormProps) {
    // Todos los atributos y valores (de la caché compartida con Atributos) para armar variantes.
    const { attributes, attributeValues } = useAttributes();

    const [name, setName] = useState(initialValues?.name ?? '');
    const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? '');
    const [description, setDescription] = useState(initialValues?.description ?? '');
    const [active, setActive] = useState(initialValues?.active ?? true);
    const [basePrice, setBasePrice] = useState(initialValues?.variants?.[0]?.price ?? '');
    const [variants, setVariants] = useState<DraftVariant[]>(initialValues?.variants ?? [{ id: 'variant-new', sku: '', price: '', attributes: [], stockByBranch: {} }]);
    const [variantMode, setVariantMode] = useState((initialValues?.variants ?? []).some((variant) => variant.attributes.length > 0));
    const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>(() => {
        const values: Record<string, string[]> = {};
        (initialValues?.variants ?? []).forEach((variant) => variant.attributes.forEach((attribute) => {
            values[attribute.attributeId] = [...(values[attribute.attributeId] ?? []), attribute.attributeValueId];
        }));
        return values;
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Se guarda al pasar a modo variantes para no perder su SKU (y en edición, su stock)
    // si se vuelve a "sin variantes".
    const manualVariantRef = useRef<DraftVariant | null>(null);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [isCreateCategoryModalVisible, setIsCreateCategoryModalVisible] = useState(false);
    const openCreateCategoryOnDismissRef = useRef(false);
    const canCreateCategory = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_CATEGORIAS'));
    // Sin este permiso los precios quedan de solo lectura y no se pueden sumar variantes
    // (cada una nueva fija un precio): el backend lo rechaza con PRICE_PERMISSION_REQUIRED.
    const canEditPrices = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRECIOS'));
    // El backend reconoce las variantes existentes por SKU: esas no pueden quedar sin él.
    const initialSkus = new Set((initialValues?.variants ?? []).map((variant) => variant.sku.trim().toUpperCase()));
    const initialVariantIds = new Set((initialValues?.variants ?? []).map((variant) => variant.id));
    const [isCreateAttrModalVisible, setIsCreateAttrModalVisible] = useState(false);
    const [createValueAttrId, setCreateValueAttrId] = useState<string | null>(null);

    const activeBranch = useActiveBranch();
    const selectedCategory = categories.find((category) => category.id === categoryId);
    // Una inactiva no se puede asignar (CATEGORY_INACTIVE); al editar, la que ya tenía el
    // producto se sigue mostrando para no perderla de vista.
    const selectableCategories = categories.filter(
        (category) => category.active || category.id === initialValues?.categoryId,
    );

    function selectCategory(id: string) {
        setCategoryId(id);
        setErrors((current) => ({ ...current, categoryId: '' }));
    }

    function updateVariant(index: number, field: 'sku' | 'price' | 'barcode', value: string) {
        setVariants((current) => current.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant));
        setErrors((current) => ({ ...current, variants: '' }));
    }

    function updateVariantStock(index: number, branchId: string, value: string) {
        const normalizedValue = value.replace(/[^0-9]/g, '');
        setVariants((current) => current.map((variant, variantIndex) => variantIndex === index
            ? { ...variant, stockByBranch: { ...variant.stockByBranch, [branchId]: normalizedValue === '' ? 0 : Number(normalizedValue) } }
            : variant));
        setErrors((current) => ({ ...current, variants: '' }));
    }

    function updateBasePrice(value: string) {
        setBasePrice(value);
        setVariants((current) => current.map((variant) => variant.price === basePrice || !variant.price
            ? { ...variant, price: value }
            : variant));
    }

    function toggleValue(attributeId: string, valueId: string) {
        setSelectedValues((current) => {
            const values = current[attributeId] ?? [];
            return { ...current, [attributeId]: values.includes(valueId) ? values.filter((id) => id !== valueId) : [...values, valueId] };
        });
    }

    function handleGenerate() {
        if (!Object.values(selectedValues).some((values) => values.length > 0)) {
            setErrors((current) => ({ ...current, variants: 'Seleccioná al menos un atributo y un valor para generar variantes' }));
            return;
        }
        setVariants(generateCombinations(selectedValues, variants, basePrice));
        setVariantMode(true);
        setErrors((current) => ({ ...current, variants: '' }));
    }

    function validate() {
        const nextErrors: Record<string, string> = {};
        if (!name.trim()) nextErrors.name = 'El nombre del producto es obligatorio';
        if (!categoryId) nextErrors.categoryId = 'Debes seleccionar una categoría';
        if (!variants.length) nextErrors.variants = 'Debes agregar al menos una variante';

        const skuSet = new Set<string>();
        const barcodeSet = new Set<string>();
        variants.forEach((variant) => {
            const sku = variant.sku.trim().toUpperCase();
            const normalizedPrice = variant.price.trim().replace(',', '.');
            const price = Number(normalizedPrice);
            if (!sku && initialVariantIds.has(variant.id)) nextErrors.variants = 'Las variantes ya guardadas tienen que conservar su SKU';
            if (sku && skuSet.has(sku)) nextErrors.variants = 'Los SKU no se pueden repetir entre variantes';
            if (!variant.price.trim() || !/^\d+(\.\d+)?$/.test(normalizedPrice) || !Number.isFinite(price)) nextErrors.variants = 'Todas las variantes deben tener un precio válido';
            // Un precio 0 dejaría pedidos de $0 que figuran "Pendiente": el backend también lo rechaza.
            else if (price <= 0) nextErrors.variants = 'El precio de cada variante tiene que ser mayor a $0';
            Object.values(variant.stockByBranch).forEach((stock) => {
                if (!Number.isInteger(stock) || stock < 0) nextErrors.variants = 'El stock debe ser un número entero no negativo';
            });
            const attributeIds = variant.attributes.map((attribute) => attribute.attributeId);
            if (new Set(attributeIds).size !== attributeIds.length) nextErrors.variants = 'Una variante no puede tener dos valores del mismo atributo';
            variant.attributes.forEach((attribute) => {
                const value = attributeValues.find((item) => item.id === attribute.attributeValueId);
                if (!value || value.attributeId !== attribute.attributeId) nextErrors.variants = 'Hay valores de atributos inválidos';
                if (!Number.isInteger(Number(attribute.attributeValueId))) {
                    nextErrors.variants = 'Los valores de atributos deben provenir del backend';
                }
            });
            if (sku) skuSet.add(sku);
            // Contra el resto de la empresa lo valida el backend (VARIANT_BARCODE_ALREADY_EXISTS).
            const barcode = variant.barcode?.trim() ?? '';
            if (barcode && barcodeSet.has(barcode)) nextErrors.variants = 'Los códigos de barras no se pueden repetir entre variantes';
            if (barcode) barcodeSet.add(barcode);
            if (!canEditPrices && !initialSkus.has(sku)) {
                nextErrors.variants = 'Sin el permiso "Administrar precios" no se pueden agregar variantes ni cambiar el SKU de una existente';
            }
        });

        const keys = variants.map((variant) => combinationKey(variant.attributes));
        if (new Set(keys).size !== keys.length) nextErrors.variants = 'No puede haber combinaciones duplicadas';
        // Sin atributos solo puede haber una variante: la del producto sin variantes.
        if (variants.length > 1 && variants.some(isManualPlaceholder)) nextErrors.variants = 'Si el producto tiene varias variantes, cada una debe tener al menos un valor de atributo';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }

    function handleSubmit() {
        if (!validate()) return;
        onSubmit({
            name: name.trim(),
            categoryId,
            description: description.trim(),
            active,
            variants: variants.map((variant) => ({
                ...variant,
                sku: variant.sku.trim().toUpperCase(),
                price: variant.price.trim(),
                barcode: variant.barcode?.trim() ?? '',
            })),
        });
    }

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={SharedStyles.listContent} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
                <Text style={SharedStyles.sectionTitle}>
                    Nombre del producto{' '}
                    <Text style={styles.required}>*</Text>
                </Text>

                <AppInput
                    style={errors.name ? styles.inputError : undefined}
                    value={name}
                    onChangeText={setName}
                    editable={!isSubmitting}
                />

                {errors.name ? (
                    <Text style={styles.errorText}>
                        {errors.name}
                    </Text>
                ) : null}
            </View>

            <View style={styles.formGroup}>
                <Text style={SharedStyles.sectionTitle}>Descripción</Text>
                <AppInput
                    value={description}
                    onChangeText={setDescription}
                    editable={!isSubmitting}
                    maxLength={500}
                    multiline
                    numberOfLines={3}
                    style={styles.textArea}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={SharedStyles.sectionTitle}>Categoría <Text style={styles.required}>*</Text></Text>
                <Pressable style={[styles.selectButton, errors.categoryId && styles.inputError]} onPress={() => !isSubmitting && setCategoryModalVisible(true)}>
                    <Text style={[styles.selectButtonText, !selectedCategory && styles.placeholderText]}>{selectedCategory
                        ? `${selectedCategory.name}${selectedCategory.active ? '' : ' (inactiva)'}`
                        : 'Seleccionar categoría'}</Text>
                    <SymbolView name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' }} size={20} tintColor={Colors.textSecondary} />
                </Pressable>
                {errors.categoryId ? <Text style={styles.errorText}>{errors.categoryId}</Text> : null}
            </View>

            <View style={styles.modeRow}>
                <View style={styles.switchLabelContainer}><Text style={styles.switchTitle}>Producto con variantes</Text><Text style={styles.switchSubtitle}>Activá esta opción para combinar atributos como talle y color</Text></View>
                <Switch
                    value={variantMode}
                    onValueChange={(value) => {
                        setVariantMode(value);
                        setErrors((current) => ({ ...current, variants: '' }));
                        if (value) {
                            manualVariantRef.current = variants.find(isManualPlaceholder) ?? manualVariantRef.current;
                            setVariants(variants.filter((variant) => !isManualPlaceholder(variant)));
                        } else {
                            setSelectedValues({});
                            setVariants([manualVariantRef.current ?? {
                                id: 'variant-new',
                                sku: '',
                                price: basePrice,
                                attributes: [],
                                stockByBranch: {},
                            }]);
                        }
                    }}
                    disabled={isSubmitting || !canEditPrices}
                    trackColor={{ false: Colors.track, true: Colors.primary }}
                    thumbColor={Colors.white}
                />
            </View>

            {variantMode && (
                <View style={styles.formGroup}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[SharedStyles.cardTitle, styles.sectionTitle]}>Atributos para variantes</Text>
                        <Pressable
                            style={styles.addInlineButton}
                            onPress={() => setIsCreateAttrModalVisible(true)}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.addInlineButtonText}>+ Agregar atributo</Text>
                        </Pressable>
                    </View>

                    {attributes
                        .filter((attribute) => attribute.active)
                        .map((attribute) => {
                            const activeValues = attributeValues.filter(
                                (value) => value.attributeId === attribute.id && value.active,
                            );

                            return (
                                <View key={attribute.id} style={styles.attributeGroup}>
                                    <View style={styles.attributeHeaderRow}>
                                        <Text style={styles.attributeTitle}>{attribute.name}</Text>
                                        <Pressable
                                            style={styles.addInlineValueButton}
                                            onPress={() => setCreateValueAttrId(attribute.id)}
                                            disabled={isSubmitting}
                                        >
                                            <Text style={styles.addInlineValueText}>+ Agregar valor</Text>
                                        </Pressable>
                                    </View>

                                    <View style={styles.chipsRow}>
                                        {activeValues.map((value) => {
                                            const selected = (selectedValues[attribute.id] ?? []).includes(value.id);
                                            return (
                                                <Pressable
                                                    key={value.id}
                                                    style={[styles.chip, selected && styles.chipSelected]}
                                                    onPress={() => toggleValue(attribute.id, value.id)}
                                                >
                                                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                                        {value.name}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}

                    {canEditPrices && (
                        <Pressable
                            style={styles.secondaryButton}
                            onPress={handleGenerate}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.secondaryButtonText}>Generar variantes</Text>
                        </Pressable>
                    )}
                </View>
            )}

            <View style={styles.formGroup}>
                <Text style={SharedStyles.sectionTitle}>Precio base <Text style={styles.required}>*</Text></Text>
                <AppInput
                    style={styles.input}
                    value={basePrice}
                    onChangeText={updateBasePrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    editable={!isSubmitting && canEditPrices}
                />
                {!canEditPrices && (
                    <Text style={styles.hintText}>
                        Tu usuario no tiene el permiso &quot;Administrar precios&quot;: los precios son de solo
                        lectura y no se pueden agregar variantes.
                    </Text>
                )}
            </View>
            <Text style={styles.smallLabel}>
                Stock {activeBranch ? `— ${activeBranch.name}` : ''}
            </Text>

            <View style={styles.formGroup}>
                <Text style={[SharedStyles.cardTitle, styles.sectionTitle]}>{variantMode ? `Variantes (${variants.length})` : 'Datos del producto'}</Text>
                {variants.map((variant, index) => (
                    <View
                        key={variant.id ?? index}
                        style={styles.variantCard}
                    >
                        {variantMode && (
                            <Text style={styles.variantTitle}>
                                {variant.attributes
                                    .map(
                                        (attribute) =>
                                            attributeValues.find(
                                                (value) =>
                                                    value.id ===
                                                    attribute.attributeValueId,
                                            )?.name,
                                    )
                                    .filter(Boolean)
                                    .join(' / ') || 'Variante manual'}
                            </Text>
                        )}

                        <View style={styles.row}>
                            <View style={styles.flex1}>
                                <Text style={styles.smallLabel}>
                                    {initialVariantIds.has(variant.id) ? 'SKU *' : 'SKU (opcional)'}
                                </Text>

                                <AppInput
                                    style={styles.input}
                                    value={variant.sku}
                                    onChangeText={(value) =>
                                        updateVariant(
                                            index,
                                            'sku',
                                            value,
                                        )
                                    }
                                    autoCapitalize="characters"
                                    placeholder={initialVariantIds.has(variant.id) ? 'Ej. SKU-PA-RO-44' : 'Se genera al guardar'}
                                    editable={!isSubmitting}
                                />
                            </View>

                            <View style={styles.flex1}>
                                <Text style={styles.smallLabel}>
                                    Precio *
                                </Text>

                                <AppInput
                                    style={styles.input}
                                    value={variant.price}
                                    onChangeText={(value) =>
                                        updateVariant(
                                            index,
                                            'price',
                                            value,
                                        )
                                    }
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    editable={!isSubmitting && canEditPrices}
                                />
                            </View>
                        </View>

                        <Text style={styles.smallLabel}>
                            Código de barras (opcional)
                        </Text>
                        <AppInput
                            style={styles.input}
                            value={variant.barcode ?? ''}
                            onChangeText={(value) => updateVariant(index, 'barcode', value)}
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={64}
                            placeholder="Ej. 7791234567890"
                            editable={!isSubmitting}
                        />

                        <Text style={styles.smallLabel}>
                            Stock
                        </Text>

                        {activeBranch ? (
                            <View style={styles.stockRow}>
                                <Text style={styles.stockBranchName}>
                                    {activeBranch.name}
                                </Text>

                                <AppInput
                                    style={styles.stockInput}
                                    value={String(
                                        variant.stockByBranch[activeBranch.id] ?? 0,
                                    )}
                                    onChangeText={(value) =>
                                        updateVariantStock(
                                            index,
                                            activeBranch.id,
                                            value,
                                        )
                                    }
                                    keyboardType="number-pad"
                                    editable={!isSubmitting}
                                />
                            </View>
                        ) : (
                            <Text style={styles.errorText}>
                                Seleccioná una sucursal para cargar el
                                stock.
                            </Text>
                        )}

                        {variantMode && (
                            <Pressable
                                onPress={() =>
                                    setVariants((current) =>
                                        current.filter(
                                            (_, variantIndex) =>
                                                variantIndex !== index,
                                        ),
                                    )
                                }
                                disabled={isSubmitting}
                            >
                                <Text style={styles.removeText}>
                                    Eliminar variante
                                </Text>
                            </Pressable>
                        )}
                    </View>
                ))}
                {errors.variants ? <Text style={styles.errorText}>{errors.variants}</Text> : null}
            </View>
            {showActiveToggle ? (
                <View style={styles.switchRow}>
                    <View style={styles.switchLabelContainer}>
                        <Text style={styles.switchTitle}>
                            Producto activo
                        </Text>

                        <Text style={styles.switchSubtitle}>
                            {active
                                ? 'El producto estará visible y disponible para operaciones'
                                : 'El producto estará desactivado para nuevos pedidos'}
                        </Text>
                    </View>

                    <Switch
                        value={active}
                        onValueChange={setActive}
                        trackColor={{
                            false: Colors.track,
                            true: Colors.primary,
                        }}
                        thumbColor={Colors.white}
                        disabled={isSubmitting}
                    />
                </View>
            ) : null}

            <View style={styles.actionsContainer}>
                <Pressable
                    style={[SharedStyles.buttonSubmit, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <View style={styles.submittingContent}>
                            <ActivityIndicator
                                size="small"
                                color={Colors.white}
                            />

                            <Text style={SharedStyles.buttonSubmitText}>
                                Guardando...
                            </Text>
                        </View>
                    ) : (
                        <Text style={SharedStyles.buttonSubmitText}>
                            {submitLabel}
                        </Text>
                    )}
                </Pressable>

                <Pressable
                    style={SharedStyles.buttonCancel}
                    onPress={onCancel}
                    disabled={isSubmitting}
                >
                    <Text style={SharedStyles.buttonCancelText}>
                        Cancelar
                    </Text>
                </Pressable>
            </View>

            <CategoryModal
                visible={categoryModalVisible}
                categories={selectableCategories}
                selectedCategoryId={categoryId}
                onSelect={selectCategory}
                onClose={() => setCategoryModalVisible(false)}
                onCreateCategory={canCreateCategory ? () => {
                    // Dos Modal a la vez fallan en iOS: se cierra el selector y el alta se abre
                    // en onDismiss, cuando terminó de cerrarse. Android y web no tienen onDismiss.
                    setCategoryModalVisible(false);
                    if (Platform.OS === 'ios') {
                        openCreateCategoryOnDismissRef.current = true;
                    } else {
                        setIsCreateCategoryModalVisible(true);
                    }
                } : undefined}
                onDismiss={() => {
                    if (openCreateCategoryOnDismissRef.current) {
                        openCreateCategoryOnDismissRef.current = false;
                        setIsCreateCategoryModalVisible(true);
                    }
                }}
            />

            <CategoryFormModal
                visible={isCreateCategoryModalVisible}
                onClose={() => setIsCreateCategoryModalVisible(false)}
                onSaved={(category) => selectCategory(category.id)}
            />

            <ProductAttributeFormModal
                visible={isCreateAttrModalVisible}
                onClose={() => setIsCreateAttrModalVisible(false)}
            />

            <ProductAttributeValueFormModal
                visible={Boolean(createValueAttrId)}
                attributeId={createValueAttrId ?? ''}
                attributeName={attributes.find((a) => a.id === createValueAttrId)?.name}
                onClose={() => setCreateValueAttrId(null)}
                onSuccess={(newVal) => {
                    if (createValueAttrId) {
                        setSelectedValues((current) => {
                            const values = current[createValueAttrId] ?? [];
                            if (!values.includes(newVal.id)) {
                                return {
                                    ...current,
                                    [createValueAttrId]: [...values, newVal.id],
                                };
                            }
                            return current;
                        });
                    }
                }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
    addInlineButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
    addInlineButtonText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
    attributeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
    addInlineValueButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 2, paddingHorizontal: 4 },
    addInlineValueText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
    stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
    stockBranchName: { flex: 1, fontSize: 13, color: Colors.text },
    stockInput: { width: 90, height: 40, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: Spacing.sm, fontSize: 14, backgroundColor: Colors.surface, color: Colors.text, textAlign: 'right' },
    formGroup: { marginBottom: Spacing.lg }, row: { flexDirection: 'row', gap: Spacing.md }, flex1: { flex: 1 }, required: { color: Colors.error }, smallLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 }, sectionTitle: { marginBottom: Spacing.sm }, input: { height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: Spacing.md, fontSize: 15, backgroundColor: Colors.surface, color: Colors.text }, inputError: { borderColor: Colors.error, backgroundColor: Colors.errorInput }, errorText: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '500' }, hintText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 }, textArea: { height: 85, paddingTop: Spacing.md }, selectButton: { height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectButtonText: { fontSize: 15, color: Colors.text }, placeholderText: { color: Colors.textSecondary }, modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl }, switchLabelContainer: { flex: 1, marginRight: Spacing.md }, switchTitle: { fontSize: 15, fontWeight: '600', color: Colors.text }, switchSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 }, attributeGroup: { marginBottom: Spacing.md }, attributeTitle: { fontSize: 14, fontWeight: '600', color: Colors.text }, chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }, chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surface }, chipSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary }, chipText: { color: Colors.textSecondary, fontSize: 13 }, chipTextSelected: { color: Colors.primary, fontWeight: '600' }, secondaryButton: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm }, secondaryButtonText: { color: Colors.primary, fontWeight: '600' }, variantCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.md, marginBottom: Spacing.sm }, variantTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm }, removeText: { color: Colors.error, fontSize: 12, fontWeight: '600', marginTop: Spacing.sm }, actionsContainer: { gap: Spacing.sm, marginTop: Spacing.sm }, submitButtonDisabled: { opacity: 0.7 }, submittingContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
