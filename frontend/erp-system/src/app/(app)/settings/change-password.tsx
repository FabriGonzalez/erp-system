import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { changePassword } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';

// Mismas reglas que valida el backend (ChangePasswordRequest).
const MIN_LENGTH = 8;
const MAX_LENGTH = 72;

function validate(current: string, next: string, confirmation: string): string | null {
    if (!current || !next || !confirmation) {
        return 'Completá los tres campos.';
    }
    if (next.length < MIN_LENGTH || next.length > MAX_LENGTH) {
        return `La nueva contraseña debe tener entre ${MIN_LENGTH} y ${MAX_LENGTH} caracteres.`;
    }
    if (!/\p{L}/u.test(next) || !/\d/.test(next)) {
        return 'La nueva contraseña debe incluir al menos una letra y un número.';
    }
    if (next !== confirmation) {
        return 'La confirmación no coincide con la nueva contraseña.';
    }
    if (next === current) {
        return 'La nueva contraseña debe ser distinta de la actual.';
    }
    return null;
}

export default function ChangePasswordScreen() {
    const token = useAuthStore((state) => state.token);
    const replaceToken = useAuthStore((state) => state.replaceToken);
    const canChangePassword = useAuthStore((state) => state.user?.canChangePassword !== false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);

    function clearError() {
        setErrorMsg(null);
    }

    async function handleSubmit() {
        if (isSubmitting || !token) {
            return;
        }

        const validationError = validate(currentPassword, newPassword, confirmPassword);
        if (validationError) {
            setErrorMsg(validationError);
            return;
        }

        setErrorMsg(null);
        setIsSubmitting(true);

        try {
            const response = await changePassword(
                { currentPassword, newPassword, confirmPassword },
                token
            );
            await replaceToken(token, response.token);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsDone(true);
        } catch (error: unknown) {
            // Los servicios ya devuelven el mensaje en español, también sin conexión.
            setErrorMsg(error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Screen style={styles.container}>
            <PageHeader onBack={() => router.back()} eyebrow="Mi perfil" title="Cambiar contraseña" />

            <ScrollView contentContainerStyle={SharedStyles.pageContent} keyboardShouldPersistTaps="handled">
                {!canChangePassword ? (
                    <View style={styles.form}>
                        <Text style={styles.description}>
                            La contraseña de tu cuenta la administra la empresa. Si necesitás
                            cambiarla, pedíselo a un administrador.
                        </Text>
                        <AppButton title="Volver" onPress={() => router.back()} />
                    </View>
                ) : isDone ? (
                    <View style={styles.form}>
                        <View style={styles.successContainer}>
                            <Text style={styles.successText}>
                                Contraseña actualizada. Las sesiones abiertas en otros
                                dispositivos se cerraron.
                            </Text>
                        </View>
                        <AppButton title="Volver" onPress={() => router.back()} />
                    </View>
                ) : (
                    <View style={styles.form}>
                        <Text style={styles.description}>
                            Usá al menos {MIN_LENGTH} caracteres, con letras y números. Al
                            cambiarla se cierran tus sesiones en otros dispositivos.
                        </Text>

                        <FormSection title="Contraseña">
                            <FormField label="Actual">
                                <AppInput
                                    placeholder="Contraseña actual"
                                    value={currentPassword}
                                    onChangeText={(text) => {
                                        setCurrentPassword(text);
                                        clearError();
                                    }}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="current-password"
                                    editable={!isSubmitting}
                                />
                            </FormField>
                            <FormField label="Nueva">
                                <AppInput
                                    placeholder="Nueva contraseña"
                                    value={newPassword}
                                    onChangeText={(text) => {
                                        setNewPassword(text);
                                        clearError();
                                    }}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="new-password"
                                    maxLength={MAX_LENGTH}
                                    editable={!isSubmitting}
                                />
                                <AppInput
                                    placeholder="Repetir nueva contraseña"
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        clearError();
                                    }}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="new-password"
                                    maxLength={MAX_LENGTH}
                                    editable={!isSubmitting}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit}
                                />
                            </FormField>
                        </FormSection>

                        {errorMsg && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        )}

                        {isSubmitting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={Colors.primary} />
                                <Text style={styles.loadingText}>Guardando...</Text>
                            </View>
                        ) : (
                            <AppButton title="Cambiar contraseña" onPress={handleSubmit} />
                        )}
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    form: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        gap: Spacing.md,
    },
    description: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    errorContainer: {
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
        borderRadius: Radius.sm,
        padding: Spacing.md,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
        lineHeight: 18,
    },
    successContainer: {
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: Radius.sm,
        padding: Spacing.md,
    },
    successText: {
        color: Colors.primary,
        fontSize: 14,
        lineHeight: 20,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        gap: Spacing.sm,
    },
    loadingText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    pressed: {
        opacity: 0.8,
    },
});
