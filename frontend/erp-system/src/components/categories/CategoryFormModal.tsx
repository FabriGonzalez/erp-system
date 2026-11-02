import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FilterChip } from '@/components/ui/FilterChip';
import { FormField } from '@/components/ui/FormField';
import { ModalCard } from '@/components/ui/ModalCard';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAttributes } from '@/hooks/use-attribute-queries';
import { useSaveCategory } from '@/hooks/use-category-queries';
import { Category } from '@/types/category';

type CategoryFormModalProps = {
    visible: boolean;
    categoryToEdit?: Category | null;
    onClose: () => void;
    // Para usarlo dentro de otro flujo (p. ej. elegir la categoría recién creada en un producto).
    onSaved?: (category: Category) => void;
};

export function CategoryFormModal({
    visible,
    categoryToEdit,
    onClose,
    onSaved,
}: CategoryFormModalProps) {
    const saveCategory = useSaveCategory();
    const { attributes } = useAttributes();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [attributeIds, setAttributeIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isEdit = Boolean(categoryToEdit);
    // Un atributo desactivado sigue a la vista si ya estaba asignado, para poder quitarlo.
    const selectableAttributes = attributes.filter(
        (attribute) => attribute.active || attributeIds.includes(attribute.id),
    );

    function toggleAttribute(attributeId: string) {
        setAttributeIds((current) => current.includes(attributeId)
            ? current.filter((id) => id !== attributeId)
            : [...current, attributeId]);
    }

    useEffect(() => {
        if (visible) {
            const frame = requestAnimationFrame(() => {
                setName(categoryToEdit?.name ?? '');
                setDescription(categoryToEdit?.description ?? '');
                setAttributeIds(categoryToEdit?.attributeIds ?? []);
                setErrorMessage(null);
            });

            return () => cancelAnimationFrame(frame);
        }
    }, [visible, categoryToEdit]);

    async function handleSubmit() {
        const trimmedName = name.trim();
        const trimmedDescription = description.trim();

        if (!trimmedName) {
            setErrorMessage('El nombre de la categoría es obligatorio.');
            return;
        }

        if (trimmedName.length > 100) {
            setErrorMessage('El nombre no puede superar los 100 caracteres.');
            return;
        }

        if (trimmedDescription.length > 500) {
            setErrorMessage('La descripción no puede superar los 500 caracteres.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const data = {
                name: trimmedName,
                description: trimmedDescription || null,
                attributeIds,
            };

            const saved = await saveCategory.mutateAsync({
                id: isEdit ? categoryToEdit?.id : undefined,
                data,
            });
            onSaved?.(saved);
            onClose();
        } catch (error: unknown) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error al guardar la categoría.'
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ModalCard
            visible={visible}
            title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
            onClose={onClose}
            closeDisabled={isSubmitting}
            error={errorMessage}
            footer={[
                <AppButton key="cancel" title="Cancelar" variant="secondary" onPress={onClose} disabled={isSubmitting} />,
                <AppButton
                    key="save"
                    title={isSubmitting ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                />,
            ]}
        >
            <FormField label="Nombre *" hint={`${name.length}/100`}>
                <AppInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ej: Bebidas"
                    maxLength={100}
                    autoCapitalize="words"
                    editable={!isSubmitting}
                />
            </FormField>

            <FormField label="Descripción" hint={`${description.length}/500`}>
                <AppInput
                    style={styles.descriptionInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Descripción de la categoría"
                    maxLength={500}
                    multiline
                    textAlignVertical="top"
                    editable={!isSubmitting}
                />
            </FormField>

            <FormField label="Atributos" hint="Los que pueden usar las variantes de sus productos (p. ej. talle y color)">
                {selectableAttributes.length === 0 ? (
                    <Text style={styles.empty}>Todavía no hay atributos. Crealos en Más → Atributos de productos.</Text>
                ) : (
                    <View style={styles.chips}>
                        {selectableAttributes.map((attribute) => (
                            <FilterChip
                                key={attribute.id}
                                label={attribute.active ? attribute.name : `${attribute.name} (inactivo)`}
                                selected={attributeIds.includes(attribute.id)}
                                onPress={() => !isSubmitting && toggleAttribute(attribute.id)}
                            />
                        ))}
                    </View>
                )}
            </FormField>
        </ModalCard>
    );
}

const styles = StyleSheet.create({
    descriptionInput: {
        height: 96,
        paddingTop: Spacing.md,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    empty: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
