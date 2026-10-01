import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { Branch } from '@/types/branch';

type BranchFormModalProps = {
    visible: boolean;
    branchToEdit?: Branch | null;
    onClose: () => void;
};

export function BranchFormModal({
    visible,
    branchToEdit,
    onClose,
}: BranchFormModalProps) {
    const token = useAuthStore((state) => state.token);
    const { createBranch, updateBranch } = useBranchStore();

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isEdit = !!branchToEdit;

    useEffect(() => {
        if (visible) {
            setName(branchToEdit?.name ?? '');
            setAddress(branchToEdit?.address ?? '');
            setPhone(branchToEdit?.phone ?? '');
            setErrorMessage(null);
        }
    }, [visible, branchToEdit]);

    async function handleSubmit() {
        if (!name.trim()) {
            setErrorMessage('El nombre de la sucursal es obligatorio.');
            return;
        }

        if (!token) {
            setErrorMessage('No hay sesión activa.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            if (isEdit && branchToEdit) {
                await updateBranch(
                    branchToEdit.id,
                    {
                        name: name.trim(),
                        address: address.trim() || undefined,
                        phone: phone.trim() || undefined,
                    },
                    token
                );
            } else {
                await createBranch(
                    {
                        name: name.trim(),
                        address: address.trim() || undefined,
                        phone: phone.trim() || undefined,
                    },
                    token
                );
            }

            onClose();
        } catch (err: any) {
            setErrorMessage(err?.message || 'Error al guardar la sucursal.');
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
                        {isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
                    </Text>

                    {errorMessage ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Nombre <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej: Sucursal Centro"
                            placeholderTextColor={Colors.textSecondary}
                            autoCapitalize="words"
                            editable={!isSubmitting}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Dirección</Text>
                        <TextInput
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Ej: Av. San Martín 1234"
                            placeholderTextColor={Colors.textSecondary}
                            editable={!isSubmitting}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Teléfono</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Ej: 11 4455-6677"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="phone-pad"
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
                            title={isSubmitting ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear sucursal')}
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    errorContainer: {
        backgroundColor: '#fee2e2',
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
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    required: {
        color: Colors.error,
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
        minWidth: 130,
    },
});
