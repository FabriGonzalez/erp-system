import { ProductAttributeFormModal } from '@/components/attributes/ProductAttributeFormModal';
import { ProductAttributeValueFormModal } from '@/components/attributes/ProductAttributeValueFormModal';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { SharedStyles } from '@/styles/shared';
import { useProductAttributeStore } from '@/stores/product-attribute-store';
import { useAuthStore } from '@/stores/auth-store';
import { Branch } from '@/types/branch';
import { Category } from '@/types/category';
import {
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductFormData,
    ProductVariantAttribute,
} from '@/types/product';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
    attributes?: ProductAttribute[];
    attributeValues?: ProductAttributeValue[];
    branches: Branch[];
    existingProducts: Product[];
    currentProductId?: string;
    onSubmit: (data: ProductFormData) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
};

function combinationKey(attributes: ProductVariantAttribute[]) {
    return attributes
        .slice()
        .sort((left, right) => left.attributeId.localeCompare(right.attributeId))
        .map((attribute) => `${attribute.attributeId}:${attribute.attributeValueId}`)
        .join('|');
}

function skuPart(value: string) {
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '');
    return normalized.slice(0, 2).toUpperCase();
}

function buildSku(productName: string, attributes: ProductVariantAttribute[], attributeValues: ProductAttributeValue[]) {
    const parts = [skuPart(productName), ...attributes.map((attribute) => {
        const value = attributeValues.find((item) => item.id === attribute.attributeValueId);
        return skuPart(value?.name ?? '');
    }).filter(Boolean)];
    return `SKU-${parts.join('-')}`;
}

function uniqueSku(baseSku: string, usedSkus: Set<string>) {
    let candidate = baseSku;
    let suffix = 2;
    while (usedSkus.has(candidate)) {
        candidate = `${baseSku}-${suffix}`;
        suffix += 1;
    }
    usedSkus.add(candidate);
    return candidate;
}

function isManualPlaceholder(variant: DraftVariant) {
    return variant.id === 'variant-new' && variant.attributes.length === 0;
}

function generateCombinations(
    selectedValues: Record<string, string[]>,
    currentVariants: DraftVariant[],
    productName: string,
    attributeValues: ProductAttributeValue[],
    basePrice: string,
    existingProducts: Product[],
    currentProductId?: string,
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

    const usedSkus = new Set(
        existingProducts
            .filter((product) => product.id !== currentProductId)
            .flatMap((product) =>
                product.variants.map((variant) =>
                    variant.sku.toUpperCase(),
                ),
            ),
    );

    for (const variant of currentVariants) {
        if (variant.sku.trim()) {
            usedSkus.add(variant.sku.trim().toUpperCase());
        }
    }

    const result = [...currentVariants];

    for (let index = 0; index < combinations.length; index++) {
        const attributes = combinations[index];
        const key = combinationKey(attributes);

        const existing = currentByKey.get(key);

        if (existing) {
            continue;
        }

        const generatedSku = uniqueSku(
            buildSku(
                productName,
                attributes,
                attributeValues,
            ),
            usedSkus,
        );

        result.push({
            id: `variant-${Date.now()}-${index}`,
            sku: generatedSku,
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
    attributes: propsAttributes,
    attributeValues: propsAttributeValues,
    branches,
    existingProducts,
    currentProductId,
    onSubmit,
    onCancel,
    isSubmitting = false,
    submitLabel = 'Guardar Producto',
}: ProductFormProps) {
    const storeAttributes = useProductAttributeStore((state) => state.attributes);
    const storeAttributeValues = useProductAttributeStore((state) => state.attributeValues);
    const fetchAttributes = useProductAttributeStore((state) => state.fetchAttributes);
    const token = useAuthStore((state) => state.token);
    const attributes = propsAttributes ?? storeAttributes;
    const attributeValues = propsAttributeValues ?? storeAttributeValues;

    useEffect(() => {
        if (token && storeAttributes.length === 0) {
            void fetchAttributes(token);
        }
    }, [fetchAttributes, storeAttributes.length, token]);

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
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [isCreateAttrModalVisible, setIsCreateAttrModalVisible] = useState(false);
    const [createValueAttrId, setCreateValueAttrId] = useState<string | null>(null);

    const activeBranch = useBranchStore((state) => state.activeBranch);
    const selectedCategory = categories.find((category) => category.id === categoryId);

    function updateName(value: string) {
        setName(value);
        setVariants((current) => current.map((variant) => variant.sku === '' || variant.sku === buildSku(name, variant.attributes, attributeValues)
            ? { ...variant, sku: buildSku(value, variant.attributes, attributeValues) }
            : variant));
    }

    function updateVariant(index: number, field: 'sku' | 'price', value: string) {
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
        setVariants(generateCombinations(selectedValues, variants, name, attributeValues, basePrice, existingProducts, currentProductId));
        setVariantMode(true);
        setErrors((current) => ({ ...current, variants: '' }));
    }

    function validate() {
        const nextErrors: Record<string, string> = {};
        if (!name.trim()) nextErrors.name = 'El nombre del producto es obligatorio';
        if (!categoryId) nextErrors.categoryId = 'Debes seleccionar una categoría';
        if (!variants.length) nextErrors.variants = 'Debes agregar al menos una variante';

        const skuSet = new Set<string>();
        const existingSkus = new Set(existingProducts.filter((product) => product.id !== currentProductId).flatMap((product) => product.variants.map((variant) => variant.sku.toUpperCase())));
        variants.forEach((variant) => {
            const sku = variant.sku.trim().toUpperCase();
            const normalizedPrice = variant.price.trim().replace(',', '.');
            const price = Number(normalizedPrice);
            if (!sku) nextErrors.variants = 'Todas las variantes deben tener SKU';
            if (sku && (skuSet.has(sku) || existingSkus.has(sku))) nextErrors.variants = 'Los SKU deben ser únicos dentro de la empresa';
            if (!variant.price.trim() || !/^\d+(\.\d+)?$/.test(normalizedPrice) || !Number.isFinite(price) || price < 0) nextErrors.variants = 'Todas las variantes deben tener un precio válido';
            Object.values(variant.stockByBranch).forEach((stock) => {
                if (!Number.isInteger(stock) || stock < 0) nextErrors.variants = 'El stock debe ser un número entero no negativo';
            });
            const attributeIds = variant.attributes.map((attribute) => attribute.attributeId);
            if (!variant.attributes.length) nextErrors.variants = 'Cada variante debe tener al menos un valor de atributo';
            if (new Set(attributeIds).size !== attributeIds.length) nextErrors.variants = 'Una variante no puede tener dos valores del mismo atributo';
            variant.attributes.forEach((attribute) => {
                const value = attributeValues.find((item) => item.id === attribute.attributeValueId);
                if (!value || value.attributeId !== attribute.attributeId) nextErrors.variants = 'Hay valores de atributos inválidos';
                if (!Number.isInteger(Number(attribute.attributeValueId))) {
                    nextErrors.variants = 'Los valores de atributos deben provenir del backend';
                }
            });
            if (sku) skuSet.add(sku);
        });

        const keys = variants.map((variant) => combinationKey(variant.attributes));
        if (new Set(keys).size !== keys.length) nextErrors.variants = 'No puede haber combinaciones duplicadas';
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
            variants: variants.map((variant) => ({ ...variant, sku: variant.sku.trim().toUpperCase(), price: variant.price.trim() })),
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
                    onChangeText={updateName}
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
                    <Text style={[styles.selectButtonText, !selectedCategory && styles.placeholderText]}>{selectedCategory ? selectedCategory.name : 'Seleccionar categoría'}</Text>
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
                        if (value) {
                            setVariants((current) => current.filter((variant) => !isManualPlaceholder(variant)));
                        } else {
                            setSelectedValues({});
                            setVariants((current) => [{
                                ...(current.find((variant) => isManualPlaceholder(variant)) ?? {
                                    id: 'variant-new',
                                    sku: '',
                                    price: basePrice,
                                    stockByBranch: {},
                                }),
                                attributes: [],
                            }]);
                        }
                    }}
                    disabled={isSubmitting}
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

                    <Pressable
                        style={styles.secondaryButton}
                        onPress={handleGenerate}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.secondaryButtonText}>Generar variantes</Text>
                    </Pressable>
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
                    editable={!isSubmitting}
                />
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
                                    SKU *
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
                                    placeholder="Ej. SKU-PA-RO-44"
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
                                    editable={!isSubmitting}
                                />
                            </View>
                        </View>

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
                categories={categories}
                selectedCategoryId={categoryId}
                onSelect={(id) => {
                    setCategoryId(id);

                    setErrors((current) => ({
                        ...current,
                        categoryId: '',
                    }));
                }}
                onClose={() => setCategoryModalVisible(false)}
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
    formGroup: { marginBottom: Spacing.lg }, row: { flexDirection: 'row', gap: Spacing.md }, flex1: { flex: 1 }, required: { color: Colors.error }, smallLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 }, sectionTitle: { marginBottom: Spacing.sm }, input: { height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: Spacing.md, fontSize: 15, backgroundColor: Colors.surface, color: Colors.text }, inputError: { borderColor: Colors.error, backgroundColor: Colors.errorInput }, errorText: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '500' }, textArea: { height: 85, paddingTop: Spacing.md }, selectButton: { height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectButtonText: { fontSize: 15, color: Colors.text }, placeholderText: { color: Colors.textSecondary }, modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl }, switchLabelContainer: { flex: 1, marginRight: Spacing.md }, switchTitle: { fontSize: 15, fontWeight: '600', color: Colors.text }, switchSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 }, attributeGroup: { marginBottom: Spacing.md }, attributeTitle: { fontSize: 14, fontWeight: '600', color: Colors.text }, chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }, chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surface }, chipSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary }, chipText: { color: Colors.textSecondary, fontSize: 13 }, chipTextSelected: { color: Colors.primary, fontWeight: '600' }, secondaryButton: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm }, secondaryButtonText: { color: Colors.primary, fontWeight: '600' }, variantCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.md, marginBottom: Spacing.sm }, variantTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm }, removeText: { color: Colors.error, fontSize: 12, fontWeight: '600', marginTop: Spacing.sm }, actionsContainer: { gap: Spacing.sm, marginTop: Spacing.sm }, submitButtonDisabled: { opacity: 0.7 }, submittingContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
