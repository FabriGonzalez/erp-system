import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { ModalCard } from '@/components/ui/ModalCard';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/components/users/UserForm';
import { Colors } from '@/constants/colors';
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

    const isPending = resetPassword.isPending;

    return (
        <ModalCard
            visible={visible}
            title="Cambiar contraseña"
            subtitle={`${user.fullName} (@${user.username})`}
            onClose={close}
            closeDisabled={isPending}
            error={isDone ? null : error}
            footer={isDone
                ? [<AppButton key="close" title="Cerrar" onPress={close} />]
                : [
                    <AppButton key="cancel" title="Cancelar" variant="secondary" onPress={close} disabled={isPending} />,
                    <AppButton
                        key="save"
                        title={isPending ? 'Guardando...' : 'Guardar'}
                        onPress={() => void handleSubmit()}
                        disabled={isPending}
                    />,
                ]}
        >
            {isDone ? (
                <Text style={styles.text}>
                    Listo. {user.fullName} ya tiene la contraseña nueva y se cerraron sus sesiones abiertas.
                </Text>
            ) : (
                <>
                    <Text style={styles.text}>
                        Elegí la contraseña nueva. Se van a cerrar sus sesiones abiertas.
                    </Text>
                    <FormField label="Contraseña nueva" hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}>
                        <AppInput
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setError(null);
                            }}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            maxLength={MAX_PASSWORD_LENGTH}
                            editable={!isPending}
                        />
                    </FormField>
                    <FormField label="Repetir contraseña">
                        <AppInput
                            value={confirmation}
                            onChangeText={(text) => {
                                setConfirmation(text);
                                setError(null);
                            }}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            maxLength={MAX_PASSWORD_LENGTH}
                            editable={!isPending}
                            onSubmitEditing={() => void handleSubmit()}
                        />
                    </FormField>
                </>
            )}
        </ModalCard>
    );
}

const styles = StyleSheet.create({
    text: {
        fontSize: 14,
        lineHeight: 20,
        color: Colors.textSecondary,
    },
});
