import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FilterChip } from '@/components/ui/FilterChip';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { UserFormValues } from '@/hooks/use-user-queries';
import { SharedStyles } from '@/styles/shared';
import { Role } from '@/types/role';

// Mismos límites que valida el backend (UserRequest).
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserFormProps = {
    mode: 'create' | 'edit';
    initialValues?: UserFormValues;
    /** Roles activos: el backend no deja asignar uno desactivado. */
    roles: Role[];
    /** El propio usuario no puede cambiarse el rol. */
    roleLocked?: boolean;
    isSubmitting: boolean;
    submitError: string | null;
    onSubmit: (values: UserFormValues & { password: string }) => void;
};

const EMPTY: UserFormValues = { username: '', email: '', firstName: '', lastName: '', roleId: '' };

export function UserForm({
    mode,
    initialValues = EMPTY,
    roles,
    roleLocked = false,
    isSubmitting,
    submitError,
    onSubmit,
}: UserFormProps) {
    const isCreate = mode === 'create';
    const [values, setValues] = useState<UserFormValues>(initialValues);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    function update(field: keyof UserFormValues, value: string) {
        setValues((current) => ({ ...current, [field]: value }));
        setValidationError(null);
    }

    function validate(): string | null {
        if (!values.firstName.trim() || !values.lastName.trim()) return 'Completá nombre y apellido.';
        if (!values.username.trim()) return 'Completá el nombre de usuario.';
        if (/\s/.test(values.username.trim())) return 'El nombre de usuario no puede tener espacios.';
        if (!EMAIL_PATTERN.test(values.email.trim())) return 'Ingresá un email válido.';
        if (!values.roleId) return 'Elegí un rol.';
        if (isCreate) {
            if (password.length < MIN_PASSWORD_LENGTH) {
                return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
            }
            if (password !== confirmation) return 'La confirmación no coincide con la contraseña.';
        }
        return null;
    }

    function handleSubmit() {
        if (isSubmitting) return;
        const error = validate();
        if (error) {
            setValidationError(error);
            return;
        }
        onSubmit({
            username: values.username.trim(),
            email: values.email.trim(),
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            roleId: values.roleId,
            password,
        });
    }

    const errorMessage = validationError ?? submitError;

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>{isCreate ? 'Nuevo usuario' : 'Editar usuario'}</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.row}>
                    <Field label="Nombre" style={styles.flex1}>
                        <AppInput
                            placeholder="Ej. María"
                            value={values.firstName}
                            onChangeText={(text) => update('firstName', text)}
                            autoCapitalize="words"
                            maxLength={100}
                            editable={!isSubmitting}
                        />
                    </Field>
                    <Field label="Apellido" style={styles.flex1}>
                        <AppInput
                            placeholder="Ej. González"
                            value={values.lastName}
                            onChangeText={(text) => update('lastName', text)}
                            autoCapitalize="words"
                            maxLength={100}
                            editable={!isSubmitting}
                        />
                    </Field>
                </View>

                <Field label="Usuario" hint="Con este nombre inicia sesión.">
                    <AppInput
                        placeholder="Ej. mgonzalez"
                        value={values.username}
                        onChangeText={(text) => update('username', text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={50}
                        editable={!isSubmitting}
                    />
                </Field>

                <Field label="Email">
                    <AppInput
                        placeholder="Ej. maria@empresa.com"
                        value={values.email}
                        onChangeText={(text) => update('email', text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        maxLength={100}
                        editable={!isSubmitting}
                    />
                </Field>

                {isCreate && (
                    <Field
                        label="Contraseña"
                        hint="El usuario no va a poder cambiarla: si la olvida, la cambiás vos desde su ficha."
                    >
                        <AppInput
                            placeholder={`Al menos ${MIN_PASSWORD_LENGTH} caracteres`}
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setValidationError(null);
                            }}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            maxLength={MAX_PASSWORD_LENGTH}
                            editable={!isSubmitting}
                        />
                        <AppInput
                            placeholder="Repetir contraseña"
                            value={confirmation}
                            onChangeText={(text) => {
                                setConfirmation(text);
                                setValidationError(null);
                            }}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            maxLength={MAX_PASSWORD_LENGTH}
                            editable={!isSubmitting}
                        />
                    </Field>
                )}

                <Field
                    label="Rol"
                    hint={roleLocked ? 'No podés cambiar tu propio rol.' : 'Define qué puede hacer en la app.'}
                >
                    {roles.length === 0 ? (
                        <Text style={styles.hint}>No hay roles activos. Creá uno desde Roles.</Text>
                    ) : (
                        <View style={styles.chips}>
                            {roles.map((role) => (
                                <FilterChip
                                    key={role.id}
                                    label={role.name}
                                    selected={values.roleId === role.id}
                                    onPress={() => {
                                        if (!roleLocked && !isSubmitting) update('roleId', role.id);
                                    }}
                                />
                            ))}
                        </View>
                    )}
                </Field>

                {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            </ScrollView>

            <View style={styles.footer}>
                <AppButton
                    title={isSubmitting ? 'Guardando...' : isCreate ? 'Crear usuario' : 'Guardar cambios'}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                />
            </View>
        </Screen>
    );
}

function Field({
    label,
    hint,
    style,
    children,
}: {
    label: string;
    hint?: string;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
}) {
    return (
        <View style={[styles.field, style]}>
            <Text style={SharedStyles.sectionTitle}>{label}</Text>
            {children}
            {hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.lg,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    flex1: {
        flex: 1,
    },
    field: {
        gap: Spacing.sm,
    },
    hint: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    errorText: {
        color: Colors.error,
        fontSize: 14,
    },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
});
