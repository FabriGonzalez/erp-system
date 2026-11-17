import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ColorSwatchEditor } from '@/components/attributes/ColorSwatchEditor';
import { ColorSwatchPreview } from '@/components/attributes/ColorSwatchPreview';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { ModalCard } from '@/components/ui/ModalCard';
import { Colors } from '@/constants/colors';
import { useSaveAttributeValue } from '@/hooks/use-attribute-queries';
import { ProductAttributeValue } from '@/types/product';
import { ColorSwatch } from '@/types/product-attribute';
import { SharedStyles } from '@/styles/shared';

type ProductAttributeValueFormModalProps = {
    visible: boolean;
    attributeId: string;
    attributeName?: string;
    valueId?: string;
    initialName?: string;
    initialSwatch?: ColorSwatch | null;
    onClose: () => void;
    onSuccess?: (value: ProductAttributeValue) => void;
};

export function ProductAttributeValueFormModal({
    visible,
    attributeId,
    attributeName,
    valueId,
    initialName = '',
    initialSwatch = null,
    onClose,
    onSuccess,
}: ProductAttributeValueFormModalProps) {
    const [name, setName] = useState(initialName);
    // Colores de la muestra; vacío es "sin muestra".
    const [swatchColors, setSwatchColors] = useState<string[]>(initialSwatch?.colors ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const saveAttributeValue = useSaveAttributeValue();

    useEffect(() => {
        if (visible) {
            // Reset form state when opening a different value.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(initialName);
            setSwatchColors(initialSwatch?.colors ?? []);
            setError(null);
        }
    }, [visible, initialName, initialSwatch]);

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
                // La muestra va siempre: si falta, el backend la borra.
                data: { value: name, swatch: swatchColors.length > 0 ? { colors: swatchColors } : null },
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

            {swatchColors.length > 0 ? (
                <FormField label="Muestra de color" hint="La tienda la muestra en lugar del nombre.">
                    <View style={styles.swatchHeader}>
                        <ColorSwatchPreview colors={swatchColors} size={32} />
                        <Pressable
                            onPress={() => setSwatchColors([])}
                            disabled={isSubmitting}
                            accessibilityRole="button"
                            hitSlop={8}
                            style={({ pressed }) => pressed && SharedStyles.pressed}
                        >
                            <Text style={styles.removeSwatch}>Quitar muestra</Text>
                        </Pressable>
                    </View>
                    <ColorSwatchEditor colors={swatchColors} onChange={setSwatchColors} />
                </FormField>
            ) : (
                <Pressable
                    onPress={() => setSwatchColors(['#000000'])}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={({ pressed }) => [styles.addSwatch, pressed && SharedStyles.pressed]}
                >
                    <Text style={styles.addSwatchText}>+ Agregar muestra de color</Text>
                </Pressable>
            )}
        </ModalCard>
    );
}

const styles = StyleSheet.create({
    inputError: {
        borderColor: Colors.error,
        backgroundColor: Colors.errorInput,
    },
    swatchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    removeSwatch: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.error,
    },
    addSwatch: {
        alignSelf: 'flex-start',
    },
    addSwatchText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
});
