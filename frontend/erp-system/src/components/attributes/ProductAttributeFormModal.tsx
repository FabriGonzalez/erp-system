import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { ModalCard } from '@/components/ui/ModalCard';
import { Colors } from '@/constants/colors';
import { useSaveAttribute } from '@/hooks/use-attribute-queries';
import { ProductAttribute } from '@/types/product';

type ProductAttributeFormModalProps = {
    visible: boolean;
    initialName?: string;
    attributeId?: string;
    onClose: () => void;
    onSuccess?: (attribute: ProductAttribute) => void;
};

export function ProductAttributeFormModal({
    visible,
    initialName = '',
    attributeId,
    onClose,
    onSuccess,
}: ProductAttributeFormModalProps) {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const saveAttribute = useSaveAttribute();

    useEffect(() => {
        if (visible) {
            // Reset form state when opening a different attribute.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(initialName);
            setError(null);
        }
    }, [visible, initialName]);

    const isEditing = Boolean(attributeId);

    async function handleSubmit() {
        setError(null);
        if (!name.trim()) {
            setError('El nombre del atributo es obligatorio.');
            return;
        }
        setIsSubmitting(true);
        try {
            const saved = await saveAttribute.mutateAsync({
                id: isEditing ? attributeId : undefined,
                data: { name },
            });
            onSuccess?.(saved);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar el atributo.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ModalCard
            visible={visible}
            title={isEditing ? 'Editar atributo' : 'Nuevo atributo'}
            onClose={onClose}
            closeDisabled={isSubmitting}
            footer={[
                <AppButton key="cancel" title="Cancelar" variant="secondary" onPress={onClose} disabled={isSubmitting} />,
                <AppButton
                    key="save"
                    title={isSubmitting ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                />,
            ]}
        >
            <FormField label="Nombre del atributo *" error={error}>
                <AppInput
                    value={name}
                    onChangeText={(text) => {
                        setName(text);
                        setError(null);
                    }}
                    placeholder="Ej. Color, Talle, Material"
                    autoFocus
                    onSubmitEditing={handleSubmit}
                    style={error ? styles.inputError : undefined}
                />
            </FormField>
        </ModalCard>
    );
}

const styles = StyleSheet.create({
    inputError: {
        borderColor: Colors.error,
        backgroundColor: Colors.errorInput,
    },
});
