import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useCategoryStore } from '@/stores/category-store';
import { Category } from '@/types/category';

type CategoryFormModalProps = {
    visible: boolean;
    categoryToEdit?: Category | null;
    onClose: () => void;
};

export function CategoryFormModal({
    visible,
    categoryToEdit,
    onClose,
}: CategoryFormModalProps) {
    const token = useAuthStore((state) => state.token);
    const { createCategory, updateCategory } = useCategoryStore();
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

        if (!token) {
            setErrorMessage('No hay sesión activa.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const data = {
                name: trimmedName,
                description: trimmedDescription || null,
            };

            if (isEdit && categoryToEdit) {
                await updateCategory(categoryToEdit.id, data, token);
            } else {
                await createCategory(data, token);
            }
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
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                        {isEdit ? 'Editar categoría' : 'Nueva categoría'}
                    </Text>

                    {errorMessage ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    <View style={styles.formGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>
                                Nombre <Text style={styles.required}>*</Text>
                            </Text>
                            <Text style={styles.counter}>{name.length}/100</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej: Bebidas"
                            placeholderTextColor={Colors.textSecondary}
                            maxLength={100}
                            autoCapitalize="words"
                            editable={!isSubmitting}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Descripción</Text>
                            <Text style={styles.counter}>{description.length}/500</Text>
                        </View>
                        <TextInput
                            style={[styles.input, styles.descriptionInput]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Descripción de la categoría"
                            placeholderTextColor={Colors.textSecondary}
                            maxLength={500}
                            multiline
                            textAlignVertical="top"
                            editable={!isSubmitting}
                        />
                    </View>

                    <View style={styles.actions}>
                        <Pressable
                            onPress={onClose}
                            style={styles.cancelButton}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </Pressable>
                        <AppButton
                            title={isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            style={styles.submitButton}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 420,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    errorContainer: {
        backgroundColor: Colors.errorLight,
        padding: Spacing.sm,
        borderRadius: 8,
        marginBottom: Spacing.md,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
    formGroup: {
        marginBottom: Spacing.md,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    required: {
        color: Colors.error,
    },
    counter: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: 15,
        color: Colors.text,
        backgroundColor: Colors.background,
    },
    descriptionInput: {
        minHeight: 88,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.lg,
    },
    cancelButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    submitButton: {
        minWidth: 140,
    },
});
