import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { ModalCard } from '@/components/ui/ModalCard';
import { Colors } from '@/constants/colors';
import { useSaveAttributeValue } from '@/hooks/use-attribute-queries';
import { ProductAttributeValue } from '@/types/product';

type ProductAttributeValueFormModalProps = {
    visible: boolean;
    attributeId: string;
    attributeName?: string;
    valueId?: string;
    initialName?: string;
    onClose: () => void;
    onSuccess?: (value: ProductAttributeValue) => void;
};

export function ProductAttributeValueFormModal({
    visible,
    attributeId,
    attributeName,
    valueId,
    initialName = '',
    onClose,
    onSuccess,
}: ProductAttributeValueFormModalProps) {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const saveAttributeValue = useSaveAttributeValue();

    useEffect(() => {
        if (visible) {
            // Reset form state when opening a different value.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(initialName);
            setError(null);
        }
    }, [visible, initialName]);

    const isEditing = Boolean(valueId);

    async function handleSubmit() {
        setError(null);
        if (!name.trim()) {
            setError('El nombre del valor es obligatorio.');
            return;
        }
        setIsSubmitting(true);
        try {
            const saved = await saveAttributeValue.mutateAsync({
                attributeId,
                id: isEditing ? valueId : undefined,
                data: { value: name },
            });
            onSuccess?.(saved);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar el valor.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ModalCard
            visible={visible}
            title={isEditing ? 'Editar valor' : 'Nuevo valor'}
            subtitle={attributeName ? `Atributo: ${attributeName}` : undefined}
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
            <FormField label="Nombre del valor *" error={error}>
                <AppInput
                    value={name}
                    onChangeText={(text) => {
                        setName(text);
                        setError(null);
                    }}
                    placeholder="Ej. Azul, M, Gabardina"
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
