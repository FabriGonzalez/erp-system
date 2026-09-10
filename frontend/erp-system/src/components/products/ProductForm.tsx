import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Branch } from '@/types/branch';
import {
    Category,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductFormData,
    ProductVariantAttribute,
} from '@/types/product';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { CategoryModal } from './CategoryModal';

type DraftVariant = ProductFormData['variants'][number];

type ProductFormProps = {
    initialValues?: Partial<ProductFormData>;
    categories: Category[];
    attributes: ProductAttribute[];
    attributeValues: ProductAttributeValue[];
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

function generateCombinations(
    selectedValues: Record<string, string[]>,
    currentVariants: DraftVariant[],
    productName: string,
    attributeValues: ProductAttributeValue[],
    basePrice: string,
    existingProducts: Product[],
    currentProductId?: string,
): DraftVariant[] {
    const groups = Object.entries(selectedValues).filter(([, values]) => values.length > 0);
    if (!groups.length) return currentVariants;

    const combinations = groups.reduce<ProductVariantAttribute[][]>(
        (result, [attributeId, valueIds]) => result.flatMap((partial) =>
            valueIds.map((attributeValueId) => [...partial, { attributeId, attributeValueId }])
        ),
        [[]],
    );

    const currentByKey = new Map(currentVariants.map((variant) => [combinationKey(variant.attributes), variant]));
    const usedSkus = new Set(existingProducts
        .filter((product) => product.id !== currentProductId)
        .flatMap((product) => product.variants.map((variant) => variant.sku.toUpperCase())));
    currentVariants.forEach((variant) => {
        if (variant.sku.trim()) usedSkus.add(variant.sku.trim().toUpperCase());
    });

    return combinations.map((attributes, index) => {
        const existing = currentByKey.get(combinationKey(attributes));
        if (existing) return existing;
        const generatedSku = uniqueSku(buildSku(productName, attributes, attributeValues), usedSkus);
        return {
            id: `variant-${Date.now()}-${index}`,
            sku: generatedSku,
            price: basePrice,
            attributes,
            stockByBranch: {},
        };
    });
}

export function ProductForm({
    initialValues,
    categories,
    attributes,
    attributeValues,
    branches,
    existingProducts,
    currentProductId,
    onSubmit,
    onCancel,
    isSubmitting = false,
    submitLabel = 'Guardar Producto',
}: ProductFormProps) {
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
            if (!variant.price.trim() || !/^\d+(\.\d+)?$/.test(normalizedPrice) || !Number.isFinite(price) || price <= 0) nextErrors.variants = 'Todas las variantes deben tener un precio válido';
            Object.values(variant.stockByBranch).forEach((stock) => {
                if (!Number.isInteger(stock) || stock < 0) nextErrors.variants = 'El stock debe ser un número entero no negativo';
            });
            const attributeIds = variant.attributes.map((attribute) => attribute.attributeId);
            if (new Set(attributeIds).size !== attributeIds.length) nextErrors.variants = 'Una variante no puede tener dos valores del mismo atributo';
            variant.attributes.forEach((attribute) => {
                const value = attributeValues.find((item) => item.id === attribute.attributeValueId);
                if (!value || value.attributeId !== attribute.attributeId) nextErrors.variants = 'Hay valores de atributos inválidos';
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre del producto <Text style={styles.required}>*</Text></Text>
                <TextInput style={[styles.input, errors.name && styles.inputError]} placeholder="Ej. Coca Cola 1.5L" placeholderTextColor={Colors.textSecondary} value={name} onChangeText={updateName} editable={!isSubmitting} />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Categoría <Text style={styles.required}>*</Text></Text>
                <Pressable style={[styles.selectButton, errors.categoryId && styles.inputError]} onPress={() => !isSubmitting && setCategoryModalVisible(true)}>
                    <Text style={[styles.selectButtonText, !selectedCategory && styles.placeholderText]}>{selectedCategory ? selectedCategory.name : 'Seleccionar categoría'}</Text>
                    <SymbolView name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' }} size={20} tintColor={Colors.textSecondary} />
                </Pressable>
                {errors.categoryId ? <Text style={styles.errorText}>{errors.categoryId}</Text> : null}
            </View>

            <View style={styles.modeRow}>
                <View style={styles.switchLabelContainer}><Text style={styles.switchTitle}>Producto con variantes</Text><Text style={styles.switchSubtitle}>Activá esta opción para combinar atributos como talle y color</Text></View>
                <Switch value={variantMode} onValueChange={(value) => { setVariantMode(value); if (!value) { setSelectedValues({}); setVariants((current) => [{ ...(current[0] ?? { id: 'variant-new', sku: '', price: basePrice, stockByBranch: {} }), attributes: [] }]); } }} disabled={isSubmitting} trackColor={{ false: '#CBD5E1', true: Colors.primary }} thumbColor={Colors.white} />
            </View>

            {variantMode && <View style={styles.formGroup}>
                <Text style={styles.sectionTitle}>Atributos</Text>
                {attributes.filter((attribute) => attribute.active).map((attribute) => (
                    <View key={attribute.id} style={styles.attributeGroup}>
                        <Text style={styles.attributeTitle}>{attribute.name}</Text>
                        <View style={styles.chipsRow}>{attributeValues.filter((value) => value.attributeId === attribute.id && value.active).map((value) => {
                            const selected = (selectedValues[attribute.id] ?? []).includes(value.id);
                            return <Pressable key={value.id} style={[styles.chip, selected && styles.chipSelected]} onPress={() => toggleValue(attribute.id, value.id)}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{value.name}</Text></Pressable>;
                        })}</View>
                    </View>
                ))}
                <Pressable style={styles.secondaryButton} onPress={handleGenerate} disabled={isSubmitting}><Text style={styles.secondaryButtonText}>Generar variantes</Text></Pressable>
            </View>}

            <View style={styles.formGroup}>
                <Text style={styles.label}>Precio base <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} value={basePrice} onChangeText={updateBasePrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textSecondary} editable={!isSubmitting} />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.sectionTitle}>{variantMode ? `Variantes (${variants.length})` : 'Datos del producto'}</Text>
                {variants.map((variant, index) => <View key={variant.id ?? index} style={styles.variantCard}>
                    {variantMode && <Text style={styles.variantTitle}>{variant.attributes.map((attribute) => attributeValues.find((value) => value.id === attribute.attributeValueId)?.name).filter(Boolean).join(' / ') || 'Variante manual'}</Text>}
                    <View style={styles.row}><View style={styles.flex1}><Text style={styles.smallLabel}>SKU *</Text><TextInput style={styles.input} value={variant.sku} onChangeText={(value) => updateVariant(index, 'sku', value)} autoCapitalize="characters" placeholder="Ej. SKU-PA-RO-44" placeholderTextColor={Colors.textSecondary} editable={!isSubmitting} /></View><View style={styles.flex1}><Text style={styles.smallLabel}>Precio *</Text><TextInput style={styles.input} value={variant.price} onChangeText={(value) => updateVariant(index, 'price', value)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textSecondary} editable={!isSubmitting} /></View></View>
                    <Text style={styles.smallLabel}>Stock por sucursal</Text>
                    {branches.map((branch) => <View key={branch.id} style={styles.stockRow}><Text style={styles.stockBranchName}>{branch.name}</Text><TextInput style={styles.stockInput} value={String(variant.stockByBranch[branch.id] ?? 0)} onChangeText={(value) => updateVariantStock(index, branch.id, value)} keyboardType="number-pad" editable={!isSubmitting} /></View>)}
                    {variantMode && <Pressable onPress={() => setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index))} disabled={isSubmitting}><Text style={styles.removeText}>Eliminar variante</Text></Pressable>}
                </View>)}
                {errors.variants ? <Text style={styles.errorText}>{errors.variants}</Text> : null}
            </View>

            <View style={styles.formGroup}><Text style={styles.label}>Descripción (Opcional)</Text><TextInput style={[styles.input, styles.textArea]} placeholder="Detalles sobre presentación, ingredientes o especificaciones..." placeholderTextColor={Colors.textSecondary} value={description} onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" editable={!isSubmitting} /></View>
            <View style={styles.switchRow}><View style={styles.switchLabelContainer}><Text style={styles.switchTitle}>Estado del Producto</Text><Text style={styles.switchSubtitle}>{active ? 'El producto estará visible y disponible para operaciones' : 'El producto estará desactivado para nuevos pedidos'}</Text></View><Switch value={active} onValueChange={setActive} trackColor={{ false: '#CBD5E1', true: Colors.primary }} thumbColor={Colors.white} disabled={isSubmitting} /></View>
            <View style={styles.actionsContainer}><Pressable style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>{isSubmitting ? <View style={styles.submittingContent}><ActivityIndicator size="small" color={Colors.white} /><Text style={styles.submitButtonText}>Guardando...</Text></View> : <Text style={styles.submitButtonText}>{submitLabel}</Text>}</Pressable><Pressable style={styles.cancelButton} onPress={onCancel} disabled={isSubmitting}><Text style={styles.cancelButtonText}>Cancelar</Text></Pressable></View>
            <CategoryModal visible={categoryModalVisible} categories={categories} selectedCategoryId={categoryId} onSelect={(id) => { setCategoryId(id); setErrors((current) => ({ ...current, categoryId: '' })); }} onClose={() => setCategoryModalVisible(false)} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
    stockBranchName: { flex: 1, fontSize: 13, color: Colors.text },
    stockInput: { width: 90, height: 40, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: Spacing.sm, fontSize: 14, backgroundColor: Colors.surface, color: Colors.text, textAlign: 'right' },
    scrollContainer: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 }, formGroup: { marginBottom: Spacing.lg }, row: { flexDirection: 'row', gap: Spacing.md }, flex1: { flex: 1 }, label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs + 2 }, required: { color: Colors.error }, smallLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 }, sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm }, input: { height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: Spacing.md, fontSize: 15, backgroundColor: Colors.surface, color: Colors.text }, inputError: { borderColor: Colors.error, backgroundColor: '#FFF5F5' }, errorText: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '500' }, textArea: { height: 85, paddingTop: Spacing.md }, selectButton: { height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectButtonText: { fontSize: 15, color: Colors.text }, placeholderText: { color: Colors.textSecondary }, modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl }, switchLabelContainer: { flex: 1, marginRight: Spacing.md }, switchTitle: { fontSize: 15, fontWeight: '600', color: Colors.text }, switchSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 }, attributeGroup: { marginBottom: Spacing.md }, attributeTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs }, chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }, chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surface }, chipSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary }, chipText: { color: Colors.textSecondary, fontSize: 13 }, chipTextSelected: { color: Colors.primary, fontWeight: '600' }, secondaryButton: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm }, secondaryButtonText: { color: Colors.primary, fontWeight: '600' }, variantCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.md, marginBottom: Spacing.sm }, variantTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm }, removeText: { color: Colors.error, fontSize: 12, fontWeight: '600', marginTop: Spacing.sm }, addButton: { paddingVertical: Spacing.sm }, addButtonText: { color: Colors.primary, fontWeight: '600' }, actionsContainer: { gap: Spacing.sm, marginTop: Spacing.sm }, submitButton: { backgroundColor: Colors.primary, height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, submitButtonDisabled: { opacity: 0.7 }, submittingContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, submitButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' }, cancelButton: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, cancelButtonText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
});
