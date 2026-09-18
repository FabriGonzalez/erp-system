import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useProductAttributeStore } from '@/stores/product-attribute-store';
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

    const { addAttributeValue, updateAttributeValue, getAttributeValueById } = useProductAttributeStore();

    useEffect(() => {
        if (visible) {
            setName(initialName);
            setError(null);
        }
    }, [visible, initialName]);

    const isEditing = Boolean(valueId);

    function handleSubmit() {
        setError(null);
        try {
            if (isEditing && valueId) {
                updateAttributeValue(valueId, name);
                const updated = getAttributeValueById(valueId);
                if (updated && onSuccess) {
                    onSuccess(updated);
                }
            } else {
                const created = addAttributeValue(attributeId, name);
                if (onSuccess) {
                    onSuccess(created);
                }
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al guardar el valor.');
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
                        <View>
                            <Text style={styles.title}>
                                {isEditing ? 'Editar Valor' : 'Nuevo Valor'}
                            </Text>
                            {attributeName ? (
                                <Text style={styles.subtitle}>
                                    Atributo: {attributeName}
                                </Text>
                            ) : null}
                        </View>

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
                            Nombre del valor <Text style={styles.required}>*</Text>
                        </Text>
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

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <View style={styles.actionsRow}>
                            <Pressable style={styles.cancelButton} onPress={onClose}>
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>
                            <AppButton
                                title={isEditing ? 'Guardar' : 'Crear Valor'}
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
    subtitle: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: 2,
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
