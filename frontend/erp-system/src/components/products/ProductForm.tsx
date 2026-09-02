import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Category, ProductFormData } from '@/types/product';
import { AppButton } from '@/components/ui/AppButton';

type ProductFormProps = {
    initialValues?: Partial<ProductFormData>;
    categories: Category[];
    onSubmit: (data: ProductFormData) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
};

export function ProductForm({
    initialValues,
    categories,
    onSubmit,
    onCancel,
    isSubmitting = false,
    submitLabel = 'Guardar Producto',
}: ProductFormProps) {
    const [name, setName] = useState(initialValues?.name ?? '');
    const [sku, setSku] = useState(initialValues?.sku ?? '');
    const [price, setPrice] = useState(initialValues?.price ?? '');
    const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? '');
    const [description, setDescription] = useState(initialValues?.description ?? '');
    const [active, setActive] = useState(initialValues?.active ?? true);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);

    const selectedCategory = categories.find((c) => c.id === categoryId);

    function validate(): boolean {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'El nombre del producto es obligatorio';
        }

        if (!sku.trim()) {
            newErrors.sku = 'El código SKU es obligatorio';
        }

        if (!price.trim()) {
            newErrors.price = 'El precio es obligatorio';
        } else {
            const num = parseFloat(price.replace(',', '.'));
            if (isNaN(num) || num <= 0) {
                newErrors.price = 'Ingresa un precio mayor a 0';
            }
        }

        if (!categoryId) {
            newErrors.categoryId = 'Debes seleccionar una categoría';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function handleSubmit() {
        if (!validate()) return;

        onSubmit({
            name: name.trim(),
            sku: sku.trim().toUpperCase(),
            price: price.trim(),
            categoryId,
            description: description.trim(),
            active,
        });
    }

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
        >
            {/* Nombre */}
            <View style={styles.formGroup}>
                <Text style={styles.label}>
                    Nombre del producto <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    placeholder="Ej. Coca Cola 1.5L"
                    placeholderTextColor={Colors.textSecondary}
                    value={name}
                    onChangeText={(text) => {
                        setName(text);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    editable={!isSubmitting}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* SKU y Precio en dos columnas */}
            <View style={styles.row}>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.label}>
                        SKU <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, errors.sku && styles.inputError]}
                        placeholder="Ej. BEB-001"
                        placeholderTextColor={Colors.textSecondary}
                        value={sku}
                        onChangeText={(text) => {
                            setSku(text);
                            if (errors.sku) setErrors((prev) => ({ ...prev, sku: '' }));
                        }}
                        autoCapitalize="characters"
                        editable={!isSubmitting}
                    />
                    {errors.sku ? <Text style={styles.errorText}>{errors.sku}</Text> : null}
                </View>

                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.label}>
                        Precio ($) <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, errors.price && styles.inputError]}
                        placeholder="0.00"
                        placeholderTextColor={Colors.textSecondary}
                        value={price}
                        onChangeText={(text) => {
                            setPrice(text);
                            if (errors.price) setErrors((prev) => ({ ...prev, price: '' }));
                        }}
                        keyboardType="decimal-pad"
                        editable={!isSubmitting}
                    />
                    {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
                </View>
            </View>

            {/* Categoría */}
            <View style={styles.formGroup}>
                <Text style={styles.label}>
                    Categoría <Text style={styles.required}>*</Text>
                </Text>
                <Pressable
                    style={[styles.selectButton, errors.categoryId && styles.inputError]}
                    onPress={() => !isSubmitting && setCategoryModalVisible(true)}
                >
                    <Text
                        style={[
                            styles.selectButtonText,
                            !selectedCategory && styles.placeholderText,
                        ]}
                    >
                        {selectedCategory ? selectedCategory.name : 'Seleccionar categoría'}
                    </Text>
                    <SymbolView
                        name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' }}
                        size={20}
                        tintColor={Colors.textSecondary}
                    />
                </Pressable>
                {errors.categoryId ? (
                    <Text style={styles.errorText}>{errors.categoryId}</Text>
                ) : null}
            </View>

            {/* Descripción */}
            <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción (Opcional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Detalles sobre presentación, ingredientes o especificaciones..."
                    placeholderTextColor={Colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                />
            </View>

            {/* Estado Activo / Inactivo */}
            <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                    <Text style={styles.switchTitle}>Estado del Producto</Text>
                    <Text style={styles.switchSubtitle}>
                        {active
                            ? 'El producto estará visible y disponible para operaciones'
                            : 'El producto estará desactivado para nuevos pedidos'}
                    </Text>
                </View>
                <Switch
                    value={active}
                    onValueChange={setActive}
                    trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                    thumbColor="#FFFFFF"
                    disabled={isSubmitting}
                />
            </View>

            {/* Acciones */}
            <View style={styles.actionsContainer}>
                <Pressable
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <View style={styles.submittingContent}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.submitButtonText}>Guardando...</Text>
                        </View>
                    ) : (
                        <Text style={styles.submitButtonText}>{submitLabel}</Text>
                    )}
                </Pressable>

                <Pressable
                    style={styles.cancelButton}
                    onPress={onCancel}
                    disabled={isSubmitting}
                >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
            </View>

            {/* Modal Selector de Categorías */}
            <Modal
                visible={categoryModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setCategoryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
                            <Pressable
                                onPress={() => setCategoryModalVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <SymbolView
                                    name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                                    size={24}
                                    tintColor={Colors.textSecondary}
                                />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalList}>
                            {categories.map((cat) => {
                                const isSelected = cat.id === categoryId;
                                return (
                                    <Pressable
                                        key={cat.id}
                                        style={[
                                            styles.categoryItem,
                                            isSelected && styles.categoryItemSelected,
                                        ]}
                                        onPress={() => {
                                            setCategoryId(cat.id);
                                            if (errors.categoryId) {
                                                setErrors((prev) => ({ ...prev, categoryId: '' }));
                                            }
                                            setCategoryModalVisible(false);
                                        }}
                                    >
                                        <View style={styles.categoryItemInfo}>
                                            <Text
                                                style={[
                                                    styles.categoryItemName,
                                                    isSelected && styles.categoryItemNameSelected,
                                                ]}
                                            >
                                                {cat.name}
                                            </Text>
                                            {cat.description ? (
                                                <Text style={styles.categoryItemDesc}>
                                                    {cat.description}
                                                </Text>
                                            ) : null}
                                        </View>

                                        {isSelected && (
                                            <SymbolView
                                                name={{
                                                    ios: 'checkmark.circle.fill',
                                                    android: 'check_circle',
                                                    web: 'check_circle',
                                                }}
                                                size={20}
                                                tintColor={Colors.primary}
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    formGroup: {
        marginBottom: Spacing.lg,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    flex1: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs + 2,
    },
    required: {
        color: Colors.error,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: Spacing.md,
        fontSize: 15,
        backgroundColor: Colors.surface,
        color: Colors.text,
    },
    inputError: {
        borderColor: Colors.error,
        backgroundColor: '#FFF5F5',
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 4,
        fontWeight: '500',
    },
    textArea: {
        height: 85,
        paddingTop: Spacing.md,
    },
    selectButton: {
        height: 48,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectButtonText: {
        fontSize: 15,
        color: Colors.text,
    },
    placeholderText: {
        color: Colors.textSecondary,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.xl,
    },
    switchLabelContainer: {
        flex: 1,
        marginRight: Spacing.md,
    },
    switchTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    switchSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    actionsContainer: {
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
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
    cancelButton: {
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    cancelButtonText: {
        color: Colors.textSecondary,
        fontSize: 15,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
        paddingBottom: Spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalList: {
        padding: Spacing.md,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        marginBottom: Spacing.xs,
    },
    categoryItemSelected: {
        backgroundColor: '#EFF6FF',
    },
    categoryItemInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    categoryItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    categoryItemNameSelected: {
        color: Colors.primary,
    },
    categoryItemDesc: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});
