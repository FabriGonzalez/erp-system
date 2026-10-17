import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/components/users/UserForm';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useResetUserPassword } from '@/hooks/use-user-queries';
import { CompanyUser } from '@/types/user';

type ResetPasswordModalProps = {
    user: CompanyUser;
    visible: boolean;
    onClose: () => void;
};

/** El administrador define la contraseña nueva de otro usuario. */
export function ResetPasswordModal({ user, visible, onClose }: ResetPasswordModalProps) {
    const resetPassword = useResetUserPassword(user.id);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);

    function close() {
        if (resetPassword.isPending) return;
        setPassword('');
        setConfirmation('');
        setError(null);
        setIsDone(false);
        onClose();
    }

    async function handleSubmit() {
        if (resetPassword.isPending) return;
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
            return;
        }
        if (password !== confirmation) {
            setError('La confirmación no coincide con la contraseña.');
            return;
        }

        setError(null);
        try {
            await resetPassword.mutateAsync(password);
            setIsDone(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
        }
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <Pressable style={styles.backdrop} onPress={close}>
                <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
                    <Text style={styles.title}>Cambiar contraseña</Text>

                    {isDone ? (
                        <>
                            <Text style={styles.text}>
                                Listo. {user.fullName} ya tiene la contraseña nueva y se cerraron sus
                                sesiones abiertas.
                            </Text>
                            <AppButton title="Cerrar" onPress={close} />
                        </>
                    ) : (
                        <>
                            <Text style={styles.text}>
                                Elegí la contraseña nueva de {user.fullName} (@{user.username}). Se
                                van a cerrar sus sesiones abiertas.
                            </Text>
                            <AppInput
                                placeholder={`Nueva contraseña (mín. ${MIN_PASSWORD_LENGTH})`}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    setError(null);
                                }}
                                secureTextEntry
                                autoCapitalize="none"
                                autoComplete="new-password"
                                maxLength={MAX_PASSWORD_LENGTH}
                                editable={!resetPassword.isPending}
                            />
                            <AppInput
                                placeholder="Repetir contraseña"
                                value={confirmation}
                                onChangeText={(text) => {
                                    setConfirmation(text);
                                    setError(null);
                                }}
                                secureTextEntry
                                autoCapitalize="none"
                                autoComplete="new-password"
                                maxLength={MAX_PASSWORD_LENGTH}
                                editable={!resetPassword.isPending}
                                onSubmitEditing={() => void handleSubmit()}
                            />
                            {error && <Text style={styles.error}>{error}</Text>}
                            <View style={styles.actions}>
                                <Pressable onPress={close} disabled={resetPassword.isPending} style={styles.cancel}>
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                </Pressable>
                                <AppButton
                                    title={resetPassword.isPending ? 'Guardando...' : 'Guardar'}
                                    onPress={() => void handleSubmit()}
                                    disabled={resetPassword.isPending}
                                    style={styles.save}
                                />
                            </View>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.lg,
        gap: Spacing.md,
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    text: {
        fontSize: 14,
        lineHeight: 20,
        color: Colors.textSecondary,
    },
    error: {
        color: Colors.error,
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: Spacing.md,
    },
    cancel: {
        padding: Spacing.sm,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    save: {
        flex: 1,
    },
});
