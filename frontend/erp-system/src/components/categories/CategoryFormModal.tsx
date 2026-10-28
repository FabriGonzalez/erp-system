import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { ModalCard } from '@/components/ui/ModalCard';
import { Spacing } from '@/constants/spacing';
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
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isEdit = Boolean(categoryToEdit);

    useEffect(() => {
        if (visible) {
            const frame = requestAnimationFrame(() => {
                setName(categoryToEdit?.name ?? '');
                setDescription(categoryToEdit?.description ?? '');
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
        </ModalCard>
    );
}

const styles = StyleSheet.create({
    descriptionInput: {
        height: 96,
        paddingTop: Spacing.md,
    },
});
