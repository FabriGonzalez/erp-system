import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useProductAttributeStore } from '@/stores/product-attribute-store';
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

    const { addAttribute, updateAttribute, getAttributeById } = useProductAttributeStore();

    useEffect(() => {
        if (visible) {
            setName(initialName);
            setError(null);
        }
    }, [visible, initialName]);

    const isEditing = Boolean(attributeId);

    function handleSubmit() {
        setError(null);
        try {
            if (isEditing && attributeId) {
                updateAttribute(attributeId, name);
                const updated = getAttributeById(attributeId);
                if (updated && onSuccess) {
                    onSuccess(updated);
                }
            } else {
                const created = addAttribute(name);
                if (onSuccess) {
                    onSuccess(created);
                }
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al guardar el atributo.');
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {isEditing ? 'Editar Atributo' : 'Nuevo Atributo'}
                        </Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <SymbolView
                                name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                                size={22}
                                tintColor={Colors.textSecondary}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.label}>
                            Nombre del atributo <Text style={styles.required}>*</Text>
                        </Text>
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

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <View style={styles.actionsRow}>
                            <Pressable style={styles.cancelButton} onPress={onClose}>
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>
                            <AppButton
                                title={isEditing ? 'Guardar' : 'Crear Atributo'}
                                onPress={handleSubmit}
                                style={styles.submitButton}
                            />
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    content: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        width: '100%',
        maxWidth: 440,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    closeButton: {
        padding: 4,
    },
    body: {
        padding: Spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    required: {
        color: Colors.error,
    },
    inputError: {
        borderColor: Colors.error,
        backgroundColor: Colors.errorInput,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 6,
        fontWeight: '500',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xl,
    },
    cancelButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: 10,
    },
    cancelButtonText: {
        fontSize: 15,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    submitButton: {
        flex: 1,
    },
});
